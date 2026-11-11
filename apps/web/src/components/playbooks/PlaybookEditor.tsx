'use client';

/**
 * PlaybookEditor
 * ==============
 * Full-page playbook editor. Shows:
 *  - Left: metadata panel (name, description, trigger)
 *  - Centre: React Flow canvas or live YAML / JSON Code View
 *  - Right: step inspector (when step selected)
 *  - Top toolbar: view mode (Visual Builder | YAML | JSON), undo/redo, add step, dry-run, save
 *
 * WS-F4 polish: every mutation that flows through `setPlaybook` is now
 * captured in a `useHistoryState` undo/redo stack. Remote loads sync via
 * `controls.replace(...)` so they don't pollute history. Cmd/Ctrl-Z and
 * Cmd/Ctrl-Shift-Z (or Ctrl-Y on Windows-style keyboards) trigger undo/redo
 * globally while the editor is mounted, except when focus is in a text
 * input — that lets the browser's native input undo keep working.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { PlaybookFlowCanvas } from './PlaybookFlowCanvas';
import { StepInspector } from './StepInspector';
import type { Playbook, PlaybookStep, StepType } from './types';
import { STEP_TYPE_META } from './stepColors';
import { AUTHORABLE_STEP_TYPES, defaultParamsFor } from './stepSchemas';
import { ContextualActions } from '@/components/copilot/ContextualActions';
import { useHistoryState } from '@/hooks/useHistoryState';
import { apiFetch, authedFetcher } from '@/lib/api';
import { DialogBehavior } from '@/components/ui/Dialog';

/**
 * What the palette offers. Derived from the registry, and filtered on
 * whether the engine can run the type rather than on its name — a step the
 * engine fails closed is not something to hand somebody a button for.
 */
const STEP_TYPES: readonly StepType[] = AUTHORABLE_STEP_TYPES;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeNewStep(type: StepType): PlaybookStep {
  return {
    id: generateId(),
    name: `New ${STEP_TYPE_META[type].label} step`,
    type,
    // Honour each step kind's default param shape so the new step is
    // immediately valid for the schema-driven inspector form.
    params: defaultParamsFor(type),
    on_failure: 'abort',
    retry_max: 0,
    timeout_seconds: 30,
  };
}

/** Serialize a Playbook into clean, human-readable YAML for the in-UI Code View. */
function serializePlaybookYaml(pb: Playbook): string {
  const esc = (s: string) => JSON.stringify(s ?? '');
  const lines: string[] = [
    `id: ${esc(pb.id || 'draft')}`,
    `name: ${esc(pb.name)}`,
    `description: ${esc(pb.description)}`,
    `version: ${esc(pb.version)}`,
    `enabled: ${pb.enabled}`,
    `trigger:`,
    `  on: ${pb.trigger?.on ?? 'manual'}`,
  ];
  if (pb.trigger?.on === 'schedule' && pb.trigger.cron) {
    lines.push(`  cron: ${esc(pb.trigger.cron)}`);
  }
  if (pb.trigger?.severity && pb.trigger.severity.length > 0) {
    lines.push(`  severity: [${pb.trigger.severity.map(esc).join(', ')}]`);
  }
  if (pb.tags && pb.tags.length > 0) {
    lines.push(`tags: [${pb.tags.map(esc).join(', ')}]`);
  }
  if (pb.steps.length === 0) {
    lines.push('steps: []');
  } else {
    lines.push('steps:');
    for (const step of pb.steps) {
      lines.push(`  - id: ${esc(step.id)}`);
      lines.push(`    name: ${esc(step.name)}`);
      lines.push(`    type: ${step.type}`);
      lines.push(`    on_failure: ${step.on_failure}`);
      lines.push(`    retry_max: ${step.retry_max}`);
      lines.push(`    timeout_seconds: ${step.timeout_seconds}`);
      if (step.condition?.field) {
        lines.push(`    condition:`);
        lines.push(`      field: ${esc(step.condition.field)}`);
        lines.push(`      operator: ${step.condition.operator}`);
        if (step.condition.value !== undefined) {
          lines.push(`      value: ${JSON.stringify(step.condition.value)}`);
        }
      }
      if (step.next_true) lines.push(`    next_true: ${esc(step.next_true)}`);
      if (step.next_false) lines.push(`    next_false: ${esc(step.next_false)}`);
      const paramEntries = Object.entries(step.params ?? {});
      if (paramEntries.length === 0) {
        lines.push('    params: {}');
      } else {
        lines.push('    params:');
        for (const [k, v] of paramEntries) {
          lines.push(`      ${k}: ${JSON.stringify(v)}`);
        }
      }
    }
  }
  return lines.join('\n');
}

/* ───────────────────────────── Trigger editor ───────────────────────────── */

function TriggerBadge({
  on,
  severity,
}: {
  on: string;
  severity?: string[];
}) {
  const colorMap: Record<string, string> = {
    alert: 'bg-red-500/15 text-red-400 border-red-500/30',
    case: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
    manual: 'bg-surface-elevated text-fg-secondary border-surface-border-strong',
    schedule: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border ${colorMap[on] ?? 'bg-surface-elevated text-fg-secondary border-surface-border-strong'}`}
    >
      <span className="font-medium">on:{on}</span>
      {severity && severity.length > 0 && (
        <span className="opacity-70">[{severity.join(', ')}]</span>
      )}
    </div>
  );
}

/* ─────────────────────────────── Main ─────────────────────────────── */

interface PlaybookEditorProps {
  playbookId: string;
}

const EMPTY_PLAYBOOK: Playbook = {
  id: '',
  name: 'Untitled Runbook',
  description: '',
  version: '1.0.0',
  tags: [],
  trigger: { on: 'manual' },
  steps: [],
  author: 'you',
  enabled: true,
  created_at: '',
  updated_at: '',
};

export function PlaybookEditor({ playbookId }: PlaybookEditorProps) {
  const router = useRouter();
  const isNew = playbookId === 'new';

  const { data: remote, isLoading } = useSWR<Playbook>(
    !isNew ? `/api/v1/playbooks/${playbookId}` : null,
    authedFetcher,
  );

  const [playbook, history] = useHistoryState<Playbook>(EMPTY_PLAYBOOK);
  const setPlaybook = history.set;

  // Sync remote data once loaded — use replace() so the load doesn't push
  // an extra entry onto the history stack.
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (remote && !synced) {
      history.reset(remote);
      setSynced(true);
    }
  }, [remote, synced, history]);

  // T3.7 — NL drafter seed. When the new-playbook route is entered via
  // the "Draft from prompt" flow, the drafted Playbook is parked in
  // sessionStorage under "aisoc:nl-draft" by /playbooks/new. Pick it up
  // ONCE, hydrate the editor, then immediately wipe the key so reload
  // doesn't re-seed the same draft. Use history.reset() so the seed
  // doesn't push an empty playbook onto the undo stack.
  useEffect(() => {
    if (!isNew || synced) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('aisoc:nl-draft');
      if (!raw) return;
      sessionStorage.removeItem('aisoc:nl-draft');
      const draft = JSON.parse(raw) as Playbook;
      if (draft && typeof draft === 'object' && Array.isArray(draft.steps)) {
        history.reset(draft);
        setSynced(true);
      }
    } catch {
      // Malformed sessionStorage payload — fall back to the empty playbook.
    }
  }, [isNew, synced, history]);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editMeta, setEditMeta] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'yaml' | 'json'>('visual');
  const [copiedCode, setCopiedCode] = useState(false);

  const selectedStep = useMemo(
    () => playbook.steps.find((s) => s.id === selectedStepId) ?? null,
    [playbook.steps, selectedStepId],
  );

  const yamlText = useMemo(() => serializePlaybookYaml(playbook), [playbook]);
  const jsonText = useMemo(() => JSON.stringify(playbook, null, 2), [playbook]);

  /* ── Callbacks ── */

  const updateStep = useCallback(
    (updated: PlaybookStep) => {
      setPlaybook((pb) => ({
        ...pb,
        steps: pb.steps.map((s) => (s.id === updated.id ? updated : s)),
      }));
    },
    [setPlaybook],
  );

  const deleteStep = useCallback(
    (id: string) => {
      setPlaybook((pb) => ({
        ...pb,
        steps: pb.steps.filter((s) => s.id !== id),
      }));
      setSelectedStepId(null);
    },
    [setPlaybook],
  );

  const addStep = useCallback(
    (type: StepType) => {
      const step = makeNewStep(type);
      setPlaybook((pb) => ({ ...pb, steps: [...pb.steps, step] }));
      setSelectedStepId(step.id);
      setShowAddStep(false);
    },
    [setPlaybook],
  );

  const handleStepsChange = useCallback(
    (steps: PlaybookStep[]) => {
      setPlaybook((p) => ({ ...p, steps }));
    },
    [setPlaybook],
  );

  /* ── Undo / redo keyboard shortcuts ── */

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        // Don't swallow native input undo while the user is typing.
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      // Cmd/Ctrl + Z = undo (no Shift)
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
        return;
      }
      // Cmd/Ctrl + Shift + Z = redo, or Cmd/Ctrl + Y = redo
      if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        history.redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history]);

  const handleSave = async () => {
    setSaving(true);
    setRunResult(null);
    try {
      const url = isNew
        ? '/api/v1/playbooks'
        : `/api/v1/playbooks/${playbook.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const body = isNew
        ? { ...playbook, author: playbook.author === 'AiSOC' ? 'you' : playbook.author }
        : { ...playbook };
      let res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      let createdFromPack = false;
      // Shipped packs are read-only templates in the store (PUT returns 404).
      // Automatically persist a tenant-owned editable runbook copy on Save!
      if (!isNew && res.status === 404) {
        createdFromPack = true;
        res = await apiFetch('/api/v1/playbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...playbook,
            id: '',
            author: 'you',
          }),
        });
      }
      if (!res.ok) throw new Error(await res.text());
      const saved: Playbook = await res.json();
      // Save reset: post-save state is the new "clean" baseline, so wipe
      // any historical drafts that no longer match the persisted record.
      history.reset(saved);
      setSynced(true);
      await mutate('/api/v1/playbooks');
      if (isNew || createdFromPack) router.replace(`/playbooks/${saved.id}`);
      setRunResult(createdFromPack ? 'Saved as custom runbook' : 'Saved runbook');
    } catch (err) {
      setRunResult(
        `Save failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!playbook.id) {
      setRunResult('Save the runbook first');
      return;
    }
    setRunning(true);
    setRunResult(null);
    try {
      const res = await apiFetch(`/api/v1/playbooks/${playbook.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: {}, dry_run: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRunResult(`Dry run started — run_id: ${data.run_id}`);
    } catch (err) {
      setRunResult(
        `Run failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setRunning(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-fg-muted">Loading runbook…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-base text-fg-primary">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-5 h-14 border-b border-surface-border bg-surface-card flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="text-fg-muted hover:text-fg-primary transition-colors text-xs font-medium"
        >
          ← Back
        </button>

        <div className="flex-1 flex items-center gap-3 overflow-hidden">
          {editMeta ? (
            <input
              autoFocus
              value={playbook.name}
              onChange={(e) =>
                setPlaybook((p) => ({ ...p, name: e.target.value }))
              }
              onBlur={() => setEditMeta(false)}
              className="bg-transparent border-b border-brand-500 text-fg-primary text-lg font-semibold focus:outline-none w-64"
            />
          ) : (
            <button
              onClick={() => setEditMeta(true)}
              className="text-fg-primary text-lg font-semibold truncate hover:text-brand-400 transition-colors"
              title="Click to rename"
            >
              {playbook.name}
            </button>
          )}
          <TriggerBadge
            on={playbook.trigger.on}
            severity={playbook.trigger.severity}
          />
          <span className="text-xs text-fg-muted">v{playbook.version}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${playbook.enabled ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-surface-border-strong text-fg-muted'}`}
          >
            {playbook.enabled ? 'enabled' : 'disabled'}
          </span>
        </div>

        {/* View Mode Switcher: Visual Builder vs YAML vs JSON */}
        <div
          className="inline-flex items-center rounded-lg border border-surface-border bg-surface-sunken p-0.5"
          role="group"
          aria-label="Editor view mode"
        >
          {(
            [
              { id: 'visual', label: 'Visual Builder' },
              { id: 'yaml', label: 'YAML' },
              { id: 'json', label: 'JSON' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setEditorMode(mode.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                editorMode === mode.id
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'text-fg-secondary hover:text-fg-primary'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / redo buttons */}
          <button
            onClick={() => history.undo()}
            disabled={!history.canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
            className="text-xs px-2.5 py-1.5 rounded border border-surface-border-strong text-fg-secondary hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↶
          </button>
          <button
            onClick={() => history.redo()}
            disabled={!history.canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
            className="text-xs px-2.5 py-1.5 rounded border border-surface-border-strong text-fg-secondary hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↷
          </button>
          <div className="h-5 w-px bg-surface-border" />
          <button
            onClick={() => setShowAddStep(true)}
            className="text-xs px-3 py-1.5 rounded border border-brand-500/40 text-brand-400 hover:bg-brand-500/15 transition-colors font-medium"
          >
            + Add Step
          </button>
          <button
            onClick={handleRun}
            disabled={running || isNew}
            className="text-xs px-3 py-1.5 rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-40 font-medium"
            title={isNew ? 'Save first' : 'Dry run'}
          >
            {running ? 'Running…' : 'Dry run'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-4 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Result banner ── */}
      {runResult && (
        <div className="px-5 py-2 bg-surface-card text-sm border-b border-surface-border flex items-center justify-between">
          <span className="text-fg-secondary">{runResult}</span>
          <button
            onClick={() => setRunResult(null)}
            className="text-fg-muted hover:text-fg-primary text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/*
        Ambient Copilot — playbook-scoped contextual AI. Only rendered for saved
        playbooks (`!isNew && playbook.id`); brand-new drafts have no real
        steps to reason about yet. We pass a compact snapshot of the live form
        state (not just the persisted record) so "explain this playbook" /
        "suggest improvements" reflect the user's in-flight edits. Backed by
        `services/agents` `/api/v1/contextual` endpoints.
      */}
      {!isNew && playbook.id ? (
        <div className="px-5 py-3 border-b border-surface-border bg-surface-sunken/50">
          <ContextualActions
            page="playbooks"
            entityId={playbook.id}
            entity={{
              id: playbook.id,
              name: playbook.name,
              description: playbook.description,
              version: playbook.version,
              tags: playbook.tags,
              trigger: playbook.trigger,
              enabled: playbook.enabled,
              step_count: playbook.steps.length,
              steps: playbook.steps.map((s) => ({
                id: s.id,
                type: s.type,
                name: s.name,
              })),
            }}
            eyebrow="Ask AiSOC about this runbook"
          />
        </div>
      ) : null}

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left meta panel */}
        <div className="w-60 flex-shrink-0 border-r border-surface-border bg-surface-card p-4 overflow-y-auto space-y-4 text-sm">
          <div>
            <div className="text-fg-muted text-xs font-medium uppercase tracking-wider mb-2">
              Metadata
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-fg-muted text-xs block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={playbook.description}
                  onChange={(e) =>
                    setPlaybook((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full bg-surface-sunken border border-surface-border-strong rounded px-2 py-1 text-xs text-fg-primary focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div>
                <label className="text-fg-muted text-xs block mb-1">
                  Trigger
                </label>
                <select
                  value={playbook.trigger.on}
                  onChange={(e) =>
                    setPlaybook((p) => ({
                      ...p,
                      trigger: {
                        ...p.trigger,
                        on: e.target.value as
                          | 'alert'
                          | 'case'
                          | 'manual'
                          | 'schedule',
                      },
                    }))
                  }
                  className="w-full bg-surface-sunken border border-surface-border-strong rounded px-2 py-1 text-xs text-fg-primary focus:outline-none focus:border-brand-500"
                >
                  <option value="manual">Manual</option>
                  <option value="alert">Alert</option>
                  <option value="case">Case</option>
                  <option value="schedule">Schedule</option>
                </select>
              </div>
              <div>
                <label className="text-fg-muted text-xs block mb-1">
                  Tags (comma sep)
                </label>
                <input
                  value={playbook.tags.join(', ')}
                  onChange={(e) =>
                    setPlaybook((p) => ({
                      ...p,
                      tags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="w-full bg-surface-sunken border border-surface-border-strong rounded px-2 py-1 text-xs text-fg-primary focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-fg-muted text-xs">Enabled</label>
                <input
                  type="checkbox"
                  checked={playbook.enabled}
                  onChange={(e) =>
                    setPlaybook((p) => ({ ...p, enabled: e.target.checked }))
                  }
                  className="accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Steps list */}
          <div>
            <div className="text-fg-muted text-xs font-medium uppercase tracking-wider mb-2">
              Steps ({playbook.steps.length})
            </div>
            <div className="space-y-1">
              {playbook.steps.map((step, idx) => {
                const m = STEP_TYPE_META[step.type];
                return (
                  <button
                    key={step.id}
                    onClick={() =>
                      setSelectedStepId(
                        step.id === selectedStepId ? null : step.id,
                      )
                    }
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                      step.id === selectedStepId
                        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                        : 'text-fg-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-fg-muted w-4 text-right flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <span>{m.icon}</span>
                    <span className="truncate">{step.name}</span>
                  </button>
                );
              })}
              {playbook.steps.length === 0 && (
                <div className="text-fg-muted text-xs italic">No steps yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas or Live Code View */}
        <div className="flex-1 min-w-0 relative bg-surface-base">
          {editorMode !== 'visual' ? (
            <div className="flex flex-col h-full bg-surface-sunken">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border bg-surface-card">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-secondary">
                    {editorMode === 'yaml' ? 'Runbook YAML Specification' : 'Runbook JSON Specification'}
                  </span>
                  <span className="text-[11px] font-mono text-fg-muted">
                    ({playbook.steps.length} step{playbook.steps.length === 1 ? '' : 's'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = editorMode === 'yaml' ? yamlText : jsonText;
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      void navigator.clipboard.writeText(text);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 1800);
                    }
                  }}
                  className="px-2.5 py-1 rounded-md border border-surface-border-strong bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-fg-primary transition-colors"
                >
                  {copiedCode ? 'Copied!' : `Copy ${editorMode.toUpperCase()}`}
                </button>
              </div>
              <pre
                data-testid={`playbook-${editorMode}-preview`}
                className="flex-1 overflow-auto p-5 font-mono text-xs leading-relaxed text-fg-primary select-all"
              >
                {editorMode === 'yaml' ? yamlText : jsonText}
              </pre>
            </div>
          ) : playbook.steps.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-fg-muted">
              <div className="text-lg font-medium text-fg-secondary">
                Empty runbook
              </div>
              <div className="text-sm mt-1 mb-6">
                Add your first step to get started
              </div>
              <button
                onClick={() => setShowAddStep(true)}
                className="px-4 py-2 rounded bg-brand-600 hover:bg-brand-500 text-white text-sm transition-colors"
              >
                + Add Step
              </button>
            </div>
          ) : (
            <PlaybookFlowCanvas
              steps={playbook.steps}
              selectedId={selectedStepId}
              onSelectStep={setSelectedStepId}
              onStepsChange={handleStepsChange}
            />
          )}
        </div>

        {/* Right: inspector */}
        {selectedStep && (
          <div className="w-72 flex-shrink-0 border-l border-surface-border bg-surface-card">
            <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
              <span className="text-xs font-semibold text-fg-secondary uppercase tracking-wider">
                Step Inspector
              </span>
              <button
                onClick={() => setSelectedStepId(null)}
                className="text-fg-muted hover:text-fg-primary text-sm"
              >
                ✕
              </button>
            </div>
            <StepInspector
              step={selectedStep}
              onUpdate={updateStep}
              onDelete={deleteStep}
            />
          </div>
        )}
      </div>

      {/* ── Add Step Modal ── */}
      {showAddStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddStep(false)}
        >
            <DialogBehavior onClose={() => setShowAddStep(false)} /> {/* [P6 overlay-dialog] role=dialog, focus trap, Escape */}
          <div
            className="bg-surface-card border border-surface-border-strong rounded-xl p-5 w-80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-fg-primary mb-4">
              Choose Step Type
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STEP_TYPES.map((type) => {
                const m = STEP_TYPE_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => addStep(type)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border border-surface-border-strong hover:border-brand-500/40 bg-surface-elevated hover:bg-surface-hover transition-colors"
                  >
                    <span style={{ color: m.color, fontSize: 20 }}>
                      {m.icon}
                    </span>
                    <span className="text-xs text-fg-secondary text-center leading-tight">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAddStep(false)}
              className="mt-4 w-full text-xs text-fg-muted hover:text-fg-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
