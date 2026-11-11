'use client';

import React from 'react';

export interface KpiItem {
  l: string;               // Label
  v: string;               // Value
  s?: string;              // Subtitle / Status text
  c?: 'ok' | 'warn' | 'bad' | 'info' | ''; // Color class
  t?: string;              // Secondary / Trend comparison meta
  kind?: string;           // Optional identifier
  act?: boolean;           // Whether clickable
  trend?: {
    d: 'up' | 'down' | 'flat';
    x: string;
    good?: boolean;
  };
}

export function KpiCard({ k, onClick }: { k: KpiItem; onClick?: (kind?: string) => void }) {
  const clickable = !!k.act || !!onClick;
  return (
    <div
      className={`co-kpi ${clickable ? 'cursor-pointer hover:bg-surface-hover/60 transition-colors' : ''}`}
      {...(clickable ? { role: 'button', tabIndex: 0, onClick: () => onClick?.(k.kind) } : {})}
    >
      <div className="co-kpi-l">{k.l}</div>
      <div className="co-kpi-v">{k.v}</div>
      <div className="co-kpi-s">
        {k.trend && (
          <span
            className={`inline-flex items-center gap-1 font-semibold text-xs ${
              k.trend.good === true
                ? 'text-emerald-500'
                : k.trend.good === false
                ? 'text-rose-500'
                : 'text-fg-muted'
            }`}
          >
            {k.trend.d === 'up' ? '↑' : k.trend.d === 'down' ? '↓' : '→'} {k.trend.x}
          </span>
        )}
        <span
          className={`co-kpi-status ${
            k.c === 'ok'
              ? 'text-emerald-500'
              : k.c === 'warn'
              ? 'text-amber-500'
              : k.c === 'bad'
              ? 'text-rose-500'
              : 'text-fg-secondary'
          }`}
        >
          {k.s}
        </span>
      </div>
      {k.t ? <div className="co-kpi-meta text-xs text-fg-muted">{k.t}</div> : null}
    </div>
  );
}

export function MetricStrip({
  items,
  cols = 4,
  onCardClick,
}: {
  items: KpiItem[];
  cols?: number;
  onCardClick?: (kind?: string) => void;
}) {
  const colClass = cols === 5 ? 'c5' : cols === 3 ? 'c3' : 'c4';
  return (
    <div className={`co-metrics ${colClass}`}>
      {items.map((k, i) => (
        <KpiCard key={i} k={k} onClick={onCardClick} />
      ))}
    </div>
  );
}

export function PageHead({
  title,
  desc,
  actions,
  eyebrow,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="co-page-head">
      <div>
        {eyebrow ? <div className="co-eyebrow">{eyebrow}</div> : null}
        <h1 className="co-page-title">{title}</h1>
        {desc ? <p className="co-page-desc">{desc}</p> : null}
      </div>
      {actions ? <div className="co-page-actions">{actions}</div> : null}
    </div>
  );
}

export interface FeedEvent {
  body: string;
  time?: string;
  col?: string;
  ab?: string;
  badge?: { l: string; c?: string };
}

export function FeedItem({ f }: { f: FeedEvent }) {
  const col = f.col || '#3b82f6';
  const ab = f.ab || 'AI';
  return (
    <div className="co-feed-item">
      <div
        className="co-feed-dot"
        style={{
          background: `${col}22`,
          color: col,
          border: `1px solid ${col}44`,
        }}
      >
        {ab}
      </div>
      <div className="co-feed-body">
        <div className="font-normal text-fg-secondary">{f.body}</div>
        {f.time ? (
          <div className="co-feed-time">
            {f.time}
            {f.badge ? (
              <>
                {' '}· <span className="co-badge ok">{f.badge.l}</span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="co-feed-line" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4 border border-surface-border rounded-xl bg-surface-card">
      <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center mb-3">
        <svg
          aria-hidden="true"
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <h3 className="font-semibold text-fg-primary text-base mb-1">{title}</h3>
      <p className="text-xs text-fg-muted max-w-md mx-auto mb-4">{body}</p>
      {action}
    </div>
  );
}
