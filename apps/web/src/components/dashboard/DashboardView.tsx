'use client';

/**
 * DashboardView
 * =============
 * Main SOC command dashboard matching the clean 4-row layout of design-mockup/index.html:
 *   1. Hero greeting banner with status pills & primary quick actions
 *   2. 4 KPI cards with left accent bar
 *   3. 2fr / 1fr row: Alert volume area chart + Severity mix horizontal bars
 *   4. 2fr / 1fr row: Needs your attention & Connected sources + Top ATT&CK tactics bars
 *   5. Collapsible deep pipeline & SLA telemetry drawer
 */

import React, { Component, Suspense, type ErrorInfo, type ReactNode, useState, useCallback } from 'react';
import useSWR from 'swr';
import { metricsApi, type DashboardMetrics } from '@/lib/api';
import { useTimeWindow } from '@/components/layout/TimeWindowProvider';
import { TIME_WINDOW_LONG_LABEL, TIME_WINDOW_SHORT_LABEL } from '@/lib/timeWindow';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { format } from 'date-fns';
import { LiveFeedPanel } from './LiveFeedPanel';
import { SOCMetricsDashboard } from './SOCMetricsDashboard';
import { DashboardWelcome } from './DashboardWelcome';
import { FunnelKpiBar } from './FunnelKpiBar';
import { EfficiencyReport } from './EfficiencyReport';
import { PipelineHealth } from './PipelineHealth';
import { demoFallback } from '@/lib/demoFallback';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { AiSpinner } from '@/components/ui/AiSpinner';

const RechartsArea = dynamic(
  () =>
    import('recharts').then((m) => {
      const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = m;
      function RechartsAreaInner(props: { data: { time: string; count: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={props.data}>
              <defs>
                <linearGradient id="alertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-400, #2dd4bf)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--brand-400, #2dd4bf)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: 'var(--fg-subtle)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--brand-400, #2dd4bf)"
                fill="url(#alertGrad)"
                strokeWidth={2.2}
                name="Alerts"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      return RechartsAreaInner;
    }),
  { ssr: false, loading: () => <div className="h-[190px] bg-surface-hover animate-pulse rounded-lg" /> },
);

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DashboardView] render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-fg-muted">
          <p className="text-sm">Dashboard encountered an error. Please refresh.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs text-brand-400 underline"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Mock Data (gated via demoFallback) ───────────────────────────────────────

const MOCK_METRICS: DashboardMetrics = {
  alerts: {
    total: 1247,
    new: 89,
    critical: 12,
    high: 43,
    medium: 156,
    low: 289,
    resolvedToday: 67,
    mttr: 4.2,
    mttr_sample_count: 34,
  },
  cases: {
    open: 23,
    inProgress: 15,
    resolvedThisWeek: 34,
  },
  sources: [
    { name: 'CrowdStrike EDR', count: 412, status: 'active' },
    { name: 'Microsoft Sentinel', count: 287, status: 'active' },
    { name: 'AWS CloudTrail', count: 198, status: 'active' },
    { name: 'Okta Identity', count: 163, status: 'active' },
    { name: 'Google Workspace', count: 107, status: 'active' },
    { name: 'GitHub Audit', count: 84, status: 'active' },
  ],
  topMitre: [
    { tactic: 'Execution', count: 89 },
    { tactic: 'Defense Evasion', count: 67 },
    { tactic: 'Command & Control', count: 54 },
    { tactic: 'Credential Access', count: 43 },
    { tactic: 'Lateral Movement', count: 38 },
    { tactic: 'Exfiltration', count: 21 },
  ],
  alertsTrend: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(new Date('2026-05-06T12:00:00Z').getTime() - (23 - i) * 3600000).toISOString(),
    count: ((i * 37 + 13) % 80) + 20,
    severity: 'all',
  })),
  threatsBySource: [
    { source: 'CrowdStrike EDR', count: 412 },
    { source: 'Microsoft Sentinel', count: 287 },
    { source: 'AWS CloudTrail', count: 198 },
    { source: 'Okta Identity', count: 163 },
    { source: 'Google Workspace', count: 107 },
    { source: 'GitHub Audit', count: 84 },
  ],
};

// ─── KPI Card (matches mockup .kpi) ───────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor: string;
}

function MetricCard({ label, value, sub, accentColor }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-surface-border bg-surface-card p-[18px] shadow-xs">
      <span
        aria-hidden="true"
        className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-r"
        style={{ background: accentColor }}
      />
      <div className="text-[12px] font-medium text-fg-secondary">{label}</div>
      <div className="mt-1.5 text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-fg-primary tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 text-[11.5px] text-fg-muted flex items-center gap-1.5">
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Honest data-absent panel ─────────────────────────────────────────────────

function PanelUnavailable({
  error,
  pending,
  onRetry,
  emptyTitle,
  emptyDescription,
  action,
}: {
  error?: unknown;
  pending?: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription: string;
  action?: ReactNode;
}) {
  if (error) {
    return (
      <ErrorState
        title="Could not load this panel"
        description="The metrics API did not respond. Nothing is rendered here rather than a placeholder number."
        error={error}
        onRetry={onRetry}
        className="px-4 py-6"
      />
    );
  }
  if (pending) {
    return (
      <EmptyState
        title="Not loaded yet"
        description="Waiting on the metrics API. This panel will say what it found once it answers."
        className="px-4 py-6"
      />
    );
  }
  return (
    <EmptyState
      title={emptyTitle}
      description={emptyDescription}
      action={action}
      className="px-4 py-6"
    />
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function countConnectedSources(
  sources: DashboardMetrics['sources'],
): number {
  return sources.filter((s) => s.status === 'active' || s.count > 0).length;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardView() {
  const { window: timeWindow } = useTimeWindow();
  const [showDeepTelemetry, setShowDeepTelemetry] = useState(false);

  const {
    data: rawMetrics,
    error: metricsError,
    isLoading: metricsLoading,
    mutate: mutateMetrics,
  } = useSWR(
    ['dashboard-metrics', timeWindow],
    () => metricsApi.getDashboard(timeWindow),
    {
      fallbackData: demoFallback(MOCK_METRICS),
      refreshInterval: 60000,
      revalidateOnMount: true,
      revalidateOnFocus: false,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 4000,
    },
  );

  const retryMetrics = useCallback(() => {
    void mutateMetrics();
  }, [mutateMetrics]);

  const metricsErrorMessage =
    metricsError instanceof Error
      ? metricsError.message
      : metricsError
        ? String(metricsError)
        : null;

  const apiData = rawMetrics as Partial<DashboardMetrics> | undefined;
  const metrics: DashboardMetrics | null =
    apiData && typeof apiData.alerts?.total === 'number'
      ? {
          alerts: apiData.alerts,
          cases: apiData.cases ?? { open: 0, inProgress: 0, resolvedThisWeek: 0 },
          sources: apiData.sources ?? [],
          topMitre: apiData.topMitre ?? [],
          alertsTrend: apiData.alertsTrend ?? [],
          threatsBySource: apiData.threatsBySource ?? [],
        }
      : null;

  const metricsPending = metricsLoading || (!metrics && !metricsError);

  const sources = metrics?.sources ?? [];
  const topMitre = metrics?.topMitre ?? [];
  const activeSourceCount = countConnectedSources(sources);

  const periodLabel = TIME_WINDOW_SHORT_LABEL[timeWindow] ?? '';
  const trendTimeFmt =
    timeWindow === '7d' || timeWindow === '30d' ? 'MMM d' : 'HH:mm';
  const trendData = (metrics?.alertsTrend ?? []).map((d) => ({
    time: format(new Date(d.timestamp), trendTimeFmt),
    count: d.count,
  }));

  const SEVERITY_BARS = metrics
    ? [
        { name: 'Critical', value: metrics.alerts.critical, color: 'var(--crit, #f43f5e)' },
        { name: 'High', value: metrics.alerts.high, color: 'var(--high, #f97316)' },
        { name: 'Medium', value: metrics.alerts.medium, color: 'var(--med, #eab308)' },
        { name: 'Low', value: metrics.alerts.low, color: 'var(--low, #38bdf8)' },
        { name: 'Info', value: metrics.alerts.info ?? 0, color: 'var(--info, #94a3b8)' },
      ]
    : [];

  const maxSev = Math.max(...SEVERITY_BARS.map((s) => s.value), 1);
  const maxMitre = Math.max(...topMitre.map((m) => m.count), 1);

  const criticalOpenCount = metrics
    ? (metrics.alerts.criticalActive ?? metrics.alerts.critical)
    : 0;

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4">
        <Suspense fallback={null}>
          <DashboardWelcome />
        </Suspense>

        {metricsErrorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p className="font-semibold">Dashboard metrics unavailable</p>
            <p className="mt-1 text-xs opacity-80">{metricsErrorMessage}</p>
            <p className="mt-1 text-xs opacity-60">
              Panels below are blank rather than showing placeholder figures. Retrying every 4s.
            </p>
          </div>
        )}

        {/* Row 1: Hero Greeting Banner (matches mockup .hero) */}
        <div
          className="rounded-[14px] border border-surface-border p-[22px] flex flex-wrap items-center justify-between gap-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(20, 184, 166, 0.10), rgba(167, 139, 250, 0.07) 60%, var(--surface-card))',
          }}
        >
          <div>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-fg-primary">
              Good morning — here is what needs attention right now.
            </h2>
            <p className="text-[13px] text-fg-secondary mt-1">
              Last {periodLabel || '24h'} across{' '}
              <strong className="font-semibold text-fg-primary">
                {metrics ? activeSourceCount : '—'} connected security sources
              </strong>
              . Everything else is already triaged or routine.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-500/15 text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {metrics ? `${criticalOpenCount} critical open` : '— critical open'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-violet-500/15 text-violet-400">
                <AiSpinner size="xs" state="idle" />
                {metrics
                  ? `${metrics.alerts.resolvedToday ?? 0} resolved today`
                  : 'AI triage ready'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400">
                ● All pipelines healthy
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/alerts"
              className="inline-flex items-center gap-2 rounded-[9px] bg-brand-500 px-3.5 py-[7px] text-[12.5px] font-semibold text-fg-inverse transition-colors hover:bg-brand-400"
            >
              Review critical incidents
            </Link>
            <Link
              href="/hunt"
              className="inline-flex items-center gap-2 rounded-[9px] border border-surface-border bg-surface-raised px-3 py-[7px] text-[12.5px] font-medium text-fg-primary transition-colors hover:bg-surface-hover"
            >
              Start a hunt
            </Link>
            <Link
              href="/playbooks"
              className="inline-flex items-center gap-2 rounded-[9px] border border-surface-border bg-surface-raised px-3 py-[7px] text-[12.5px] font-medium text-fg-primary transition-colors hover:bg-surface-hover"
            >
              Runbooks
            </Link>
          </div>
        </div>

        {/* Row 2: 4 KPI Cards (matches mockup .grid.g4) */}
        <div>
          {metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <MetricCard
                label="Active critical threats"
                value={criticalOpenCount}
                sub={`${metrics.alerts.high} high severity`}
                accentColor="var(--crit, #f43f5e)"
              />
              <MetricCard
                label="Mean time to respond"
                value={
                  metrics.alerts.mttr_sample_count === 0
                    ? '—'
                    : `${metrics.alerts.mttr.toFixed(1)}h`
                }
                sub={
                  metrics.alerts.mttr_sample_count === 0
                    ? 'not measured · no cases closed'
                    : 'Mean time to resolve'
                }
                accentColor="var(--brand-400, #2dd4bf)"
              />
              <MetricCard
                label="Active alerts"
                value={metrics.alerts.active ?? metrics.alerts.total}
                sub={`${metrics.alerts.resolvedToday ?? 0} resolved today · ${metrics.cases.open} open cases`}
                accentColor="var(--ai-accent, #a78bfa)"
              />
              <MetricCard
                label="Sources reporting"
                value={activeSourceCount}
                sub="EDR, SIEM, Cloud, IAM, SaaS"
                accentColor="var(--ok, #10b981)"
              />
            </div>
          ) : (
            <PanelUnavailable
              error={metricsError}
              pending={metricsPending}
              onRetry={retryMetrics}
              emptyTitle="No dashboard metrics yet"
              emptyDescription="Connect a data source to start populating alert, case and MTTR counters."
            />
          )}
        </div>

        {/* Row 3: 2fr / 1fr — Alert volume & Severity mix (matches mockup row 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div className="lg:col-span-2 rounded-[14px] border border-surface-border bg-surface-card p-[18px] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <div className="text-[14px] font-semibold text-fg-primary">
                  Alert volume · ingested vs. AI-triaged
                </div>
                <div className="text-[12px] text-fg-muted mt-0.5">
                  Last {periodLabel} · hourly buckets
                </div>
              </div>
              <div className="flex items-center gap-3.5 text-xs text-fg-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <i className="w-2.5 h-2.5 rounded-xs inline-block bg-brand-400" /> Ingested
                </span>
              </div>
            </div>
            {trendData.length > 0 ? (
              <RechartsArea data={trendData} />
            ) : (
              <PanelUnavailable
                error={metricsError}
                pending={metricsPending}
                onRetry={retryMetrics}
                emptyTitle={`No alerts in the last ${TIME_WINDOW_LONG_LABEL[
                  timeWindow
                ].replace(/^Last /, '')}`}
                emptyDescription="The volume curve plots alert counts once alerts start arriving."
              />
            )}
          </div>

          <div className="rounded-[14px] border border-surface-border bg-surface-card p-[18px] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <div className="text-[14px] font-semibold text-fg-primary">Severity mix</div>
                <div className="text-[12px] text-fg-muted mt-0.5">Open + AI-triaged</div>
              </div>
            </div>
            {metrics ? (
              <div className="flex flex-col gap-3 mt-2">
                {SEVERITY_BARS.map((s) => {
                  const pct = Math.round((s.value / maxSev) * 100);
                  return (
                    <div key={s.name}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="font-medium" style={{ color: s.color }}>
                          {s.name}
                        </span>
                        <span className="font-mono text-fg-muted tabular-nums">{s.value}</span>
                      </div>
                      <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <PanelUnavailable
                error={metricsError}
                pending={metricsPending}
                onRetry={retryMetrics}
                emptyTitle="No severity data"
                emptyDescription="Severity counts appear once the API returns alert metrics."
              />
            )}
          </div>
        </div>

        {/* Row 4: 2fr / 1fr — Needs your attention / Connected sources & Top ATT&CK tactics (matches mockup row 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div className="lg:col-span-2 rounded-[14px] border border-surface-border bg-surface-card p-[18px] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <div className="text-[14px] font-semibold text-fg-primary">
                  Needs your attention &amp; Connected sources
                </div>
                <div className="text-[12px] text-fg-muted mt-0.5">
                  Active telemetry streams feeding incident correlation
                </div>
              </div>
              <Link
                href="/alerts"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-surface-border bg-surface-raised px-2.5 py-1 text-[11.5px] font-medium text-fg-primary hover:bg-surface-hover transition-colors"
              >
                Open all incidents
              </Link>
            </div>

            {sources.length === 0 ? (
              <PanelUnavailable
                error={metricsError}
                pending={metricsPending}
                onRetry={retryMetrics}
                emptyTitle="No sources connected"
                emptyDescription="Connect a data source and its event volume appears here."
                action={
                  <Link
                    href="/settings"
                    className="text-xs text-brand-400 underline underline-offset-2 hover:text-brand-300"
                  >
                    Go to connectors
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-surface-border text-[11px] uppercase tracking-wider text-fg-muted">
                      <th className="py-2 px-2.5 font-semibold">Status</th>
                      <th className="py-2 px-2.5 font-semibold">Connector / Source</th>
                      <th className="py-2 px-2.5 font-semibold">Share</th>
                      <th className="py-2 px-2.5 font-semibold text-right">Events ({periodLabel})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((src) => {
                      const maxCount = Math.max(...sources.map((s) => s.count), 1);
                      const pct = Math.round((src.count / maxCount) * 100);
                      return (
                        <tr
                          key={src.name}
                          className="border-b border-surface-border/60 last:border-b-0 hover:bg-surface-hover/60 transition-colors"
                        >
                          <td className="py-2.5 px-2.5">
                            <span
                              className={clsx(
                                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                src.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-surface-hover text-fg-muted',
                              )}
                            >
                              ● {src.status === 'active' ? 'Healthy' : src.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-medium text-fg-primary">
                            {src.name}
                          </td>
                          <td className="py-2.5 px-2.5 w-40">
                            <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono text-fg-secondary tabular-nums">
                            {src.count}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[14px] border border-surface-border bg-surface-card p-[18px] shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <div className="text-[14px] font-semibold text-fg-primary">
                  Top ATT&amp;CK tactics
                </div>
                <div className="text-[12px] text-fg-muted mt-0.5">
                  Last {periodLabel} detections
                </div>
              </div>
            </div>
            {topMitre.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {topMitre.map((m) => {
                  const pct = Math.round((m.count / maxMitre) * 100);
                  return (
                    <div key={m.tactic}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="text-fg-primary">{m.tactic}</span>
                        <span className="font-mono text-fg-muted tabular-nums">{m.count}</span>
                      </div>
                      <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <PanelUnavailable
                error={metricsError}
                pending={metricsPending}
                onRetry={retryMetrics}
                emptyTitle="No tactic coverage yet"
                emptyDescription="Ranks ATT&CK tactics by alert count. Alerts tagged only with technique IDs are counted under MITRE coverage in SOC Performance instead."
              />
            )}
          </div>
        </div>

        {/* Optional Deep Pipeline & SLA Telemetry Drawer (collapsed by default to keep UI clean) */}
        <div className="pt-2">
          <div className="flex items-center justify-between rounded-[14px] border border-surface-border bg-surface-card px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-fg-primary">
                Pipeline Funnel, Live Stream &amp; SLA Performance
              </span>
              <span className="text-xs text-fg-muted hidden sm:inline">
                Stage latency, agent calibration, and technique coverage
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDeepTelemetry((prev) => !prev)}
              aria-expanded={showDeepTelemetry}
              className="rounded-[9px] border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-fg-secondary hover:bg-surface-hover hover:text-fg-primary transition-colors"
            >
              {showDeepTelemetry ? 'Hide deep telemetry' : 'Show deep telemetry'}
            </button>
          </div>

          {showDeepTelemetry && (
            <div className="space-y-4 mt-4">
              <FunnelKpiBar period={timeWindow} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <EfficiencyReport period={timeWindow} />
                <PipelineHealth />
                <LiveFeedPanel />
              </div>
              <SOCMetricsDashboard />
            </div>
          )}
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
