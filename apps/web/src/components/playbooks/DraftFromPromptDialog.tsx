'use client';

/**
 * DraftFromPromptDialog
 * =====================
 * T3.7 — Modal dialog that takes a natural-language description of an
 * incident response workflow, calls `POST /api/v1/playbooks/draft-from-nl`,
 * parks the returned playbook draft in `sessionStorage["aisoc:nl-draft"]`,
 * and navigates to `/playbooks/new?nl=true` where `PlaybookEditor` hydrates
 * from it.
 *
 * The dialog intentionally never saves the draft to the database — the
 * operator reviews the generated DAG on the canvas first and hits Save
 * when they are happy with it. Every generated playbook also starts with
 * `enabled: false` on the backend as a belt-and-suspenders guard.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Playbook } from './types';
import { apiFetch } from '@/lib/api';
import { AiSpinner } from '@/components/ui/AiSpinner';

/** Storage key shared with `PlaybookEditor` when hydrating an NL draft. */
export const NL_DRAFT_STORAGE_KEY = 'aisoc:nl-draft';

interface DraftFromPromptResponse {
  playbook: Playbook;
  rationale: string;
  used_llm: boolean;
  schema_validated: boolean;
}

const EXAMPLE_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: 'High-sev exfil → isolate + ticket',
    prompt:
      'When a high-severity exfil alert fires, enrich the source IP, isolate the affected host if the verdict is malicious, open a P1 Jira ticket, and page the on-call on Slack.',
  },
  {
    label: 'Impossible travel → disable user',
    prompt:
      'On an impossible-travel alert, enrich the user and source IP, require analyst approval, then disable the user account and notify #soc-identity.',
  },
  {
    label: 'Malware hash → quarantine + block',
    prompt:
      'When malware is detected on an endpoint, quarantine the file, block the C2 domain and IP at the firewall, and create an incident case.',
  },
  {
    label: 'Phishing triage',
    prompt:
      'Triggered on a phishing alert: enrich the sender domain, hunt for other recipients in the last 24h, and notify the SOC channel with a summary.',
  },
];

export interface DraftFromPromptDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DraftFromPromptDialog({ open, onClose }: DraftFromPromptDialogProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Describe what the playbook should do.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/playbooks/draft-from-nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed, allow_llm: true }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as DraftFromPromptResponse;
      try {
        sessionStorage.setItem(
          NL_DRAFT_STORAGE_KEY,
          JSON.stringify({
            ...data.playbook,
            _nlRationale: data.rationale,
            _nlUsedLlm: data.used_llm,
          }),
        );
      } catch {
        // sessionStorage may be disabled in strict privacy modes; the
        // editor will fall back to an empty playbook rather than crash.
      }
      onClose();
      router.push('/playbooks/new?nl=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft playbook.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-draft-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-surface-border bg-surface-card p-6 text-fg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/30">
              <AiSpinner size="sm" state={busy ? 'busy' : 'idle'} />
            </div>
            <div>
              <h2 id="nl-draft-title" className="text-lg font-semibold text-fg-primary">
                Draft a playbook from a prompt
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                Describe the trigger and response steps in plain English. You&rsquo;ll
                review and edit the generated DAG before saving — nothing runs
                automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="text-fg-muted hover:text-fg-primary text-sm disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nl-draft-prompt" className="block text-xs font-medium text-fg-secondary mb-1.5">
              What should this playbook do?
            </label>
            <textarea
              id="nl-draft-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
              rows={4}
              maxLength={4000}
              placeholder="e.g. When a high-severity exfil alert fires, enrich the source IP, isolate the host if malicious, open a P1 Jira ticket, and notify #soc-critical on Slack."
              className="w-full rounded-lg border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-fg-primary placeholder-fg-faint focus:border-brand-500 focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  void handleSubmit(e);
                }
              }}
            />
          </div>

          {/* Example prompt chips */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fg-faint mb-1.5">
              Try an example
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  disabled={busy}
                  onClick={() => setPrompt(ex.prompt)}
                  className="text-xs px-2.5 py-1 rounded-full border border-surface-border bg-surface-sunken text-fg-secondary hover:text-fg-primary hover:border-brand-500/40 transition-colors disabled:opacity-50"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-fg-faint">
              Tip: press &#8984;+Enter (or Ctrl+Enter) to generate.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg border border-surface-border text-xs text-fg-secondary hover:text-fg-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !prompt.trim()}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-xs font-semibold text-fg-primary transition-colors disabled:opacity-50"
              >
                <AiSpinner size="xs" state={busy ? 'busy' : 'idle'} monochrome={false} />
                <span>{busy ? 'Drafting…' : 'Draft playbook'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
