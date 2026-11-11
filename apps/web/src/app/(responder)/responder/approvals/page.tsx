'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHead, EmptyState, FeedItem } from '@/components/ui/CloudifyOpsUI';

interface MitigationProposal {
  id: string;
  inv: string;
  sev: 'p1' | 'p2' | 'p3';
  action: string;
  detail: string;
  cli: string;
  status: 'pending' | 'applied' | 'rejected';
}

const DEFAULT_PROPOSALS: MitigationProposal[] = [
  {
    id: 'prop-01',
    inv: 'INC-2418',
    sev: 'p1',
    action: 'Revoke Compromised IAM Session & Invalidate Credentials',
    detail: 'Autonomous agent correlated impossible travel with unauthorized S3 exfiltration. Revoke all active session tokens immediately.',
    cli: 'aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive && clops-sec revoke-session --user dev-ops@corp.internal',
    status: 'pending',
  },
  {
    id: 'prop-02',
    inv: 'INC-2417',
    sev: 'p2',
    action: 'Restrict Security Group Ingress on Management Port 22',
    detail: 'Anomalous SSH brute force attempts observed from external ASN. Restrict security group 0.0.0.0/0 ingress to corporate bastion subnet.',
    cli: 'aws ec2 revoke-security-group-ingress --group-id sg-0123456789abcdef0 --protocol tcp --port 22 --cidr 0.0.0.0/0',
    status: 'pending',
  },
  {
    id: 'prop-03',
    inv: 'INC-2415',
    sev: 'p2',
    action: 'Isolate Compromised Kubernetes Pod Network Namespace',
    detail: 'Kernel sensor flagged memory injection inside production worker container. Apply network isolation policy.',
    cli: 'kubectl annotate pod worker-pod-774f quarantine=true --overwrite && kubectl label pod worker-pod-774f isolation=enforced',
    status: 'pending',
  },
];

interface ShiftMember {
  ab: string;
  name: string;
  sub: string;
  col: string;
  active?: boolean;
}

const SHIFT_ACTIVE: ShiftMember[] = [
  { ab: 'SS', name: 'Primary Incident Commander', sub: 'On-Call Tier 2 · Escalation Lead', col: '#3b82f6', active: true },
  { ab: 'AI', name: 'CLOPS Autonomous Agent', sub: 'Real-time Triage & Corroboration', col: '#10b981', active: true },
];

const SHIFT_UPCOMING: ShiftMember[] = [
  { ab: 'DR', name: 'Secondary SRE Responder', sub: 'Standby · Tier 1 Support', col: '#64748b', active: false },
  { ab: 'MK', name: 'Security Architect', sub: 'Standby · Governance Approver', col: '#64748b', active: false },
];

export default function ResponderApprovalsPage() {
  const [proposals, setProposals] = useState<MitigationProposal[]>(DEFAULT_PROPOSALS);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' | 'info' } | null>(null);

  const pendingProposals = useMemo(
    () => proposals.filter((p) => p.status === 'pending'),
    [proposals]
  );

  const showToast = (title: string, desc: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApply = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'applied' } : p))
    );
    showToast('Fix Applied', `Mitigation ${id} executed successfully. Status verified.`, 'success');
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' } : p))
    );
    showToast('Mitigation Rejected', `Proposal ${id} was rejected and archived.`, 'error');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border bg-surface-card shadow-lg text-sm transition-all"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500'
                : toastMessage.type === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-500'
            }`}
          />
          <div>
            <div className="font-semibold text-fg-primary">{toastMessage.title}</div>
            <div className="text-xs text-fg-muted">{toastMessage.desc}</div>
          </div>
        </div>
      )}

      {/* Page Head matching ui_src_final/screens/ActionCenter.tsx */}
      <PageHead
        title="Action Center"
        desc="Agent-generated fixes awaiting human action — the agent never applies changes on its own"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {pendingProposals.length} awaiting human review
            </span>
          </div>
        }
      />

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Proposals List (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {pendingProposals.length === 0 ? (
            <EmptyState
              title="Queue is clear"
              body="No mitigations are awaiting action. New proposals will appear here when the agent drafts a fix."
              action={
                <button
                  type="button"
                  className="co-btn ghost sm"
                  onClick={() => setProposals(DEFAULT_PROPOSALS)}
                >
                  Reload Demo Proposals
                </button>
              }
            />
          ) : (
            pendingProposals.map((m) => (
              <div key={m.id} className="co-appr">
                <div className="co-appr-top">
                  <span
                    className={`co-sev ${
                      m.sev === 'p1' ? 'critical' : m.sev === 'p2' ? 'high' : 'medium'
                    }`}
                  />
                  <span className="co-appr-action">{m.action}</span>
                  <span className="ml-auto co-badge warn">Awaiting action</span>
                </div>
                <div className="text-xs text-fg-muted mb-2 font-mono">
                  Incident: {m.inv} · Verified Impact: Low Blast Radius
                </div>
                <p className="co-appr-detail">{m.detail}</p>

                {/* Ready-to-run CLI Block */}
                <div className="co-cli-block">
                  <div className="co-cli-head">
                    <span>CLI Safeguard · Ready-to-run</span>
                    <button
                      type="button"
                      className="co-btn ghost sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.cli);
                        showToast('Copied', 'Command copied to clipboard');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <pre>{m.cli}</pre>
                </div>

                {/* Action Buttons */}
                <div className="co-appr-btns">
                  <button
                    type="button"
                    className="co-btn ok sm"
                    onClick={() => handleApply(m.id)}
                  >
                    ✓ Apply Fix
                  </button>
                  <Link href="/alerts" className="co-btn ghost sm">
                    View Incident
                  </Link>
                  <button
                    type="button"
                    className="co-btn danger sm"
                    onClick={() => handleReject(m.id)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: On-Call Shift & Live Activity (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* On-Call Shift Card */}
          <div className="co-card">
            <div className="co-card-title">On-call Shift</div>
            <div className="co-shift-head">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Shift 2 — Active · 06:00–14:00 UTC
            </div>
            {SHIFT_ACTIVE.map((s, idx) => (
              <div key={idx} className="co-shift-row">
                <div
                  className="co-shift-ava"
                  style={{
                    background: `${s.col}22`,
                    color: s.col,
                    border: `1px solid ${s.col}44`,
                  }}
                >
                  {s.ab}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-fg-primary text-xs truncate">{s.name}</div>
                  <div className="text-[10.5px] text-fg-muted truncate">{s.sub}</div>
                </div>
                <span className="co-badge ok">Active</span>
              </div>
            ))}

            <div className="co-shift-head text-fg-muted mt-4">
              Shift 3 — Upcoming · 14:00–22:00 UTC
            </div>
            {SHIFT_UPCOMING.map((s, idx) => (
              <div key={idx} className="co-shift-row">
                <div
                  className="co-shift-ava bg-surface-hover text-fg-muted border border-surface-border"
                >
                  {s.ab}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-fg-secondary text-xs truncate">{s.name}</div>
                  <div className="text-[10.5px] text-fg-muted truncate">{s.sub}</div>
                </div>
                <span className="co-badge na">Standby</span>
              </div>
            ))}

            <div className="mt-3 pt-2.5 border-t border-surface-border text-[10.5px] text-fg-muted">
              Time-based shift rotations · 24/7 autonomous monitoring with human-in-the-loop governance
            </div>
          </div>

          {/* Live Agent Activity Card */}
          <div className="co-card">
            <div className="co-card-title">Live Agent Activity</div>
            <div className="co-feed mt-3">
              <FeedItem
                f={{
                  body: 'Incident INC-2418 triage completed · Root cause confirmed',
                  time: '12:02 UTC',
                  col: '#22c55e',
                  ab: 'AI',
                  badge: { l: 'RCA Ready' },
                }}
              />
              <FeedItem
                f={{
                  body: 'Drafted mitigation verb: Invalidate IAM session tokens',
                  time: '12:03 UTC',
                  col: '#3b82f6',
                  ab: 'FIX',
                }}
              />
              <FeedItem
                f={{
                  body: 'Action gated: Dual-authorization required for production user',
                  time: '12:03 UTC',
                  col: '#f59e0b',
                  ab: 'GATE',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
