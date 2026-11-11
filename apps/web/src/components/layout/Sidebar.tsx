'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useBranding } from '@/hooks/useBranding';
import { brandingApi, authApi, type AuthUser } from '@/lib/api';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Badge } from '@/components/ui/Badge';
import { isFullIntelligenceEnabled as isFullIntelligenceEnabledFromConfig } from '@/config/features';
import {
  WORKSPACE_REGISTRY,
  getActiveWorkspace,
  getPrimaryWorkspaces,
  getVisibleWorkspaceTabs,
  isWorkspaceActive,
  isWorkspaceTabActive,
  getSREOpsNavConfig,
  matchesRoutePrefix,
  WorkspaceId,
  type IconType,
  type NavigationFilterOptions,
} from '@/config/navigation';
import { emitNavigationAnalytics } from '@/lib/navigation-analytics';

export interface SecondaryNavItem {
  label: string;
  href: string;
  enabled?: boolean;
}

export interface SecondaryGroup {
  title: string;
  items: SecondaryNavItem[];
}

/**
 * Backward-compatible export derived from the central workspace registry
 * for callers or tests that inspect grouped workspace tabs programmatically.
 */
export const MORE_TOOLS_GROUPS: SecondaryGroup[] = WORKSPACE_REGISTRY.map((ws) => ({
  title: ws.label,
  items: ws.tabs.map((tab) => ({
    label: tab.label,
    href: tab.href,
    enabled: tab.featureFlag === 'fullIntelligence' ? false : tab.enabled ?? true,
  })),
}));

export function isFullIntelligenceEnabled(): boolean {
  return isFullIntelligenceEnabledFromConfig();
}

export function getVisibleMoreToolsGroups(
  fullIntelligence = isFullIntelligenceEnabled(),
): SecondaryGroup[] {
  return getPrimaryWorkspaces({ fullIntelligence }).map((ws) => ({
    title: ws.label,
    items: ws.tabs.map((tab) => ({
      label: tab.label,
      href: tab.href,
      enabled: true,
    })),
  }));
}

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'aisoc:sidebar-collapsed';

function WorkspaceIcon({ icon }: { icon: IconType }) {
  switch (icon) {
    case 'command-center':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case 'alerts':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" />
        </svg>
      );
    case 'incidents':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'hunting-intel':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case 'assets-identities':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case 'detections':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case 'automation':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 4h14v16H5zM9 9h6M9 13h6M9 17h3" />
        </svg>
      );
    case 'settings-admin':
      return (
        <svg
          aria-hidden="true"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

export interface SidebarProps {
  /** Optional filter options for role/permission or feature-flag testing. */
  readonly filterOptions?: NavigationFilterOptions;
}

export function Sidebar({ filterOptions }: SidebarProps = {}) {
  const pathname = usePathname() ?? '/dashboard';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { branding } = useBranding();

  // [HIDDEN-UI SOC-1 8-workspace-sidebar] resolved for the commented-out render block below.
  const workspaces = useMemo(
    () => getPrimaryWorkspaces(filterOptions),
    [filterOptions],
  );
  void workspaces;

  const activeWorkspace = useMemo(
    () => getActiveWorkspace(pathname, filterOptions),
    [pathname, filterOptions],
  );

  // [P5 nav-secondary-rail] The active workspace's pages, rendered as a nested rail under it.
  // [HIDDEN-UI SOC-1 P5-secondary-rail] now unused by the flat navigation; kept resolved so the
  // analytics listener below and the restore block keep working unchanged.
  const workspacePages = useMemo(
    () => getVisibleWorkspaceTabs(pathname, filterOptions),
    [pathname, filterOptions],
  );
  void workspacePages;
  void isWorkspaceTabActive;
  void isWorkspaceActive;

  const prevWorkspaceIdRef = useRef(activeWorkspace?.id ?? null);

  useEffect(() => {
    const currentId = activeWorkspace?.id ?? null;
    if (!currentId) return;

    if (prevWorkspaceIdRef.current === null) {
      emitNavigationAnalytics({
        event: 'workspace_opened',
        workspaceId: currentId,
        href: pathname,
        source: 'sidebar',
      });
    } else if (prevWorkspaceIdRef.current !== currentId) {
      emitNavigationAnalytics({
        event: 'workspace_changed',
        workspaceId: currentId,
        previousWorkspaceId: prevWorkspaceIdRef.current,
        href: pathname,
        source: 'sidebar',
      });
    }
    prevWorkspaceIdRef.current = currentId;
  }, [activeWorkspace?.id, pathname]);

  const [user, setUser] = useState<AuthUser | null>(null);
  const { resolved: resolvedTheme, setPreference: setThemePreference } = useTheme();
  const dark = resolvedTheme === 'dark';
  const sreNavConfig = getSREOpsNavConfig();

  useEffect(() => {
    setUser(authApi.currentUser());
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved === '1') {
        setCollapsed(true);
        document.documentElement.style.setProperty('--sidebar-w', '4rem');
      } else {
        document.documentElement.style.setProperty('--sidebar-w', '16rem');
      }
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  const toggleCollapsed = () => {
    // Declared outside the state updater: a side effect (storage write, event
    // dispatch, analytics) inside an updater runs when React processes the
    // update, so it would land after the click that caused it.
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Ignore storage errors.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--sidebar-w', next ? '4rem' : '16rem');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aisoc:sidebar-toggle-state'));
    }
    emitNavigationAnalytics({
      event: 'sidebar_collapsed',
      collapsed: next,
      workspaceId: activeWorkspace?.id ?? null,
      source: 'sidebar',
    });
  };

  // Expose a custom event listener so TopBar's chevron can also toggle the sidebar
  useEffect(() => {
    const handler = () => toggleCollapsed();
    window.addEventListener('aisoc:toggle-sidebar', handler);
    return () => window.removeEventListener('aisoc:toggle-sidebar', handler);
  });

  const whiteLabelled = Boolean(branding?.is_white_labelled && branding.product_name);
  const logoPath = branding?.logo_url ?? null;
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!whiteLabelled || !logoPath) {
      setLogoSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    brandingApi.logo(logoPath).then((blob) => {
      if (!blob) return;
      const url = typeof blob === 'string' ? blob : URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setLogoSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [whiteLabelled, logoPath]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  const doLogout = () => {
    authApi.logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const userEmail = user?.email || 'analyst@clops.local';
  const userName = user?.username || 'SOC Analyst';
  const userRole = user?.role || 'Admin';
  const initials = userName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SA';

  // SREOps shell: one flat level, six items, no sub-rail and no sections.
  // Runbooks and Analytics sit behind their own nav flag so they can be hidden.
  const flatNav = [
    {
      to: '/dashboard',
      label: 'Overview',
      workspace: WorkspaceId.CommandCenter,
      active: matchesRoutePrefix(pathname, '/dashboard') || pathname === '/' || pathname === '/overview',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      to: '/incidents',
      label: 'Incidents',
      workspace: WorkspaceId.Incidents,
      active:
        matchesRoutePrefix(pathname, '/incidents') ||
        matchesRoutePrefix(pathname, '/alerts') ||
        matchesRoutePrefix(pathname, '/cases') ||
        matchesRoutePrefix(pathname, '/queue') ||
        matchesRoutePrefix(pathname, '/investigations'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <path d="M8 11h6M11 8v6" />
        </svg>
      ),
    },
    {
      to: '/responder/approvals',
      label: 'Action Center',
      workspace: WorkspaceId.Automation,
      active:
        matchesRoutePrefix(pathname, '/responder') ||
        matchesRoutePrefix(pathname, '/mitigations') ||
        matchesRoutePrefix(pathname, '/action-center'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6 6 2 2 6-6a4 4 0 0 0 5.6-5.6l-2.3 2.3-2-2 2.3-2.3z" />
        </svg>
      ),
    },
    {
      to: '/connectors',
      label: 'Skills & Connectors',
      workspace: WorkspaceId.SettingsAdmin,
      active: matchesRoutePrefix(pathname, '/connectors'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8" y2="16" />
          <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
      ),
    },
    ...(sreNavConfig.showRunbooks
      ? [
          {
            to: '/playbooks',
            label: 'Runbooks',
            workspace: WorkspaceId.Automation,
            active: matchesRoutePrefix(pathname, '/playbooks') || matchesRoutePrefix(pathname, '/runbooks'),
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            ),
          },
        ]
      : []),
    ...(sreNavConfig.showAnalytics
      ? [
          {
            to: '/sla',
            label: 'Analytics',
            workspace: WorkspaceId.CommandCenter,
            active: matchesRoutePrefix(pathname, '/sla') || matchesRoutePrefix(pathname, '/analytics'),
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        className="fixed top-3 left-3 z-50 md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-card border border-surface-border text-fg-secondary hover:text-fg-primary hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {mobileOpen ? (
          <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-surface-sunken/80 md:hidden"
        />
      )}

      <aside
        aria-label="Primary navigation"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={clsx(
          'sidebar fixed left-0 top-0 bottom-0 bg-surface-card border-r border-surface-border flex flex-col z-40 transition-all duration-200 ease-out select-none',
          collapsed ? 'w-64 md:w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand header — product name (white-label aware) */}
        <div
          className={clsx(
            'brand h-14 flex items-center border-b border-surface-border shrink-0 px-4',
            collapsed && 'md:px-0 md:justify-center',
          )}
          style={whiteLabelled && branding?.accent_color ? { borderColor: branding.accent_color } : undefined}
        >
          {whiteLabelled && logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={`${branding?.product_name} logo`}
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
          ) : null}
          <div className={clsx('min-w-0 flex-1', !whiteLabelled && 'ml-0', collapsed && 'md:hidden')}>
            {whiteLabelled ? (
              <span
                className="text-fg-primary font-bold text-base tracking-tight truncate block"
                style={branding?.primary_color ? { color: branding.primary_color } : undefined}
              >
                {branding?.product_name || 'AiSOC'}
              </span>
            ) : (
              <span className="brand-name flex items-center">
                <span className="text-brand-500">Ai</span>
                <span className="text-fg-primary">SOC</span>
              </span>
            )}
          </div>
        </div>

        {/* NAVIGATION — one group label, one flat list, no sub-rail */}
        <nav aria-label="Primary workspaces" className="nav flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          <div
            className={clsx(
              'nav-group-label px-3 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[1.2px] text-fg-muted',
              collapsed && 'md:hidden',
            )}
          >
            Navigation
          </div>

          {flatNav.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              title={item.label}
              aria-current={item.active ? 'page' : undefined}
              onClick={() =>
                emitNavigationAnalytics({
                  event: 'workspace_opened',
                  workspaceId: item.workspace,
                  href: item.to,
                  source: 'sidebar',
                })
              }
              className={clsx(
                'nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors relative',
                collapsed && 'md:justify-center md:px-0',
                item.active ? 'active' : '',
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className={clsx('truncate', collapsed && 'md:hidden')}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer: Light/Dark switch, then the user card */}
        <div className="sidebar-foot p-3 border-t border-surface-border flex flex-col gap-2.5">
          <button
            type="button"
            className={clsx(
              'theme-row flex items-center gap-2.5 w-full p-2.5 rounded-xl cursor-pointer border border-surface-border bg-surface-elevated transition-colors',
              collapsed && 'md:justify-center md:p-2',
            )}
            role="switch"
            aria-checked={dark}
            aria-label="Toggle dark mode"
            onClick={() => setThemePreference(dark ? 'light' : 'dark')}
            title={collapsed ? (dark ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
          >
            <svg
              className="t-icon t-sun w-4 h-4 text-status-warn shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ display: dark ? 'none' : 'block' }}
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <svg
              className="t-icon t-moon w-4 h-4 text-brand-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ display: dark ? 'block' : 'none' }}
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span className={clsx('theme-label text-[12.5px] font-semibold text-fg-primary', collapsed && 'md:hidden')}>
              {dark ? 'Light Mode' : 'Dark Mode'}
            </span>
            <span className={clsx('switch ml-auto', collapsed && 'md:hidden')}>
              <span className="switch-knob" />
            </span>
          </button>

          <div
            className={clsx(
              'user-card rounded-xl border border-surface-border bg-surface-elevated flex transition-all',
              collapsed ? 'md:justify-center md:p-2' : 'p-3 flex-col gap-2',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0 w-full">
              <div className="avatar lg shrink-0" title={`${userName} (${userRole})`}>
                {initials}
              </div>
              <div className={clsx('user-meta min-w-0 flex-1', collapsed && 'md:hidden')}>
                <div className="user-name text-[12.5px] font-semibold text-fg-primary truncate" title={userName}>
                  {userName}
                </div>
                <div className="user-email text-[10.5px] text-fg-muted truncate" title={userEmail}>
                  {userEmail}
                </div>
              </div>
              <button
                type="button"
                className={clsx('logout-btn shrink-0 text-status-dead transition-colors', collapsed && 'md:hidden')}
                title="Sign out"
                aria-label="Sign out"
                onClick={doLogout}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline strokeLinecap="round" strokeLinejoin="round" points="16 17 21 12 16 7" />
                  <line strokeLinecap="round" strokeLinejoin="round" x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>

            <div
              className={clsx(
                'flex items-center justify-between pt-2 border-t border-surface-border',
                collapsed && 'md:hidden',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-fg-muted font-mono text-[10.5px]">Role:</span>
                <Badge
                  tone={userRole.toLowerCase() === 'admin' ? 'success' : 'neutral'}
                  className="text-[10.5px] capitalize"
                >
                  {userRole}
                </Badge>
              </div>
              <span className="text-fg-subtle font-mono text-[10.5px]">AiSOC v21</span>
            </div>
          </div>
        </div>

        {/* [HIDDEN-UI SOC-1 8-workspace-sidebar] The registry-driven eight-workspace sidebar is
            replaced by the flat six-item SREOps navigation above. The registry, its filters and
            every helper stay live; only the rendering is commented out so restoring it is one step.

        <nav aria-label="Legacy primary workspaces">
          {workspaces.map((item) => {
            const isActive = isWorkspaceActive(item, pathname);
            return (
              <div key={item.id}>
                <Link href={item.href} title={item.label} aria-current={isActive ? 'page' : undefined}>
                  <WorkspaceIcon icon={item.icon} />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
        */}

        {/* [HIDDEN-UI SOC-1 P5-secondary-rail] The active workspace's nested page rail.

        {activeWorkspace && !collapsed && workspacePages.length > 1 && (
          <nav aria-label={`${activeWorkspace.label} pages`}>
            <ul>
              {workspacePages.map((page) => (
                <Link key={page.href} href={page.href} className="nav-item">
                  {page.label}
                </Link>
              ))}
            </ul>
          </nav>
        )}
        */}

        {/* [HIDDEN-UI SOC-1 legacy-footer] Platform wordmark + MIT licence line, replaced by the
            theme switch and user card above.

        <div className="sidebar-foot">
          <div className="text-fg-muted text-[10.5px]">{branding?.product_name || 'AiSOC'}</div>
          <a href="https://github.com/beenuar/AiSOC" className="text-fg-subtle text-[10.5px]">
            MIT License
          </a>
        </div>
        */}
      </aside>
    </>
  );
}

// [HIDDEN-UI SOC-1 8-workspace-sidebar] kept referenced so the restore block above type-checks.
void WorkspaceIcon;
