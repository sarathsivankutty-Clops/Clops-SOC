/**
 * [P6 overlays] Single dialog behaviour for every modal / sheet in the console.
 *
 * Two entry points that share one implementation:
 *  - `<Dialog>`          full component: scrim + panel, role="dialog", aria-modal,
 *                        focus trap, Escape to close, focus restored on close.
 *  - `<DialogBehavior>`  render-nothing helper dropped inside an existing overlay
 *                        element so legacy modals gain the same accessibility
 *                        contract without restructuring their markup.
 */
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { clsx } from 'clsx';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function attachDialogBehavior(
  root: HTMLElement,
  onClose: () => void,
  label?: string,
): () => void {
  const hadRole = root.hasAttribute('role');
  const hadModal = root.hasAttribute('aria-modal');
  if (!hadRole) root.setAttribute('role', 'dialog');
  if (!hadModal) root.setAttribute('aria-modal', 'true');
  if (label && !root.hasAttribute('aria-label')) root.setAttribute('aria-label', label);

  const previouslyFocused = document.activeElement as HTMLElement | null;
  const focusables = () =>
    Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );

  if (!root.contains(document.activeElement)) {
    const first = focusables()[0];
    if (first) first.focus();
    else {
      root.setAttribute('tabindex', '-1');
      root.focus();
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !root.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !root.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    if (!hadRole) root.removeAttribute('role');
    if (!hadModal) root.removeAttribute('aria-modal');
    previouslyFocused?.focus?.();
  };
}

export function DialogBehavior({ onClose, label }: { onClose: () => void; label?: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    return attachDialogBehavior(root, () => closeRef.current(), label);
  }, [label]);

  return <span ref={marker} hidden aria-hidden="true" />;
}

export interface DialogProps {
  open?: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}

export function Dialog({ open = true, onClose, label, className, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <DialogBehavior onClose={onClose} label={label} />
      <div
        className={clsx(
          'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.25rem] border border-surface-border bg-surface-card p-6',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
