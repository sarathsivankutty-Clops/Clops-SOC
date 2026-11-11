'use client';

/**
 * SCIM credentials, minted from the console.
 *
 * `apps/docs/docs/operations/scim.md` told administrators to "mint one from
 * the console, or through the API". The CRUD backend at
 * `/api/v1/scim-tokens` shipped with the SCIM surface; the console had no
 * binding to it at all, so the sentence described a surface that did not
 * exist and the only working route was the curl command beneath it.
 *
 * Three properties this panel has to get right, because a provisioning
 * credential is a standing key into the tenant's identity:
 *
 * - the raw secret is returned exactly once and is never recoverable, so
 *   it is shown once, here, with the fact stated rather than implied;
 * - rotation is a *create*, not an edit: both secrets work for the grace
 *   window so a sync never fails in between, and the superseded one
 *   expires by itself;
 * - a load failure renders an error, never a plausible list. A fabricated
 *   row invites an administrator to trust or revoke a credential that does
 *   not exist, and `last_used_at` is the field they would read to decide.
 */

import { useCallback, useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { scimTokensApi, type ScimTokenRecord } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

/** Offered rotation windows, in hours. */
const GRACE_CHOICES = [
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '72 hours' },
  { hours: 0, label: 'Immediately (after a disclosure)' },
];

function inputClass() {
  return 'w-full rounded-lg border border-surface-border-strong bg-surface-base px-3 py-2 text-sm text-fg-primary placeholder-fg-muted focus:border-brand-500 focus:outline-none';
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function ScimTokensPanel() {
  const [tokens, setTokens] = useState<ScimTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftExpiry, setDraftExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ token: string; name: string } | null>(null);
  const [graceHours, setGraceHours] = useState(24);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTokens(await scimTokensApi.list());
      setLoadError(null);
    } catch (err) {
      setTokens([]);
      setLoadError(describeError(err, 'Could not load SCIM credentials.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('Name the identity provider this credential is for');
      return;
    }
    const days = draftExpiry.trim() ? Number(draftExpiry) : null;
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) {
      toast.error('Expiry must be a whole number of days between 1 and 3650');
      return;
    }
    setBusy(true);
    try {
      const created = await scimTokensApi.create({ name, expires_in_days: days });
      setRevealed({ token: created.token, name: created.name });
      setDraftName('');
      setDraftExpiry('');
      await load();
      toast.success('SCIM credential created');
    } catch (err) {
      toast.error(describeError(err, 'Could not create the credential'));
    } finally {
      setBusy(false);
    }
  };

  const rotate = async (token: ScimTokenRecord) => {
    setBusy(true);
    try {
      const created = await scimTokensApi.rotate(token.id, graceHours);
      setRevealed({ token: created.token, name: created.name });
      await load();
      toast.success(
        graceHours === 0
          ? 'Rotated. The previous secret is revoked now, so the next sync fails until this one is in place.'
          : `Rotated. Both secrets work for ${graceHours} hours.`,
      );
    } catch (err) {
      toast.error(describeError(err, 'Could not rotate the credential'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (token: ScimTokenRecord) => {
    setBusy(true);
    try {
      await scimTokensApi.revoke(token.id);
      await load();
      toast.success('Credential revoked. Provisioning with it stops at the next sync.');
    } catch (err) {
      // Never drop the row locally on failure: showing a credential as
      // revoked while it still provisions is the dangerous direction.
      toast.error(describeError(err, 'Could not revoke the credential'));
    } finally {
      setBusy(false);
    }
  };

  const copy = (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => undefined);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <div data-testid="scim-tokens-panel">
      <div className="border-b border-surface-border px-6 py-4">
        <h2 className="text-base font-semibold text-fg-primary">SCIM provisioning</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Bearer credentials your identity provider uses to create, update and
          deprovision principals. Each one is scoped to this tenant.
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
              placeholder="e.g. corporate-directory"
              aria-label="Credential name"
            />
          </label>
          <label className="text-sm sm:w-48">
            <span className="mb-1 block text-fg-secondary">Expires in (days)</span>
            <input
              className={inputClass()}
              value={draftExpiry}
              onChange={(e) => setDraftExpiry(e.target.value)}
              placeholder="Leave blank for no expiry"
              inputMode="numeric"
              aria-label="Expires in days"
            />
          </label>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Create credential'}
          </button>
        </div>

        {revealed ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-200">
              Copy this now. It is stored as a digest and cannot be shown again
              — if it is lost, rotate.
            </p>
            <p className="mt-1 text-xs text-amber-300/80">{revealed.name}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="block flex-1 truncate rounded bg-surface-base px-3 py-2 font-mono text-sm text-amber-100 ring-1 ring-amber-500/30">
                {revealed.token}
              </code>
              <button
                type="button"
                onClick={() => copy(revealed.token)}
                className="rounded-lg border border-surface-border-strong bg-surface-card px-3 py-2 text-sm text-fg-primary hover:bg-surface-elevated"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="rounded-lg border border-surface-border-strong bg-surface-card px-3 py-2 text-sm text-fg-primary hover:bg-surface-elevated"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-xs text-fg-muted">
          Rotation grace window
          <select
            className="rounded border border-surface-border-strong bg-surface-base px-2 py-1 text-xs text-fg-primary"
            value={graceHours}
            onChange={(e) => setGraceHours(Number(e.target.value))}
            aria-label="Rotation grace window"
          >
            {GRACE_CHOICES.map((choice) => (
              <option key={choice.hours} value={choice.hours}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>

        {loadError ? (
          <EmptyState title="Could not load SCIM credentials" description={loadError} />
        ) : loading ? (
          <EmptyState title="Loading SCIM credentials…" description="" />
        ) : tokens.length === 0 ? (
          <EmptyState
            title="No SCIM credentials yet"
            description="Create one above, then paste it into your identity provider alongside this deployment's /scim/v2 base URL."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-card text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Prefix</th>
                  <th className="px-4 py-2 text-left">State</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Last used</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface-sunken/50">
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td className="px-4 py-3 font-medium text-fg-primary">{token.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-secondary">{token.prefix}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          token.active
                            ? 'rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300 ring-1 ring-emerald-500/30'
                            : 'rounded bg-surface-elevated px-1.5 py-0.5 text-fg-secondary ring-1 ring-surface-border-strong'
                        }
                      >
                        {token.active ? 'Active' : token.revoked_at ? 'Revoked' : 'Expired'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-secondary" suppressHydrationWarning>
                      {format(new Date(token.created_at), 'PPP')}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-secondary" suppressHydrationWarning>
                      {/* A credential nobody has used for months is a standing
                          key with no owner, which is why this column exists.
                          "Never" is a fact; an em dash would hide it. */}
                      {token.last_used_at
                        ? formatDistanceToNow(new Date(token.last_used_at), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void rotate(token)}
                          disabled={busy || !token.active}
                          className="rounded border border-surface-border-strong bg-surface-card px-2 py-1 text-xs text-fg-primary hover:bg-surface-elevated disabled:opacity-40"
                        >
                          Rotate
                        </button>
                        <button
                          type="button"
                          onClick={() => void revoke(token)}
                          disabled={busy || !token.active}
                          className="rounded border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-300 hover:bg-red-950/70 disabled:opacity-40"
                        >
                          Revoke
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
