'use client';

/**
 * ThreeCategoryRunbookCard Component
 * ===================================
 * Renders a Runbook Blueprint or Playbook using the 3 human-friendly categories:
 * 1. 🔍 Investigation (Questions AI Asks, Evidence, Hypotheses)
 * 2. ⚡ Response (Actions, Automated Verification, 1-Click Rollback)
 * 3. 🛡 Governance (Autonomy Policies, Blast Radius, Escalation Paths)
 *
 * Designed to eliminate cognitive overwhelm for SOC L1 analysts while preserving
 * underlying modular pack architecture.
 */

import React from 'react';
import { clsx } from 'clsx';

export interface CategoryInvestigation {
  questions: string[];
  evidence_sources?: string[];
  competing_explanations?: string[];
  internal_packs?: string[];
}

export interface CategoryResponse {
  actions: string[];
  verification_checks?: string[];
  rollback_steps?: string[];
  reversible?: boolean;
  internal_packs?: string[];
}

export interface CategoryGovernance {
  approval_policy: string;
  confidence_threshold?: number;
  blast_radius_ceiling?: string;
  escalation_path: string;
  internal_packs?: string[];
}

export interface ThreeCategoryViewData {
  investigation: CategoryInvestigation;
  response: CategoryResponse;
  governance: CategoryGovernance;
}

export interface ThreeCategoryRunbookCardProps {
  id: string;
  title: string;
  subtitle?: string;
  domain?: string;
  targetTimeSeconds?: number;
  avgConfidence?: number;
  categoriesView: ThreeCategoryViewData;
  onRun?: () => void;
  onEdit?: () => void;
}

export function ThreeCategoryRunbookCard({
  id,
  title,
  subtitle,
  domain = 'Identity',
  targetTimeSeconds = 30,
  avgConfidence = 89,
  categoriesView,
  onRun,
  onEdit,
}: ThreeCategoryRunbookCardProps) {
  const { investigation, response, governance } = categoriesView;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 space-y-4 shadow-xs hover:border-surface-border/80 transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-brand-300">
              {domain}
            </span>
            <span className="font-mono text-[11px] text-fg-muted">{id}</span>
            <span className="text-[11px] text-fg-muted">
              · Target L1 Triage: &lt;{targetTimeSeconds}s
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-fg-primary leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] text-fg-secondary mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {avgConfidence && (
            <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-1 font-mono text-[11px] text-violet-300 font-semibold">
              Avg RCA: {avgConfidence}%
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-surface-border bg-surface-base px-2.5 py-1 text-xs font-medium text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated transition-colors"
            >
              Configure
            </button>
          )}
          {onRun && (
            <button
              type="button"
              onClick={onRun}
              className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-fg-inverse hover:bg-brand-400 transition-colors shadow-xs"
            >
              Run {/* [HIDDEN-UI D2 ICN-PB-02 removed arrow glyph] */}
            </button>
          )}
        </div>
      </div>

      {/* 3 Clean Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-1">
        {/* Category 1: Investigation */}
        <div className="rounded-lg border border-surface-border/70 bg-surface-base p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
            {/* [HIDDEN-UI D2 ICN-PB-03 hide emoji badge] */}
            {/* <span>🔍</span> */}
            <span className="uppercase tracking-wider text-[11px]">1. Investigation</span>
          </div>
          <div className="text-[11px] font-medium text-fg-muted">
            Questions AI Asks:
          </div>
          <ul className="space-y-1 text-[11.5px] text-fg-primary">
            {investigation.questions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold shrink-0">✔</span>
                <span className="leading-tight">{q}</span>
              </li>
            ))}
          </ul>
          {investigation.competing_explanations && (
            <div className="pt-1 border-t border-surface-border/40 text-[10.5px] text-fg-muted">
              <strong>Tests:</strong>{' '}
              {investigation.competing_explanations.join(' vs. ')}
            </div>
          )}
        </div>

        {/* Category 2: Response */}
        <div className="rounded-lg border border-surface-border/70 bg-surface-base p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            {/* [HIDDEN-UI D2 ICN-PB-03 hide emoji badge] */}
            {/* <span>⚡</span> */}
            <span className="uppercase tracking-wider text-[11px]">2. Response</span>
          </div>
          <div className="text-[11px] font-medium text-fg-muted">
            Governed Actions:
          </div>
          <ul className="space-y-1 text-[11.5px] text-fg-primary">
            {response.actions.map((act, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold shrink-0">▸</span>
                <span className="leading-tight">{act}</span>
              </li>
            ))}
          </ul>
          <div className="pt-1 border-t border-surface-border/40 space-y-1 text-[10.5px] text-fg-muted">
            <div>
              <strong className="text-fg-secondary">Verification (+60s):</strong>{' '}
              {response.verification_checks?.[0] || 'Confirm risk state cleared.'}
            </div>
            <div>
              <strong className="text-fg-secondary">Rollback:</strong>{' '}
              {response.rollback_steps?.[0] || '1-Click Undo available.'}
            </div>
          </div>
        </div>

        {/* Category 3: Governance */}
        <div className="rounded-lg border border-surface-border/70 bg-surface-base p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400">
            {/* [HIDDEN-UI D2 ICN-PB-03 hide emoji badge] */}
            {/* <span>🛡</span> */}
            <span className="uppercase tracking-wider text-[11px]">3. Governance</span>
          </div>
          <div className="text-[11px] font-medium text-fg-muted">
            Approval Policy:
          </div>
          <p className="text-[11.5px] text-fg-primary leading-tight">
            {governance.approval_policy}
          </p>
          <div className="pt-1 border-t border-surface-border/40 space-y-1 text-[10.5px] text-fg-muted">
            <div>
              <strong className="text-fg-secondary">Blast Radius:</strong>{' '}
              {governance.blast_radius_ceiling || 'Single entity (0 shared databases)'}
            </div>
            <div>
              <strong className="text-fg-secondary">Escalation:</strong>{' '}
              {governance.escalation_path}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
