'use client';

/**
 * L1InvestigationStory Component
 * ==============================
 * Designed specifically for SOC L1 Analysts, Junior SOC Engineers, NOC,
 * and SRE L1 Engineers to understand an incident in 30–45 seconds.
 *
 * Implements the Dual-Projection Contract:
 * 1. Analyst Mode (Default):
 *    - Answers the 6 Progressive Questions in strict order:
 *      1. What happened?
 *      2. Is this serious? (What does AI believe happened?)
 *      3. Why does AI think this?
 *      4. What evidence supports or tempers it?
 *      5. What should I do?
 *      6. What happens if I execute this action?
 *    - Audit-Friendly AI Investigation Summary Flow (NOT raw chain-of-thought)
 *    - Zero internal AI math (+25/-15), wave mechanics, or pack IDs
 * 2. Expert Mode (Expandable):
 *    - Numerical Confidence Ledger with point deltas (+25, +15, -10)
 *    - Competing Hypothesis Evolution across waves
 *    - Multi-Wave execution timeline with durations
 *    - Composable Pack Execution receipts (9 internal types)
 *    - Governance Decision Policy & Blast-Radius evaluation
 *    - Verification & Rollback specs
 *    - OCSF Event citations
 */

import React, { useState } from 'react';
import { clsx } from 'clsx';
import type { Alert } from '@/lib/api';

export interface L1InvestigationStoryProps {
  alert: Alert;
  onApproveAction?: (actionText: string) => void;
  onEscalate?: () => void;
}

export function L1InvestigationStory({
  alert,
  onApproveAction,
  onEscalate,
}: L1InvestigationStoryProps) {
  const [uiMode, setUiMode] = useState<'analyst' | 'expert'>('analyst');
  const [actionExecuted, setActionExecuted] = useState<string | null>(null);

  // Derive scenario from alert context
  const isTor =
    alert.srcIpClass === 'tor_exit' ||
    alert.title.toLowerCase().includes('tor') ||
    (alert.tags && alert.tags.some((t) => t.includes('185.220')));
  const isVpn =
    alert.srcIpClass === 'vpn' ||
    alert.title.toLowerCase().includes('vpn') ||
    alert.status === 'false_positive';
  const isBenign = isVpn || alert.severity === 'low' || alert.severity === 'info';

  const user = alert.assignee || 'john.smith@corp.example';
  const displayUser = user.split('@')[0].replace('.', ' ');
  const capitalizedUser = displayUser
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const confidenceScore = alert.confidenceScore ?? (isBenign ? 89 : 91);

  // 1. What happened?
  const whatHappened = isBenign
    ? `Scheduled release v4.12.0 and approved corporate VPN roaming detected for ${capitalizedUser}.`
    : `Impossible travel and suspicious authentication activity detected for ${capitalizedUser} (${alert.source}).`;

  // 2. What does AI believe happened?
  const beliefHeadline = isBenign
    ? 'Likely legitimate travel using corporate VPN.'
    : 'High-confidence account takeover.';
  const beliefSummary = isBenign
    ? `${capitalizedUser} signed in through a sanctioned corporate VPN gateway using a managed corporate laptop with strong MFA and zero suspicious post-login actions.`
    : `An external attacker signed into ${capitalizedUser}'s account from an anonymizer network (Tor) without MFA and attempted persistence activity.`;

  // 3 & 4. Why does AI believe that? (Key evidence)
  const keyEvidence = isBenign
    ? [
        { confirmed: true, label: 'MFA completed', detail: 'User completed strong hardware MFA challenge.' },
        { confirmed: true, label: 'Login from corporate VPN', detail: 'Source IP is on the sanctioned corporate VPN egress list.' },
        { confirmed: true, label: 'Device previously seen', detail: 'Managed corporate laptop fingerprint matches 90-day baseline.' },
        { confirmed: true, label: 'No suspicious activity after login', detail: 'Zero unauthorized forwarding rules, OAuth apps, or privilege changes.' },
      ]
    : [
        { confirmed: true, label: 'Tor exit node', detail: 'Login originated from a verified Tor exit relay with 0 prior tenant sign-ins.' },
        { confirmed: true, label: 'Legacy authentication', detail: 'MFA was bypassed via legacy protocol after previous failed prompts.' },
        { confirmed: true, label: 'New forwarding rule', detail: 'New mailbox forwarding rule created immediately following login.' },
        { confirmed: true, label: 'Impossible travel confirmed', detail: 'Sign-in occurred minutes after normal domestic activity; Corporate VPN ruled out.' },
      ];

  const increasedBecause = isBenign
    ? [
        'User successfully completed strong hardware MFA.',
        'Source IP belongs to a verified corporate VPN gateway.',
        'Device fingerprint matches historical laptop usage.',
        'No suspicious actions occurred within 60 minutes after login.',
      ]
    : [
        'Login originated from a known Tor exit node.',
        'MFA was bypassed via legacy protocol.',
        'New mailbox forwarding rule was created.',
        'Corporate VPN and scheduled maintenance windows were ruled out.',
      ];

  const decreasedBecause = isBenign
    ? ['Sign-in occurred outside user’s primary home timezone.']
    : ['User had one historical travel sign-in from Europe 8 months ago.'];

  // 5. What should I do?
  const primaryAction = isBenign
    ? {
        type: 'no_action',
        label: '✓ No Action Required — Close as Legitimate VPN Roaming',
        summary: 'Close alert as verified benign corporate VPN activity and update 7-day travel baseline.',
        businessImpact: 'Zero operational disruption — user continues working normally.',
        whatHappens: [
          'Closes alert as Resolved (Benign — Verified Corporate VPN).',
          'Records a 7-day travel baseline to prevent repeat false-positive alerts.',
          'Reversible: Can be reopened in 1-click if new anomalous indicators arrive.',
        ],
      }
    : {
        type: 'containment',
        label: '🛡 Approve Containment: Lock Account & Remove Forwarding Rule',
        summary: `Lock ${capitalizedUser}'s account immediately, revoke all active sessions, and remove unauthorized mail rules.`,
        businessImpact: `Low impact — affects only ${capitalizedUser}'s account; 0 shared production servers or databases impacted.`,
        whatHappens: [
          `Terminates all active sessions and OAuth refresh tokens for ${capitalizedUser}.`,
          'Removes unauthorized external mailbox forwarding rules.',
          'Automatically verifies 60 seconds later that active sessions dropped to 0.',
          '1-Click Undo: Full restore available anytime if verified legitimate.',
        ],
      };

  // AI Investigation Summary flow
  const summarySteps = isBenign
    ? [
        'Alert received',
        'Context hydrated (24 sources)',
        'Corporate VPN matched',
        'Strong MFA verified',
        'Post-login activity clean',
        'Evidence sufficient (89% confidence)',
        'No action required',
      ]
    : [
        'Alert received',
        'Context hydrated (24 sources)',
        'Three questions asked',
        'Corporate VPN ruled out',
        'Suspicious forwarding rule discovered',
        'Wave 2 triggered',
        'Evidence sufficient (91% confidence)',
        'Containment recommended',
      ];

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Top Mode Switcher Bar */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg-muted">
            Investigation View
          </span>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
            L1 30-Second Story
          </span>
        </div>
        <div className="flex rounded-lg border border-surface-border bg-surface-card p-0.5">
          <button
            type="button"
            onClick={() => setUiMode('analyst')}
            className={clsx(
              'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              uiMode === 'analyst'
                ? 'bg-brand-500/15 text-brand-400 font-semibold shadow-xs'
                : 'text-fg-muted hover:text-fg-primary',
            )}
          >
            Analyst Mode (Default)
          </button>
          <button
            type="button"
            onClick={() => setUiMode('expert')}
            className={clsx(
              'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              uiMode === 'expert'
                ? 'bg-violet-500/15 text-violet-300 font-semibold shadow-xs'
                : 'text-fg-muted hover:text-fg-primary',
            )}
          >
            Expert Mode (Ledger &amp; Waves)
          </button>
        </div>
      </div>

      {/* ─── ANALYST MODE (DEFAULT VIEW — 30-45 SECOND COMPREHENSION) ───────── */}
      {uiMode === 'analyst' && (
        <div className="space-y-4">
          {/* 1. What Happened? */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-3.5 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              1. What happened?
            </div>
            <div className="text-[13px] font-medium text-fg-primary leading-snug">
              {whatHappened}
            </div>
          </div>

          {/* 2. Is this serious? / What does AI believe happened? */}
          <div
            className={clsx(
              'rounded-xl border p-3.5 space-y-2',
              isBenign
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-rose-500/30 bg-rose-500/5',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                2. Is this serious? (What does AI believe happened?)
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    'h-2 w-2 rounded-full',
                    isBenign ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse',
                  )}
                />
                <span className="font-mono text-[11px] font-bold text-fg-primary">
                  AI Confidence: {confidenceScore}/100 ({confidenceScore >= 80 ? 'High' : 'Moderate'})
                </span>
              </div>
            </div>
            <div
              className={clsx(
                'text-[14px] font-semibold',
                isBenign ? 'text-emerald-400' : 'text-rose-400',
              )}
            >
              {beliefHeadline}
            </div>
            <p className="text-[12px] text-fg-secondary leading-relaxed">
              {beliefSummary}
            </p>
          </div>

          {/* 3 & 4. Why does AI believe that? & Key Evidence */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-3.5 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              3 &amp; 4. Why does AI believe this? (Key Evidence)
            </div>

            {/* Scannable ✔ Checklist */}
            <div className="grid grid-cols-1 gap-2">
              {keyEvidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-surface-border/60 bg-surface-base p-2"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                    ✔
                  </span>
                  <div>
                    <div className="text-[12px] font-semibold text-fg-primary">
                      {ev.label}
                    </div>
                    <div className="text-[11px] text-fg-muted leading-tight mt-0.5">
                      {ev.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Plain English Confidence Factors (Zero raw math) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-surface-border/50">
              <div>
                <span className="text-[11px] font-semibold text-emerald-400 block mb-1">
                  Confidence increased because:
                </span>
                <ul className="space-y-1 text-[11px] text-fg-secondary list-disc pl-4">
                  {increasedBecause.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-amber-400 block mb-1">
                  Confidence tempered because:
                </span>
                <ul className="space-y-1 text-[11px] text-fg-secondary list-disc pl-4">
                  {decreasedBecause.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 5. What should I do? (Single Primary Action) */}
          <div className="rounded-xl border border-brand-500/35 bg-surface-card p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                5. What should I do? (Recommended Action)
              </span>
              <span className="rounded-full bg-brand-500/15 px-2 py-0.5 font-mono text-[10px] text-brand-300">
                L1 One-Click Approval
              </span>
            </div>

            <p className="text-[12px] text-fg-secondary leading-relaxed">
              {primaryAction.summary}
            </p>

            {actionExecuted ? (
              <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 p-2.5 text-emerald-300 text-[11.5px] flex items-center justify-between">
                <span>✓ {actionExecuted}</span>
                <button
                  type="button"
                  onClick={() => setActionExecuted(null)}
                  className="text-[10.5px] underline hover:text-emerald-200"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setActionExecuted(`Action executed: ${primaryAction.label}`);
                    onApproveAction?.(primaryAction.label);
                  }}
                  className={clsx(
                    'w-full py-2.5 px-3 rounded-lg text-[12.5px] font-semibold transition-all shadow-sm flex items-center justify-center gap-2',
                    isBenign
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-brand-500 hover:bg-brand-400 text-fg-inverse',
                  )}
                >
                  <span>{primaryAction.label}</span>
                  <span className="font-mono text-[10px] opacity-75">(⌘↵)</span>
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onEscalate}
                    className="flex-1 py-1 px-2 rounded-md border border-surface-border bg-surface-base text-[11px] text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated transition-colors text-center"
                  >
                    ↗ Escalate to Tier-2
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-1 px-2 rounded-md border border-surface-border bg-surface-base text-[11px] text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated transition-colors text-center"
                  >
                    💬 Ask User on Slack
                  </button>
                  <button
                    type="button"
                    onClick={() => setUiMode('expert')}
                    className="flex-1 py-1 px-2 rounded-md border border-surface-border bg-surface-base text-[11px] text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated transition-colors text-center"
                  >
                    🔍 Deep Inspection
                  </button>
                </div>
              </div>
            )}

            {/* 6. What happens if I execute this action? */}
            <div className="rounded-lg border border-surface-border/60 bg-surface-base p-2.5 space-y-1.5 mt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block">
                6. What happens if I execute this action?
              </span>
              <div className="text-[11px] text-fg-secondary">
                <strong className="text-fg-primary">Business Impact:</strong>{' '}
                {primaryAction.businessImpact}
              </div>
              <ul className="space-y-0.5 text-[10.5px] text-fg-muted list-disc pl-3.5">
                {primaryAction.whatHappens.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Audit-Friendly AI Investigation Summary Flow */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted block">
              AI Investigation Summary (Completed in 2.8s)
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
              {summarySteps.map((step, idx) => (
                <React.Fragment key={idx}>
                  <span
                    className={clsx(
                      'rounded-md px-2 py-0.5 font-medium border',
                      idx === summarySteps.length - 1
                        ? 'border-brand-500/40 bg-brand-500/10 text-brand-300 font-semibold'
                        : 'border-surface-border bg-surface-base text-fg-secondary',
                    )}
                  >
                    {step}
                  </span>
                  {idx < summarySteps.length - 1 && <span>──►</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── EXPERT MODE (EXPANDED FORENSIC PROVENANCE VIEW) ─────────────────── */}
      {uiMode === 'expert' && (
        <div className="space-y-4">
          {/* Numerical Confidence Ledger */}
          <div className="rounded-xl border border-surface-border bg-surface-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-primary">
                Numerical Confidence Ledger (Winner: {isBenign ? 'H2_BENIGN = 89' : 'H1_ATO = 91'}/100)
              </span>
              <span className="font-mono text-[10px] text-fg-muted">
                Claim Support: 1.0 Verified
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-surface-border text-fg-muted">
                    <th className="py-1 px-2">Wave</th>
                    <th className="py-1 px-2">Delta</th>
                    <th className="py-1 px-2">Running</th>
                    <th className="py-1 px-2 font-sans font-medium">Question &amp; Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/50 text-fg-secondary">
                  <tr className="hover:bg-surface-elevated/40">
                    <td className="py-1.5 px-2">Wave 0</td>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">+35</td>
                    <td className="py-1.5 px-2 font-bold">35</td>
                    <td className="py-1.5 px-2 font-sans text-fg-primary">
                      Base prior from 24-dimension context: 0 prior logins from source IP in 90 days.
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-elevated/40">
                    <td className="py-1.5 px-2">Wave 1</td>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">+25</td>
                    <td className="py-1.5 px-2 font-bold">60</td>
                    <td className="py-1.5 px-2 font-sans text-fg-primary">
                      Source IP verified as Tor exit relay; Corporate VPN ruled out.
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-elevated/40">
                    <td className="py-1.5 px-2">Wave 1</td>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">+15</td>
                    <td className="py-1.5 px-2 font-bold">75</td>
                    <td className="py-1.5 px-2 font-sans text-fg-primary">
                      Authentication bypassed MFA prompt via legacy IMAP protocol.
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-elevated/40">
                    <td className="py-1.5 px-2">Wave 2</td>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">+21</td>
                    <td className="py-1.5 px-2 font-bold">96</td>
                    <td className="py-1.5 px-2 font-sans text-fg-primary">
                      Set-InboxRule created external forwarding rule 85s after sign-in.
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-elevated/40">
                    <td className="py-1.5 px-2">Wave 0</td>
                    <td className="py-1.5 px-2 text-rose-400 font-bold">-5</td>
                    <td className="py-1.5 px-2 font-bold">91</td>
                    <td className="py-1.5 px-2 font-sans text-fg-muted">
                      User had 1 European travel login 8 months ago (tempered score).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Hypothesis Evolution & Wave Execution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-primary block">
                Hypothesis Evolution
              </span>
              <div className="space-y-2 text-[11.5px]">
                <div className="p-2 rounded border border-brand-500/30 bg-brand-500/10">
                  <div className="flex items-center justify-between font-semibold text-brand-300">
                    <span>H1: Account Takeover (Winner)</span>
                    <span className="font-mono">91/100</span>
                  </div>
                  <div className="font-mono text-[10px] text-fg-muted mt-1">
                    Wave 0 (35) ──► Wave 1 (75) ──► Wave 2 (91 ★)
                  </div>
                </div>
                <div className="p-2 rounded border border-surface-border bg-surface-base">
                  <div className="flex items-center justify-between font-semibold text-fg-secondary">
                    <span>H2: Legitimate Roaming / VPN</span>
                    <span className="font-mono">9/100</span>
                  </div>
                  <div className="font-mono text-[10px] text-fg-muted mt-1">
                    Wave 0 (35) ──► Wave 1 (15) ──► Wave 2 (9)
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-card p-3 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-primary block">
                Governance, Verification &amp; Rollback
              </span>
              <div className="space-y-1.5 text-[11px] text-fg-secondary">
                <div>
                  <strong className="text-fg-primary">Policy Pack:</strong>{' '}
                  <span className="font-mono">pack.policy.tier1_safe_containment@v5</span>
                </div>
                <div>
                  <strong className="text-fg-primary">Autonomy Mode:</strong>{' '}
                  <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-300 font-mono text-[10px]">
                    ONE_CLICK_APPROVAL
                  </span>
                </div>
                <div>
                  <strong className="text-fg-primary">Post-Verification:</strong>{' '}
                  Polls IdP at +60s to confirm 0 active sessions remain.
                </div>
                <div>
                  <strong className="text-fg-primary">Rollback Pack:</strong>{' '}
                  <span className="font-mono">pack.rollback.restore_identity_state@v3</span>{' '}
                  (1-Click armed).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
