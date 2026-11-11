import { clsx } from 'clsx';

export type AiSpinnerState = 'idle' | 'busy' | 'done';
export type AiSpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

export interface AiSpinnerProps {
  /**
   * Controls rotation speed:
   * - `idle`: calm, slow ambient counter-rotation (default)
   * - `busy`: rapid counter-rotation when an AI investigation/query is running
   * - `done`: static rings at rest once analysis completes
   */
  state?: AiSpinnerState;
  size?: AiSpinnerSize;
  /** Inherit `currentColor` instead of the coral/orange ring tokens (useful inside solid buttons). */
  monochrome?: boolean;
  className?: string;
  label?: string;
}

const SIZE_CLASSES: Record<AiSpinnerSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

/**
 * Dual-ring counter-rotating AI indicator used across the console for
 * manual AI deep-dive triggers, investigation status banners, and Copilot.
 */
export function AiSpinner({
  state = 'idle',
  size = 'md',
  monochrome = false,
  className,
  label,
}: AiSpinnerProps) {
  const outerStroke = monochrome ? 'currentColor' : 'var(--spin-outer, #fb6b7b)';
  const innerStroke = monochrome ? 'currentColor' : 'var(--spin-inner, #fb9468)';

  const outerAnim =
    state === 'busy'
      ? 'aisoc-spin-cw 1.25s linear infinite'
      : state === 'idle'
        ? 'aisoc-spin-cw 8.5s linear infinite'
        : 'none';

  const innerAnim =
    state === 'busy'
      ? 'aisoc-spin-ccw 0.95s linear infinite'
      : state === 'idle'
        ? 'aisoc-spin-ccw 6.5s linear infinite'
        : 'none';

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden={label ? undefined : 'true'}
      role={label ? 'img' : undefined}
      aria-label={label}
      data-state={state}
      className={clsx('inline-block flex-shrink-0 overflow-visible', SIZE_CLASSES[size], className)}
    >
      <g
        style={{
          transformOrigin: '24px 24px',
          animation: outerAnim,
        }}
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          pathLength={100}
          stroke={outerStroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="36 14"
        />
      </g>
      <g
        style={{
          transformOrigin: '24px 24px',
          animation: innerAnim,
          opacity: monochrome ? 0.75 : 1,
        }}
      >
        <circle
          cx="24"
          cy="24"
          r="11"
          pathLength={100}
          stroke={innerStroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="32 18"
        />
      </g>
    </svg>
  );
}
