'use client';

/**
 * Rule packs, and the assignment that makes one take effect.
 *
 * Wave 2, Phase 9.5.
 *
 * `/api/v1/mssp/rule-packs` has shipped full CRUD plus `/assign` since the
 * MSSP console work, with no console binding at all. An operator managing
 * several customer tenants could curate detection content only through curl.
 *
 * Why assignment is on this panel rather than deferred
 * ----------------------------------------------------
 * A pack that is created and never assigned detects nothing. Shipping the
 * create half alone would have produced a page that looks complete, lets an
 * operator build a library, and changes no tenant's coverage — the same shape
 * as a control that exists and is never called. So the row carries its
 * assignment affordance, and the panel says plainly when a pack is assigned
 * nowhere.
 *
 * Honest states
 * -------------
 * - A failed read renders the failure, never an empty library. "No packs" and
 *   "we could not read your packs" are different facts, and only one of them
 *   means an operator should go and create something.
 * - A tenant that manages no child tenants cannot assign. That is said once,
 *   rather than offering a picker with nothing in it.
 */

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { msspApi, rulePacksApi, type ChildTenant, type RulePack } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

function inputClass() {
  return 'w-full rounded-lg border border-surface-border-strong bg-surface-base px-3 py-2 text-sm text-fg-primary placeholder-fg-muted focus:border-brand-500 focus:outline-none';
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function RulePacksPanel() {
  const [packs, setPacks] = useState<RulePack[]>([]);
  const [children, setChildren] = useState<ChildTenant[]>([]);
  const [childrenUnavailable, setChildrenUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPacks(await rulePacksApi.list());
      setLoadError(null);
    } catch (err) {
      setPacks([]);
      setLoadError(describeError(err, 'Could not load rule packs.'));
    } finally {
      setLoading(false);
    }

    // Separate failure: a caller who manages no tenants still has packs, and
    // a failed children read must not make the library look unreadable.
    try {
      setChildren(await msspApi.listChildren());
      setChildrenUnavailable(false);
    } catch {
      setChildren([]);
      setChildrenUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('Name the pack');
      return;
    }
    setBusy(true);
    try {
      await rulePacksApi.create({ name, category: draftCategory.trim() || null });
      setDraftName('');
      setDraftCategory('');
      await load();
      toast.success('Rule pack created. Assign it to a managed tenant to make it take effect.');
    } catch (err) {
      toast.error(describeError(err, 'Could not create the rule pack'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (pack: RulePack) => {
    setBusy(true);
    try {
      await rulePacksApi.remove(pack.id);
      await load();
      toast.success(`Deleted "${pack.name}".`);
    } catch (err) {
      // Never drop the row locally on failure: a pack shown as deleted while
      // it still applies to a customer tenant is the dangerous direction.
      toast.error(describeError(err, 'Could not delete the rule pack'));
    } finally {
      setBusy(false);
    }
  };

  const assign = async (pack: RulePack) => {
    const childId = assignTarget[pack.id];
    if (!childId) {
      toast.error('Choose the managed tenant to assign this pack to');
      return;
    }
    setBusy(true);
    try {
      await rulePacksApi.assign(pack.id, { child_tenant_id: childId, enabled: true });
      const child = children.find((c) => c.id === childId);
      toast.success(`Assigned "${pack.name}" to ${child?.name ?? 'the tenant'}.`);
    } catch (err) {
      toast.error(describeError(err, 'Could not assign the rule pack'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="rule-packs-panel">
      <div className="border-b border-surface-border px-6 py-4">
        <h2 className="text-base font-semibold text-fg-primary">Rule packs</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Curated detection content you own and push to the tenants you manage.
          A pack takes effect when it is assigned.
        </p>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-surface-sunken/50 p-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-fg-secondary">Name</span>
            <input
              className={inputClass()}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Retail baseline"
              aria-label="Rule pack name"
            />
          </label>
          <label className="text-sm sm:w-56">
            <span className="mb-1 block text-fg-secondary">Category</span>
            <input
              className={inputClass()}
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              placeholder="Optional"
              aria-label="Rule pack category"
            />
          </label>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Create pack'}
          </button>
        </div>

        {childrenUnavailable ? (
          <p data-testid="rule-packs-children-unavailable" className="text-xs text-amber-300/80">
            Could not read the tenants you manage, so assignment is unavailable
            on this page load. The packs below are unaffected.
          </p>
        ) : children.length === 0 ? (
          <p className="text-xs text-fg-muted">
            You manage no child tenants, so there is nothing to assign a pack
            to yet.
          </p>
        ) : null}

        {loadError ? (
          <EmptyState title="Could not load rule packs" description={loadError} />
        ) : loading ? (
          <EmptyState title="Loading rule packs…" description="" />
        ) : packs.length === 0 ? (
          <EmptyState
            title="No rule packs yet"
            description="Create one above to group detection content you want to push to the tenants you manage."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-card text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Assign to</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface-sunken/50">
                {packs.map((pack) => (
                  <tr key={pack.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-fg-primary">{pack.name}</span>
                      {pack.is_default ? (
                        <span className="ml-2 rounded bg-brand-500/10 px-1.5 py-0.5 text-xs text-brand-300 ring-1 ring-blue-500/30">
                          Default
                        </span>
                      ) : null}
                      {pack.description ? (
                        <span className="mt-0.5 block text-xs text-fg-muted">{pack.description}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-secondary">{pack.category ?? 'Uncategorised'}</td>
                    <td className="px-4 py-3 text-xs text-fg-secondary" suppressHydrationWarning>
                      {format(new Date(pack.created_at), 'PPP')}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="rounded border border-surface-border-strong bg-surface-base px-2 py-1 text-xs text-fg-primary disabled:opacity-40"
                        value={assignTarget[pack.id] ?? ''}
                        disabled={children.length === 0 || busy}
                        aria-label={`Assign ${pack.name} to tenant`}
                        onChange={(e) => setAssignTarget((t) => ({ ...t, [pack.id]: e.target.value }))}
                      >
                        <option value="">Choose a tenant…</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void assign(pack)}
                          disabled={busy || children.length === 0}
                          className="rounded border border-surface-border-strong bg-surface-card px-2 py-1 text-xs text-fg-primary hover:bg-surface-elevated disabled:opacity-40"
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(pack)}
                          disabled={busy}
                          className="rounded border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-300 hover:bg-red-950/70 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
