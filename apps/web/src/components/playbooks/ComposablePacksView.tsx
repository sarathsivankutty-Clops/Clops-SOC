'use client';

/**
 * ComposablePacksView Component
 * =============================
 * Displays the 9 modular internal pack types grouped into the 3 clean studio categories:
 * 1. 🔍 Investigation (Evidence, Questions, Reasoning, Hypotheses)
 * 2. ⚡ Response (Actions, Verification, Rollback)
 * 3. 🛡 Governance (Policies, Risk, Approvals, Escalation)
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { clsx } from 'clsx';
import { apiFetch } from '@/lib/api';
import { AiSpinner } from '@/components/ui/AiSpinner';

const fetcher = (url: string) =>
  apiFetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });

export function ComposablePacksView() {
  const { data, isLoading } = useSWR('/api/v1/playbooks/packs-catalog', fetcher);
  const [activeCategory, setActiveCategory] = useState<'all' | 'investigation' | 'response' | 'governance'>('all');

  const categories = data?.categories;
  const packs: any[] = data?.packs ?? [];

  const filteredPacks = activeCategory === 'all'
    ? packs
    : packs.filter((p) => p.visible_category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Pills Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All Packs (${packs.length})` },
              { id: 'investigation', label: '🔍 1. Investigation' },
              { id: 'response', label: '⚡ 2. Response' },
              { id: 'governance', label: '🛡 3. Governance' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategory(c.id)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeCategory === c.id
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/35 font-semibold'
                  : 'text-fg-muted hover:bg-surface-elevated hover:text-fg-primary border border-transparent',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-fg-muted font-mono">
          9 Modular Pack Types · 3 Human Categories
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center">
          <AiSpinner size="md" state="busy" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPacks.map((pack) => (
            <div
              key={pack.pack_id}
              className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-3 shadow-xs hover:border-surface-border/80 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={clsx(
                      'rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider',
                      pack.visible_category === 'investigation'
                        ? 'bg-sky-500/15 text-sky-400'
                        : pack.visible_category === 'response'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-violet-500/15 text-violet-300',
                    )}
                  >
                    {pack.visible_category}
                  </span>
                  <span className="font-mono text-[10.5px] text-fg-muted">
                    v{pack.version} · {pack.reused_in_blueprints} Blueprints
                  </span>
                </div>

                <h4 className="text-[14px] font-semibold text-fg-primary leading-tight">
                  {pack.title}
                </h4>
                <p className="text-[12px] text-fg-secondary leading-relaxed line-clamp-2">
                  {pack.description}
                </p>

                {pack.human_summary && pack.human_summary.length > 0 && (
                  <div className="rounded-lg border border-surface-border/50 bg-surface-base p-2.5 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                      What it does:
                    </div>
                    <ul className="space-y-0.5 text-[11px] text-fg-secondary list-disc pl-3.5">
                      {pack.human_summary.slice(0, 2).map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between text-[11px]">
                <span className="font-mono text-fg-muted">{pack.pack_id}</span>
                <span className="text-brand-400 hover:underline cursor-pointer">
                  Inspect Pack →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
