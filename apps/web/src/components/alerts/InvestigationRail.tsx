'use client';

/**
 * Investigation Rail (v1.5 W6 — SOC console parity).
 *
 * Structured triage panel rendered to the right of the `/alerts` grid
 * whenever an analyst selects a row. The rail consumes the envelope
 * served by `GET /api/v1/alerts/{id}` — which carries four sections
 * the analyst needs at first glance:
 *
 *   1. Narrative — deterministic, Markdown-light explanation of *why*
 *      fusion promoted this alert. Cached on the row at fusion time and
 *      lazily back-filled by the API for legacy alerts so we never
 *      surface a blank panel.
 *   2. Related entities — principal / network / workflow / tenant
 *      groupings. Entries with a `pivotPath` link straight into the
 *      AttackGraphView so analysts can hop from "10.0.0.7" to its
 *      neighbourhood in two clicks instead of switching pages.
 *   3. Mini-timeline — the six most recent case-timeline + audit-log
 *      events for this alert's case, surfaced inline so the analyst
 *      doesn't have to leave the queue just to see what happened last.
 *   4. Recommended actions — ResponderAgent's structured guidance,
 *      normalised server-side so legacy list-of-strings payloads and
 *      the modern `{priority, action, rationale, risk}` shape render
 *      uniformly.
 *
 * A single "Deep Explain" button at the top of the rail still opens the
 * existing {@link ExplainDrawer} for the rich LLM-driven walkthrough —
 * the rail itself is deterministic and cheap so we don't burn an LLM
 * call every time the analyst clicks a row.
 *
 * Author: Beenu Arora <beenu@cyble.com>
 */

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import {
  alertsApi,
  type Alert,
  type BusinessContextRail,
  type MiniTimelineEvent,
  type RecommendedAction,
  type RelatedEntity,
} from '@/lib/api';
import { AttackStory } from './AttackStory';
import { ExplainDrawer } from './ExplainDrawer';
import { NarrativeMarkdown } from './NarrativeMarkdown';
import { L1InvestigationStory } from './L1InvestigationStory';
import { Skeleton } from '@/components/ui/Skeleton';
import { AiSpinner } from '@/components/ui/AiSpinner';

// ─── Visual config ───────────────────────────────────────────────────────────

/**
 * Grouping config for {@link RelatedEntity.kind}.
 *
 * The order of these keys determines the render order inside the rail.
 * "principal" goes first because that's the entity an analyst usually
 * pivots on (who did it / who was hit). "tenant" is last because it's
 * the broadest-context grouping.
 */
const ENTITY_KIND_CONFIG: Record<
  RelatedEntity['kind'],
  { label: string; tone: string }
> = {
  principal: { label: 'Principals', tone: 'text-brand-400' },
  network: { label: 'Network', tone: 'text-cyan-400' },
  workflow: { label: 'Workflow', tone: 'text-violet-400' },
  tenant: { label: 'Tenant', tone: 'text-fg-secondary' },
};

/** Tone map for the priority chip on a recommended action. */
const PRIORITY_TONE: Record<RecommendedAction['priority'], string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-400',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  low: 'border-brand-500/40 bg-brand-500/10 text-brand-400',
  info: 'border-surface-border bg-surface-elevated text-fg-secondary',
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface InvestigationRailProps {
  /** Selected alert id. When `null` the rail renders an empty-state hint. */
  alertId: string | null;
  /** Called when the analyst dismisses the rail (close button). */
  onClose: () => void;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function InvestigationRail({ alertId, onClose }: InvestigationRailProps) {
  const [view, setView] = useState<RailView>('story');
  // The drawer is mounted on demand and closed by default; we don't
  // burn the LLM call until the analyst explicitly asks for it.
  const [deepExplainOpen, setDeepExplainOpen] = useState(false);

  const { data: alert, error, isLoading } = useSWR(
    alertId ? (['alerts', alertId, 'rail'] as const) : null,
    () => alertsApi.get(alertId as string),
    {
      // The rail is supposed to feel like a *snapshot* — the analyst
      // explicitly opens it. We don't want noisy revalidates on tab
      // focus throwing off their reading flow.
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  if (!alertId) {
    return <RailPlaceholder />;
  }

  if (isLoading || (!alert && !error)) {
    return <RailLoading onClose={onClose} />;
  }

  if (error || !alert) {
    return (
      <RailShell title="Investigation rail" onClose={onClose}>
        <div className="px-4 py-6 text-sm text-red-400">
          <p className="font-medium">Couldn&apos;t load the alert envelope.</p>
          <p className="mt-1 text-xs text-fg-muted">
            The alert API didn&apos;t respond. Try selecting the alert again or
            open the full detail view.
          </p>
        </div>
      </RailShell>
    );
  }

  return (
    <>
      <RailShell title={alert.title} onClose={onClose}>
        <RailHeader
          alert={alert}
          deepExplainOpen={deepExplainOpen}
          onDeepExplain={() => setDeepExplainOpen(true)}
        />
        {/*
         * Story first, detail behind a toggle. An analyst holds "what
         * happened" in their head, not "what fields does this row have" —
         * and the fields are still one click away, which is the right
         * trade in the direction nobody was offering.
         */}
        <ViewToggle view={view} onChange={setView} />
        {view === 'story' ? (
          <div className="p-4 space-y-5">
            <L1InvestigationStory alert={alert} />
            <AttackStory alert={alert} showHeader={false} />
          </div>
        ) : (
          <>
            <AutomatedTriageSection alert={alert} />
            <SourceAddressClassSection alert={alert} />
            <BusinessContextSection ctx={alert.businessContext ?? null} />
            <NarrativeSection narrative={alert.narrative ?? null} />
            <RelatedEntitiesSection entities={alert.relatedEntities ?? []} />
            <MiniTimelineSection events={alert.miniTimeline ?? []} />
            <RecommendedActionsSection actions={alert.recommendedActions ?? []} />
          </>
        )}
      </RailShell>
      {/*
       * Deep Explain is mounted only when requested — keeping it inside the
       * rail (rather than at AlertsView level) means the rail owns the
       * "deep" affordance and we don't end up with two ways to open the
       * same drawer from different places.
       */}
      {deepExplainOpen && (
        <ExplainDrawer
          open={true}
          alert={alert}
          onClose={() => setDeepExplainOpen(false)}
        />
      )}
    </>
  );
}

/** Which face of the rail is showing. */
type RailView = 'story' | 'details';

function ViewToggle({
  view,
  onChange,
}: {
  view: RailView;
  onChange: (next: RailView) => void;
}) {
  const tabs: { id: RailView; label: string }[] = [
    { id: 'story', label: 'Story' },
    { id: 'details', label: 'Details' },
  ];
  return (
    <div
      className="flex gap-1 border-b border-surface-border px-4 py-2 bg-surface-card"
      role="tablist"
      aria-label="Investigation view"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={view === tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            view === tab.id
              ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
              : 'text-fg-muted hover:bg-surface-elevated hover:text-fg-primary',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Layout primitives ───────────────────────────────────────────────────────

function RailShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside
      className="flex flex-col bg-surface-card border border-surface-border rounded-xl overflow-hidden h-full shadow-sm"
      aria-label="Investigation rail"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-elevated/60">
        <h2 className="text-sm font-semibold text-fg-primary truncate" title={title}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close investigation rail"
          className="text-xs text-fg-muted hover:text-fg-primary px-2 py-0.5 rounded hover:bg-surface-elevated transition-colors"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}

function RailPlaceholder() {
  return (
    <aside
      className="flex flex-col items-center justify-center bg-surface-card/60 border border-dashed border-surface-border rounded-xl text-fg-muted text-sm h-full p-6 text-center"
      aria-label="Investigation rail (no alert selected)"
    >
      <p className="font-medium text-fg-secondary">Select an alert to investigate</p>
      <p className="mt-1 text-xs text-fg-muted">
        Click a row in the queue on the left. The rail will show the fusion
        narrative, related entities, recent events, and recommended actions.
      </p>
    </aside>
  );
}

function RailLoading({ onClose }: { onClose: () => void }) {
  return (
    <RailShell title="Loading…" onClose={onClose}>
      <div className="p-4 space-y-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
        <div className="pt-3 space-y-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/4" />
        </div>
      </div>
    </RailShell>
  );
}

// ─── Header (severity, status, deep explain) ─────────────────────────────────

function RailHeader({
  alert,
  deepExplainOpen,
  onDeepExplain,
}: {
  alert: Alert;
  deepExplainOpen?: boolean;
  onDeepExplain: () => void;
}) {
  return (
    // Labelled as a region so the summary metadata is addressable on its
    // own. The source and severity also appear inside the story's evidence
    // list, which is correct in both places but ambiguous without a
    // landmark to distinguish them.
    <div
      className="px-4 py-3 border-b border-surface-border bg-surface-elevated/40"
      role="region"
      aria-label="Alert summary"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span className="capitalize text-fg-primary font-medium">{alert.severity}</span>
        <span>·</span>
        <span className="capitalize">{alert.status.replace('_', ' ')}</span>
        <span>·</span>
        <span>{alert.source}</span>
        <span>·</span>
        <span suppressHydrationWarning>
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
        </span>
        {typeof alert.riskScore === 'number' && (
          <>
            <span>·</span>
            <span className="font-mono text-fg-secondary">
              {/* `normalizeAlert` already resolves this to a 0-100 integer.
                  The rounding here used to be the only thing standing between
                  a raw 0.85 and the page, and it printed "risk 1". */}
              risk {alert.riskScore}
            </span>
          </>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onDeepExplain}
          aria-label="Open AI deep explain drawer"
          title="Run the LLM deep-explain for this alert"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/60 transition-colors"
        >
          <AiSpinner size="xs" state={deepExplainOpen ? 'busy' : 'idle'} />
          <span>Deep Explain</span>
        </button>
        <Link
          href={`/alerts/${alert.id}`}
          className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Open full detail →
        </Link>
      </div>
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h3 className="text-[11px] uppercase tracking-wider text-fg-muted mb-2 font-medium">
      {title}
      {typeof count === 'number' && (
        <span className="ml-1.5 text-fg-subtle">({count})</span>
      )}
    </h3>
  );
}

/**
 * What the auto-triage agent concluded, and how far to trust it.
 *
 * `services/agents` triages every fused alert and writes the verdict back to
 * the row. Nothing rendered it: `normalizeAlert` dropped `ai_score`,
 * `ai_summary` and `triage_groundedness` on the floor, so the product's
 * headline capability produced tokens, cost and a ledger entry that no
 * console surface showed.
 *
 * Three things are deliberate here.
 *
 * The rationale is rendered **verbatim**. The model's own text arrives
 * prefixed `LLM auto-triage verdict:`; the deterministic fallback reads as a
 * description of the signals it matched. Showing it unedited is what lets a
 * reader tell which path answered, and the bundled local model falls back
 * often enough that the distinction matters on a default install.
 *
 * Groundedness renders as **"not assessed"** when the column is null, never
 * as 0. The deterministic path does not score it, and 0 would read as a
 * verdict citing nothing real.
 *
 * An alert that has not been triaged yet says so, rather than rendering
 * nothing — absent and pending are different facts, and only one of them is
 * a reason to go and look at the agents service.
 */
function AutomatedTriageSection({ alert }: { alert: Alert }) {
  const verdict = alert.disposition ?? null;
  const rationale = (alert.aiSummary ?? '').trim();
  const hasRun = Boolean(verdict || rationale || typeof alert.aiScore === 'number');

  return (
    <section className="px-4 py-4 border-b border-surface-border">
      <div className="flex items-center gap-2 mb-2">
        <AiSpinner size="xs" state={hasRun ? 'done' : 'idle'} />
        <h3 className="text-[11px] uppercase tracking-wider text-fg-muted font-medium">
          Automated triage
        </h3>
      </div>
      {!hasRun ? (
        <p className="text-xs text-fg-muted">
          Not triaged yet. Every fused alert is queued for the triage agent; if this stays empty,
          check the agents service.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {verdict && (
              <span className="text-xs px-2 py-0.5 rounded border border-surface-border bg-surface-elevated text-fg-primary">
                {verdict.replace(/_/g, ' ')}
              </span>
            )}
            {typeof alert.aiScore === 'number' && (
              <span className="text-xs text-fg-secondary">
                confidence {Math.round(alert.aiScore * 100)}/100
              </span>
            )}
            <span className="text-xs text-fg-muted">
              groundedness{' '}
              {typeof alert.triageGroundedness === 'number'
                ? `${Math.round(alert.triageGroundedness * 100)}%`
                : 'not assessed'}
            </span>
          </div>
          {rationale && (
            <p className="text-xs text-fg-secondary leading-relaxed whitespace-pre-wrap">{rationale}</p>
          )}
          {alert.triageUngrounded && alert.triageUngrounded.length > 0 && (
            <p className="text-xs text-amber-400">
              Cited but not present in the evidence: {alert.triageUngrounded.join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * What the pinned ingest dataset said about the source address.
 *
 * Rendered only when there is something to say. An alert whose address the
 * dataset has never seen gets no section at all, deliberately: three of the
 * five classes ship with no records because no redistributable source for
 * them exists, so "no class" is the ordinary answer and a chip reading "not
 * an anonymizer" would be a reassurance the data cannot support.
 *
 * The dataset version sits beside the class for the same reason it is a
 * column rather than an inference: the dataset is refreshed, an address
 * changes class over time, and an analyst reading an old alert has to be
 * able to tell a reclassification from a change in behaviour.
 */
function SourceAddressClassSection({ alert }: { alert: Alert }) {
  if (!alert.srcIpClass) return null;
  // A value outside the closed set renders as nothing rather than as an
  // unlabelled chip. `normalizeAlert` already drops unknown classes, so this
  // only fires for an envelope that reached the component another way, and
  // an unexplained class on a security surface is worse than silence.
  const cfg = IP_CLASS_CONFIG[alert.srcIpClass];
  if (!cfg) return null;
  return (
    <section className="px-4 py-4 border-b border-surface-border">
      <SectionHeader title="Source address" />
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={clsx(
            'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
            cfg.tone,
          )}
        >
          {cfg.label}
        </span>
        {alert.srcIpClassDatasetVersion && (
          <span className="text-[11px] text-fg-muted">
            dataset {alert.srcIpClassDatasetVersion}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-fg-muted">{cfg.detail}</p>
    </section>
  );
}

const IP_CLASS_CONFIG: Record<
  NonNullable<Alert['srcIpClass']>,
  { label: string; tone: string; detail: string }
> = {
  tor_exit: {
    label: 'Tor exit relay',
    tone: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30',
    detail: 'The address is published as a Tor exit relay. The originating network is not observable.',
  },
  vpn: {
    label: 'VPN exit',
    tone: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
    detail: 'The address is on a list of VPN exit nodes supplied by this tenant.',
  },
  public_proxy: {
    label: 'Public proxy',
    tone: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
    detail: 'The address is on a list of open proxies supplied by this tenant.',
  },
  residential_proxy: {
    label: 'Residential proxy',
    tone: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/30',
    detail: 'The address is on a list of residential proxy exits supplied by this tenant.',
  },
  hosting_provider: {
    label: 'Hosting provider',
    tone: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30',
    detail: 'The address belongs to a cloud or hosting range, not to a consumer network.',
  },
};

function NarrativeSection({ narrative }: { narrative: string | null }) {
  if (!narrative || !narrative.trim()) return null;
  // `build_narrative` emits a markdown-light dialect. Preserving newlines in a
  // `whitespace-pre-wrap` paragraph preserved the *markup* too, so the rail
  // showed analysts "**Medium** alert: … on **Finance & Legal #2**". The
  // renderer covers that dialect and escapes everything, which matters because
  // the narrative embeds attacker-influenceable entity names.
  return (
    <section className="px-4 py-4 border-b border-surface-border">
      <SectionHeader title="Narrative" />
      <NarrativeMarkdown source={narrative} />
    </section>
  );
}

function RelatedEntitiesSection({ entities }: { entities: RelatedEntity[] }) {
  if (entities.length === 0) return null;
  // Server already groups by kind in the canonical order, but defensively
  // re-group on the client so an out-of-order payload (older API) still
  // renders cleanly grouped.
  const grouped = entities.reduce<Record<RelatedEntity['kind'], RelatedEntity[]>>(
    (acc, e) => {
      (acc[e.kind] ||= []).push(e);
      return acc;
    },
    { principal: [], network: [], workflow: [], tenant: [] },
  );
  return (
    <section className="px-4 py-4 border-b border-surface-border">
      <SectionHeader title="Related entities" count={entities.length} />
      <div className="space-y-3">
        {(Object.keys(ENTITY_KIND_CONFIG) as Array<keyof typeof ENTITY_KIND_CONFIG>).map(
          (kind) => {
            const items = grouped[kind];
            if (!items || items.length === 0) return null;
            const cfg = ENTITY_KIND_CONFIG[kind];
            return (
              <div key={kind}>
                <p className={clsx('text-xs font-medium', cfg.tone)}>{cfg.label}</p>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {items.map((e) => (
                    <EntityChip key={`${e.type}:${e.value}`} entity={e} />
                  ))}
                </ul>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}

function EntityChip({ entity }: { entity: RelatedEntity }) {
  const display = entity.label || entity.value;
  const inner = (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border border-surface-border bg-surface-elevated text-fg-primary',
        entity.pivotPath &&
          'hover:bg-brand-500/10 hover:border-brand-500/40 cursor-pointer transition-colors',
      )}
      title={`${entity.type}: ${entity.value}`}
    >
      <span className="text-fg-muted font-mono text-[10px]">{entity.type}</span>
      <span className="font-mono">{display}</span>
    </span>
  );
  return (
    <li>
      {entity.pivotPath ? (
        <Link href={entity.pivotPath} className="inline-block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}

function MiniTimelineSection({ events }: { events: MiniTimelineEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="px-4 py-4 border-b border-surface-border">
      <SectionHeader title="Recent events" count={events.length} />
      <ol className="space-y-2.5">
        {events.map((e) => (
          <TimelineRow key={e.id} event={e} />
        ))}
      </ol>
    </section>
  );
}

function TimelineRow({ event }: { event: MiniTimelineEvent }) {
  let ts: string;
  try {
    ts = format(new Date(event.timestamp), 'MMM d HH:mm');
  } catch {
    // Defensive: if the server hands back a malformed timestamp we still
    // render the row rather than crashing the rail.
    ts = event.timestamp;
  }
  return (
    <li className="text-xs text-fg-secondary border-l-2 border-surface-border pl-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-fg-muted text-[10px]" suppressHydrationWarning>
          {ts}
        </span>
        <span className="px-1.5 py-0 text-[10px] font-mono rounded border border-surface-border bg-surface-elevated text-fg-muted uppercase">
          {event.source === 'case_timeline' ? 'case' : 'audit'}
        </span>
        <span className="text-[10px] uppercase text-fg-muted tracking-wide">
          {event.type}
        </span>
      </div>
      <p className="mt-0.5 text-fg-primary">{event.title}</p>
      {event.description && (
        <p className="mt-0.5 text-fg-muted line-clamp-2">{event.description}</p>
      )}
      {event.actor && (
        <p className="mt-0.5 text-[10px] text-fg-subtle">by {event.actor}</p>
      )}
    </li>
  );
}

function BusinessContextSection({ ctx }: { ctx: BusinessContextRail | null }) {
  // Null means no tenant rule fired on this alert (or it predates the field).
  // Render nothing rather than an empty shell — absence here is honest
  // absence, not a measurement of zero.
  if (!ctx || ctx.matchedRuleIds.length === 0) return null;
  const mutated =
    ctx.severityBefore && ctx.severityAfter && ctx.severityBefore !== ctx.severityAfter;
  return (
    <section className="px-4 py-4 border-t border-surface-border">
      <SectionHeader title="Business context" count={ctx.matchedRuleIds.length} />
      <div className="border border-surface-border bg-surface-elevated/40 rounded-lg p-2.5 space-y-1.5">
        <p className="text-xs text-fg-secondary">
          Tenant rules applied before triage:{' '}
          <span className="font-mono text-fg-primary">{ctx.matchedRuleIds.join(', ')}</span>
        </p>
        {mutated && (
          <p className="text-xs text-fg-secondary">
            Severity{' '}
            <span className="font-mono text-fg-primary">{ctx.severityBefore}</span>
            {' → '}
            <span className="font-mono text-amber-400">{ctx.severityAfter}</span>
          </p>
        )}
        {ctx.impactStatement && (
          <p className="text-sm text-fg-primary">
            {ctx.impactStatement}
            {ctx.impactCitations.length > 0 && (
              <span className="ml-1 text-[10px] font-mono text-fg-muted">
                [cites: {ctx.impactCitations.join(', ')}]
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}

function RecommendedActionsSection({ actions }: { actions: RecommendedAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section className="px-4 py-4">
      <SectionHeader title="Recommended actions" count={actions.length} />
      <ul className="space-y-2">
        {actions.map((a, idx) => (
          <li
            key={`${a.action}-${idx}`}
            className="border border-surface-border bg-surface-elevated/40 rounded-lg p-2.5"
          >
            <div className="flex items-start gap-2">
              <span
                className={clsx(
                  'text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5',
                  PRIORITY_TONE[a.priority] ?? PRIORITY_TONE.medium,
                )}
              >
                {a.priority}
              </span>
              <p className="text-sm text-fg-primary flex-1">{a.action}</p>
            </div>
            {a.rationale && (
              <p className="mt-1 text-xs text-fg-muted ml-[3.25rem]">
                {a.rationale}
              </p>
            )}
            {a.risk && (
              <p className="mt-1 text-xs text-amber-400 ml-[3.25rem]">
                Risk: {a.risk}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
