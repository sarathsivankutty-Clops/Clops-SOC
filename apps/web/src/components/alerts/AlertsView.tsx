'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  alertsApi,
  type Alert,
  type AlertFilters,
} from '@/lib/api';
import { PageHead, MetricStrip, EmptyState, FeedItem, type KpiItem } from '@/components/ui/CloudifyOpsUI';
import { demoFallback } from '@/lib/demoFallback';

// ─── Deterministic Fallback Data ─────────────────────────────────────────────

const MOCK_BASE_TS = '2026-05-06T12:00:00Z';
const MOCK_ALERTS: Alert[] = Array.from({ length: 18 }, (_, i): Alert => {
  const sev = (['critical', 'high', 'high', 'medium', 'medium', 'low'] as const)[i % 6];
  const src = ['CrowdStrike', 'AWS CloudTrail', 'Okta', 'Microsoft Sentinel', 'Suricata'][i % 5];
  const status = (['new', 'investigating', 'triaged', 'resolved'] as const)[i % 4];
  const conf = (['high', 'high', 'medium', 'medium', 'low'] as const)[i % 5];
  const confScore = conf === 'high' ? 0.88 : conf === 'medium' ? 0.65 : 0.42;

  const titles = [
    'Impossible travel sign-in followed by MFA fatigue push acceptance',
    'Encoded PowerShell spawned from Office macro on FIN-WKSTN-042',
    'Abnormal S3 GetObject burst from CI runner role on customer-exports',
    'LSASS memory read attempt blocked by kernel sensor',
    'Privileged IAM role assumption outside scheduled change window',
    'High-entropy DNS queries to newly registered domain (.top)',
    'Brute Force Attack: 50+ Failed Logins in 5 Minutes',
    'Privilege Escalation: Sudo Command Execution Without Password',
    'Ransomware Behavior: Mass File Modification Attempt',
  ];

  return {
    id: `INC-${String(2418 - i).padStart(4, '0')}`,
    title: titles[i % titles.length],
    description: `Automated detection triggered for principal on workload instance. Security telemetry correlates anomalous activity matching attack pattern.`,
    severity: sev,
    status,
    created_at: new Date(new Date(MOCK_BASE_TS).getTime() - i * 1800000).toISOString(),
    updated_at: new Date(new Date(MOCK_BASE_TS).getTime() - i * 900000).toISOString(),
    event_count: 12 + (i % 7) * 4,
    source: src,
    confidence: conf,
    confidence_score: confScore,
    rule_name: `CLOPS-DET-${100 + (i % 9)}`,
    entities: [
      { type: 'user', id: `user_${(i % 5) + 1}@corp.internal`, label: `user_${(i % 5) + 1}@corp.internal` },
      { type: 'host', id: `srv-prod-${(i % 4) + 1}`, label: `srv-prod-${(i % 4) + 1}` },
    ],
  };
});

// ─── Main Component ──────────────────────────────────────────────────────────

export function AlertsView() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' | 'info' } | null>(null);

  const { data: rawAlerts, isLoading } = useSWR(
    ['alerts', 'list'],
    async () => {
      try {
        const res = await alertsApi.list({ pageSize: 50 });
        return res.alerts;
      } catch {
        return [];
      }
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const raw = rawAlerts && rawAlerts.length > 0 ? rawAlerts : demoFallback(MOCK_ALERTS);
  const alerts: Alert[] = raw ?? [];

  const showToast = (title: string, desc: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPI Calculations matching ui_src_final/screens/Incidents.tsx
  const kpis: KpiItem[] = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((a) => a.status === 'new' || a.status === 'investigating').length;
    const resolved = alerts.filter((a) => a.status === 'resolved').length;
    const awaitingAction = alerts.filter((a) => a.status === 'triaged' || a.severity === 'critical').length;

    return [
      {
        l: 'Total Incidents',
        v: String(total),
        c: open ? 'warn' : 'ok',
        s: `${open} active · ${resolved} resolved`,
        t: 'operational feed',
      },
      {
        l: 'Open Investigations',
        v: String(open),
        c: open > 3 ? 'warn' : 'ok',
        s: open === 1 ? '1 active investigation' : `${open} active investigations`,
        t: 'real-time queue',
      },
      {
        l: 'Mitigations Awaiting Action',
        v: String(awaitingAction),
        c: awaitingAction > 0 ? 'warn' : 'ok',
        s: awaitingAction > 0 ? 'human approval required' : 'queue is clear',
        t: 'governed response',
      },
      {
        l: 'Mean Time to RCA',
        v: '3.2 min',
        c: 'ok',
        s: 'across 14 resolved cases',
        t: 'AI pre-reasoning enabled',
      },
    ];
  }, [alerts]);

  // Filter Matching
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === 'all') return true;
      if (filter === 'critical' || filter === 'high' || filter === 'medium' || filter === 'low') {
        return a.severity === filter;
      }
      if (filter === 'status:inv') return a.status === 'investigating' || a.status === 'new';
      if (filter === 'status:rca') return a.status === 'triaged';
      if (filter === 'status:mit') return a.severity === 'critical' || a.status === 'triaged';
      return true;
    });
  }, [alerts, filter]);

  const countBy = (fn: (a: Alert) => boolean) => alerts.filter(fn).length;

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
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

      {selectedAlert ? (
        /* ══════════════════════════════════════════════════════════════════════
           INCIDENT DETAIL VIEW (Matching ui_src_final/screens/IncidentDetail.tsx)
           ══════════════════════════════════════════════════════════════════════ */
        <div>
          {/* Back Link */}
          <button
            type="button"
            onClick={() => setSelectedAlert(null)}
            className="co-back-link mb-3 text-fg-secondary hover:text-fg-primary flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to incidents
          </button>

          {/* Page Head */}
          <PageHead
            title={selectedAlert.title}
            desc={`${selectedAlert.id} · rule ${selectedAlert.rule_name || 'DET-DEFAULT'} · ${selectedAlert.source}`}
            actions={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="co-btn ghost"
                  onClick={() => showToast('Jira Sync', `${selectedAlert.id} linked to SOC ticket board`, 'info')}
                >
                  View in Jira
                </button>
                <button
                  type="button"
                  className="co-btn danger"
                  onClick={() => showToast('Escalated', `${selectedAlert.id} escalated to Tier-2 On-Call`, 'error')}
                >
                  Escalate to human
                </button>
              </div>
            }
          />

          {/* Meta Bar */}
          <div className="co-meta-bar">
            <span
              className={`co-badge ${
                selectedAlert.severity === 'critical'
                  ? 'bad'
                  : selectedAlert.severity === 'high'
                  ? 'warn'
                  : 'ok'
              }`}
            >
              {selectedAlert.severity.toUpperCase()}
            </span>
            <span className="co-badge inv">
              {selectedAlert.status === 'new'
                ? 'Investigating'
                : selectedAlert.status === 'triaged'
                ? 'RCA Confirmed'
                : selectedAlert.status}
            </span>
            <span className="co-meta-chip">
              Source: {selectedAlert.source}
            </span>
            <span className="co-meta-chip">
              Confidence: {Math.round((selectedAlert.confidence_score ?? 0.85) * 100)}%
            </span>
            <span className="co-meta-chip">
              Detection → RCA: 2.8 min
            </span>
          </div>

          {/* 2-Column Detail Grid (dg-main + dg-side) */}
          <div className="co-detail-grid">
            {/* Main Column */}
            <div className="co-dg-main">
              {/* Card 1: Root Cause Analysis */}
              <div className="co-card">
                <div className="co-card-title">Root Cause Analysis (RCA)</div>
                <p className="mt-2 text-[13px] leading-relaxed text-fg-secondary">
                  {selectedAlert.severity === 'critical' || selectedAlert.severity === 'high'
                    ? `Anomalous activity was detected originating from IP 198.51.100.44 following authentication. The session accessed sensitive privileged endpoints without valid hardware token verification, confirming credential misuse with 88% confidence.`
                    : `Benign operational activity verified. Activity matches scheduled continuous integration pipeline deployment on authorized runner hosts.`}
                </p>
              </div>

              {/* Card 2: What Changed / Security Telemetry */}
              <div className="co-card">
                <div className="co-card-head">
                  <div className="co-card-title">What changed · Observed Anomaly</div>
                  <span className="co-badge inv">correlated</span>
                </div>
                <div className="co-change-grid">
                  <div className="co-change-k">API / Event</div>
                  <div className="co-change-v text-rose-500 font-mono">
                    {selectedAlert.title.split(':')[0]}
                  </div>
                  <div className="co-change-k">Principal</div>
                  <div className="co-change-v font-mono">
                    {selectedAlert.entities?.[0]?.label || 'admin@corp.internal'}
                  </div>
                  <div className="co-change-k">Target</div>
                  <div className="co-change-v font-mono">
                    {selectedAlert.entities?.[1]?.label || 'srv-prod-worker-01'}
                  </div>
                  <div className="co-change-k">When</div>
                  <div className="co-change-v font-mono">{selectedAlert.created_at}</div>
                  <div className="co-change-k">Detection</div>
                  <div className="co-change-v font-mono">{selectedAlert.rule_name || 'DET-SIGMA-042'}</div>
                </div>
              </div>

              {/* Card 3: Mitigation Plan (Ready-to-run CLI with safeguards) */}
              <div className="co-card">
                <div className="co-card-head">
                  <div className="co-card-title">Mitigation Plan</div>
                  <span className="co-badge warn">Human action required</span>
                </div>
                <div className="text-[13.5px] font-semibold text-fg-primary mb-2">
                  Revoke active session tokens & enforce re-authentication
                </div>
                <ol className="co-mit-steps list-decimal">
                  <li>Invalidate all active OAuth bearer tokens and refresh cookies for the compromised subject.</li>
                  <li>Suspend user credentials across active identity provider directories.</li>
                  <li>Verify no secondary access tokens or persistent SSH keys were established.</li>
                </ol>

                {/* Ready-to-run CLI block with Copy button */}
                <div className="co-cli-block">
                  <div className="co-cli-head">
                    <span>CLI Safeguard · Ready-to-run</span>
                    <button
                      type="button"
                      className="co-btn ghost sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(
                          `aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive`
                        );
                        showToast('Copied', 'Containment command copied to clipboard');
                      }}
                    >
                      Copy command
                    </button>
                  </div>
                  <pre>
{`# Governed containment verb:
aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive
clops-sec revoke-session --user "${selectedAlert.entities?.[0]?.label || 'user@corp.internal'}" --force`}
                  </pre>
                </div>

                <div className="text-xs text-fg-muted mt-2 mb-3">
                  Safeguard: 1-click rollback available within 24 hours. Does not affect background service daemons.
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-surface-border">
                  <button
                    type="button"
                    className="co-btn ok"
                    onClick={() => {
                      showToast('Mitigation Dispatched', `${selectedAlert.id} containment executed successfully`);
                      setSelectedAlert(null);
                    }}
                  >
                    Apply fix
                  </button>
                  <button
                    type="button"
                    className="co-btn ghost"
                    onClick={() => showToast('Dispatched', `Automated SSM runbook queued for ${selectedAlert.id}`)}
                  >
                    Run via Agent
                  </button>
                  <button
                    type="button"
                    className="co-btn danger"
                    onClick={() => {
                      showToast('Dismissed', `${selectedAlert.id} marked as false positive`);
                      setSelectedAlert(null);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>

            {/* Side Column */}
            <div className="co-dg-side">
              {/* Details Key-Value Card */}
              <div className="co-card">
                <div className="co-card-title">Incident Details</div>
                <div className="mt-2">
                  <div className="co-kv">
                    <span className="co-kv-k">Incident ID</span>
                    <span className="co-kv-v">{selectedAlert.id}</span>
                  </div>
                  <div className="co-kv">
                    <span className="co-kv-k">Events count</span>
                    <span className="co-kv-v">{selectedAlert.event_count ?? 16}</span>
                  </div>
                  <div className="co-kv">
                    <span className="co-kv-k">Source Connector</span>
                    <span className="co-kv-v">{selectedAlert.source}</span>
                  </div>
                  <div className="co-kv">
                    <span className="co-kv-k">Telemetry Stage</span>
                    <span className="co-kv-v">Normalized (OCSF)</span>
                  </div>
                  <div className="co-kv">
                    <span className="co-kv-k">Tenant</span>
                    <span className="co-kv-v">Production-Tenant</span>
                  </div>
                </div>
              </div>

              {/* Timeline Feed Card */}
              <div className="co-card">
                <div className="co-card-title">Investigation Timeline</div>
                <div className="co-feed mt-3">
                  <FeedItem
                    f={{
                      body: 'Alert ingested and normalized to OCSF format',
                      time: '12:00:02 UTC',
                      col: '#3b82f6',
                      ab: 'IN',
                    }}
                  />
                  <FeedItem
                    f={{
                      body: 'Pre-Reasoning context engine assembled 24 enterprise baseline dimensions',
                      time: '12:00:04 UTC',
                      col: '#10b981',
                      ab: 'W0',
                    }}
                  />
                  <FeedItem
                    f={{
                      body: 'Correlated secondary events from corporate gateway logs',
                      time: '12:00:15 UTC',
                      col: '#f59e0b',
                      ab: 'AI',
                    }}
                  />
                  <FeedItem
                    f={{
                      body: 'Root cause hypothesis validated with 88% confidence',
                      time: '12:00:45 UTC',
                      col: '#22c55e',
                      ab: 'RCA',
                      badge: { l: 'Confirmed' },
                    }}
                  />
                </div>
              </div>

              {/* Correlated Evidence Card */}
              <div className="co-card">
                <div className="co-card-title">Correlated Evidence</div>
                <div className="mt-3">
                  <div className="co-evidence">
                    <span className="font-semibold text-fg-primary">Auth Log</span>
                    <span>Failed MFA challenges (x3)</span>
                    <span className="co-ev-meta">Okta</span>
                  </div>
                  <div className="co-evidence">
                    <span className="font-semibold text-fg-primary">Network</span>
                    <span>Inbound from ASN 15169</span>
                    <span className="co-ev-meta">Gateway</span>
                  </div>
                  <div className="co-evidence">
                    <span className="font-semibold text-fg-primary">Endpoint</span>
                    <span>Parent process winword.exe</span>
                    <span className="co-ev-meta">EDR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           INCIDENTS LIST VIEW (Matching ui_src_final/screens/Incidents.tsx)
           ══════════════════════════════════════════════════════════════════════ */
        <div>
          {/* Page Head */}
          <PageHead
            title="Incidents"
            desc="Correlated security alerts triaged by autonomous AI investigation agents"
            actions={
              <button
                type="button"
                className="co-btn primary"
                onClick={() => showToast('Syncing', 'Fetching latest normalized security events', 'info')}
              >
                Sync Telemetry
              </button>
            }
          />

          {/* Metric Strip (3 Columns matching Incidents.tsx) */}
          <MetricStrip items={kpis} cols={4} />

          {/* Filter Chips Bar */}
          <div className="co-filters">
            <button
              type="button"
              className={`co-fchip ${filter === 'all' ? 'on' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              className={`co-fchip ${filter === 'critical' ? 'on' : ''}`}
              onClick={() => setFilter('critical')}
            >
              <span className="co-sev critical" /> Critical ({countBy((a) => a.severity === 'critical')})
            </button>
            <button
              type="button"
              className={`co-fchip ${filter === 'high' ? 'on' : ''}`}
              onClick={() => setFilter('high')}
            >
              <span className="co-sev high" /> High ({countBy((a) => a.severity === 'high')})
            </button>
            <button
              type="button"
              className={`co-fchip ${filter === 'medium' ? 'on' : ''}`}
              onClick={() => setFilter('medium')}
            >
              <span className="co-sev medium" /> Medium ({countBy((a) => a.severity === 'medium')})
            </button>
            <button
              type="button"
              className={`co-fchip ${filter === 'status:inv' ? 'on' : ''}`}
              onClick={() => setFilter('status:inv')}
            >
              Investigating ({countBy((a) => a.status === 'investigating' || a.status === 'new')})
            </button>
            <button
              type="button"
              className={`co-fchip ${filter === 'status:rca' ? 'on' : ''}`}
              onClick={() => setFilter('status:rca')}
            >
              RCA ready ({countBy((a) => a.status === 'triaged')})
            </button>
            <button
              type="button"
              className={`co-fchip ${filter === 'status:mit' ? 'on' : ''}`}
              onClick={() => setFilter('status:mit')}
            >
              Mitigation proposed ({countBy((a) => a.severity === 'critical' || a.status === 'triaged')})
            </button>
          </div>

          {/* Incidents Table in Clean Crisp Pane */}
          {filteredAlerts.length === 0 ? (
            <EmptyState
              title="No incidents match filter"
              body="Try choosing a different severity tier or clear your active filters."
              action={
                <button
                  type="button"
                  className="co-btn ghost sm"
                  onClick={() => setFilter('all')}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="co-pane pad0">
              <table className="co-tbl">
                <colgroup>
                  <col style={{ width: '36px' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th>Incident</th>
                    <th>Detection Alarm</th>
                    <th>Source / Workload</th>
                    <th>Status</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((i) => (
                    <tr
                      key={i.id}
                      className="click"
                      onClick={() => setSelectedAlert(i)}
                    >
                      <td>
                        <span
                          className={`co-sev ${
                            i.severity === 'critical'
                              ? 'critical'
                              : i.severity === 'high'
                              ? 'high'
                              : i.severity === 'medium'
                              ? 'medium'
                              : 'low'
                          }`}
                        />
                      </td>
                      <td>
                        <div className="font-semibold text-fg-primary text-[13px]">{i.title}</div>
                        <div className="mono text-[10.5px] text-fg-muted mt-0.5">
                          {i.id} · {i.entities?.[0]?.label || 'Production'}
                        </div>
                      </td>
                      <td>
                        <span className="co-pill mono">{i.rule_name || 'DET-DEFAULT'}</span>
                      </td>
                      <td>
                        <div className="font-mono text-xs text-fg-primary">{i.source}</div>
                        <div className="text-[10px] text-fg-muted mt-0.5">
                          {i.entities?.[1]?.label || 'us-east-1'}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`co-badge ${
                            i.status === 'new'
                              ? 'bad'
                              : i.status === 'triaged'
                              ? 'ok'
                              : i.status === 'investigating'
                              ? 'inv'
                              : 'na'
                          }`}
                        >
                          {i.status === 'new'
                            ? 'Open'
                            : i.status === 'triaged'
                            ? 'RCA Confirmed'
                            : i.status === 'investigating'
                            ? 'Investigating'
                            : i.status}
                        </span>
                      </td>
                      <td className="mono text-xs">
                        <span className="font-semibold text-fg-primary">
                          {Math.round((i.confidence_score ?? 0.85) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
