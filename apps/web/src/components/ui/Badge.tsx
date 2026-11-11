/**
 * T3.8 — AiSOC console Badge primitive.
 *
 * The console scatters ~30 inline ``<span class="text-xs ...">`` badges
 * with subtly different palettes. This component codifies the five
 * semantic tones we actually use (info / success / warning / danger /
 * neutral) plus the AiSOC-specific severity tones (low / medium / high
 * / critical) that mirror the OCSF severity ladder.
 *
 * Use this anywhere you would have inlined a label pill: alert
 * severity, run status, MITRE tactic, connector mode, etc.
 */
import { clsx } from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'severity-info'
  | 'severity-low'
  | 'severity-medium'
  | 'severity-high'
  | 'severity-critical';

// [HIDDEN-UI P3 badge-dot-tint] Original bordered, dark-only tones kept for restore:
// const TONE_CLASSES_BORDERED: Record<BadgeTone, string> = {
//   neutral: 'bg-surface-hover text-fg-secondary border-surface-border-strong',
//   info: 'bg-blue-900/40 text-brand-300 border-blue-800',
//   success: 'bg-green-900/40 text-green-300 border-green-800',
//   warning: 'bg-amber-900/40 text-amber-200 border-amber-800',
//   danger: 'bg-red-900/40 text-red-300 border-red-800',
//   'severity-info': 'bg-surface-elevated text-fg-secondary border-surface-border-strong',
//   'severity-low': 'bg-blue-900/40 text-brand-300 border-blue-800',
//   'severity-medium': 'bg-amber-900/40 text-amber-200 border-amber-800',
//   'severity-high': 'bg-orange-900/50 text-orange-300 border-orange-800',
//   'severity-critical': 'bg-red-900/60 text-red-200 border-red-700',
// };
// Soft tint + coloured text from the theme-aware reference pill tokens (--co-pill-*, --co-*).
const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--co-pill-na)] text-[var(--co-m)]',
  info: 'bg-[var(--co-pill-ac)] text-[var(--co-ac)]',
  success: 'bg-[var(--co-pill-g)] text-[var(--co-g)]',
  warning: 'bg-[var(--co-pill-am)] text-[var(--co-am)]',
  danger: 'bg-[var(--co-pill-r)] text-[var(--co-r)]',
  'severity-info': 'bg-[var(--co-pill-na)] text-[var(--co-m)]',
  'severity-low': 'bg-[var(--co-pill-ac)] text-[var(--co-ac)]',
  'severity-medium': 'bg-[var(--co-pill-am)] text-[var(--co-am)]',
  // [HIDDEN-UI FIX severity-split] was: 'bg-[var(--co-pill-am)] text-[var(--co-am)]' (identical to medium)
  'severity-high': 'bg-[var(--sev-high-bg)] text-[var(--sev-high-fg)]',
  'severity-critical': 'bg-[var(--co-pill-r)] text-[var(--co-r)]',
};
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Small dot on the left, common for status indicators. */
  dot?: boolean;
}

export function Badge({
  tone = 'neutral',
  icon,
  dot,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={clsx(
        // [HIDDEN-UI P3 badge-dot-tint] was: 'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...rest}
    >
      {/* [P3] dot is now always shown (pill = 6px dot + soft tint); `dot` prop kept for API compatibility */}
      {(dot ?? true) && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      )}
      {icon}
      {children}
    </span>
  );
}
