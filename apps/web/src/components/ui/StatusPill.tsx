/**
 * T3.8 — AiSOC console StatusPill primitive.
 *
 * Compact status indicator with an animated dot for live states. Used
 * in the runs panel, connector cards, ingest health bar, etc.
 */
import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export type StatusKind =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unknown';

// [HIDDEN-UI P3 badge-dot-tint] Original bordered metadata kept for restore:
// pending: 'text-yellow-300 bg-yellow-900/30 border-yellow-800'; running: 'text-brand-300 bg-blue-900/30 border-blue-800';
// completed: 'text-green-300 bg-green-900/30 border-green-800'; failed: 'text-red-300 bg-red-900/30 border-red-800';
// cancelled: 'text-fg-secondary bg-surface-sunken border-surface-border-strong'; unknown: 'text-fg-muted bg-surface-sunken/60 border-surface-border'.
const STATUS_META: Record<StatusKind, { label: string; classes: string; pulse: boolean }> = {
  pending: { label: 'Pending', classes: 'text-[var(--co-am)] bg-[var(--co-pill-am)]', pulse: false },
  running: { label: 'Running', classes: 'text-[var(--co-ac)] bg-[var(--co-pill-ac)]', pulse: true },
  completed: { label: 'Completed', classes: 'text-[var(--co-g)] bg-[var(--co-pill-g)]', pulse: false },
  failed: { label: 'Failed', classes: 'text-[var(--co-r)] bg-[var(--co-pill-r)]', pulse: false },
  cancelled: { label: 'Cancelled', classes: 'text-[var(--co-m)] bg-[var(--co-pill-na)]', pulse: false },
  unknown: { label: 'Unknown', classes: 'text-[var(--co-m)] bg-[var(--co-pill-na)]', pulse: false },
};

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusKind;
  /** Override the rendered label (defaults to the canonical name). */
  label?: string;
}

export function StatusPill({ status, label, className, ...rest }: StatusPillProps) {
  const meta = STATUS_META[status];
  return (
    <span
      className={clsx(
        // [HIDDEN-UI P3 badge-dot-tint] was: '... rounded-full border px-2 ...'
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        meta.classes,
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'h-1.5 w-1.5 rounded-full bg-current',
          meta.pulse && 'animate-pulse',
        )}
      />
      {label ?? meta.label}
    </span>
  );
}
