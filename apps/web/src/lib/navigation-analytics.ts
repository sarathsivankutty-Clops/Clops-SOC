/**
 * Decoupled Navigation Analytics Emitter
 *
 * Emits structured telemetry events for workspace navigation without coupling
 * layout components to any specific analytics vendor or network transport.
 *
 * Consumers (e.g. OpenTelemetry, Prometheus beacon, or unit tests) can
 * subscribe via `subscribeNavigationAnalytics(listener)` or listen for the
 * `aisoc:navigation-analytics` CustomEvent on `window`.
 */

import type { WorkspaceId } from '@/config/navigation';

export type NavigationAnalyticsEventType =
  | 'workspace_opened'
  | 'workspace_changed'
  | 'workspace_tab_changed'
  | 'sidebar_collapsed'
  | 'command_palette_opened';

export interface NavigationAnalyticsPayload {
  readonly event: NavigationAnalyticsEventType;
  readonly timestamp: string;
  readonly workspaceId?: WorkspaceId | null;
  readonly previousWorkspaceId?: WorkspaceId | null;
  readonly tab?: string | null;
  readonly href?: string;
  readonly collapsed?: boolean;
  readonly source?: 'sidebar' | 'tabbar' | 'topbar' | 'keyboard' | 'palette';
}

export type NavigationAnalyticsListener = (payload: NavigationAnalyticsPayload) => void;

const listeners = new Set<NavigationAnalyticsListener>();

export const NAVIGATION_ANALYTICS_DOM_EVENT = 'aisoc:navigation-analytics';

/**
 * Registers an in-memory subscriber for navigation analytics events.
 * Returns an unsubscribe function.
 */
export function subscribeNavigationAnalytics(
  listener: NavigationAnalyticsListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Emits a structured navigation analytics event to all registered listeners
 * and dispatches a browser `CustomEvent` when running in a DOM environment.
 */
export function emitNavigationAnalytics(
  input: Omit<NavigationAnalyticsPayload, 'timestamp'>,
): NavigationAnalyticsPayload {
  const payload: NavigationAnalyticsPayload = Object.freeze({
    ...input,
    timestamp: new Date().toISOString(),
  });

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // Never allow an analytics subscriber error to break navigation UX.
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent<NavigationAnalyticsPayload>(NAVIGATION_ANALYTICS_DOM_EVENT, {
          detail: payload,
        }),
      );
    } catch {
      // Ignore DOM dispatch errors in constrained environments.
    }
  }

  return payload;
}
