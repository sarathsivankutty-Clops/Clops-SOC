'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { useBranding } from '@/hooks/useBranding';
import { brandingApi } from '@/lib/api';
import { isFullIntelligenceEnabled as isFullIntelligenceEnabledFromConfig } from '@/config/features';
import {
  WORKSPACE_REGISTRY,
  getActiveWorkspace,
  getPrimaryWorkspaces,
  getVisibleWorkspaceTabs,
  isWorkspaceActive,
  isWorkspaceTabActive,
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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
          className="w-[19px] h-[19px]"
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

  const workspaces = useMemo(
    () => getPrimaryWorkspaces(filterOptions),
    [filterOptions],
  );

  const activeWorkspace = useMemo(
    () => getActiveWorkspace(pathname, filterOptions),
    [pathname, filterOptions],
  );

  // [P5 nav-secondary-rail] The active workspace's pages, rendered as a nested rail under it
  // (replaces the WorkspaceTabBar tier, which is no longer rendered in AppShell).
  const workspacePages = useMemo(
    () => getVisibleWorkspaceTabs(pathname, filterOptions),
    [pathname, filterOptions],
  );

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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved === '1') {
        setCollapsed(true);
        document.documentElement.style.setProperty('--sidebar-w', '4rem');
      } else {
        document.documentElement.style.setProperty('--sidebar-w', '15rem');
      }
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors.
      }
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--sidebar-w', next ? '4rem' : '15rem');
      }
      emitNavigationAnalytics({
        event: 'sidebar_collapsed',
        collapsed: next,
        workspaceId: activeWorkspace?.id ?? null,
        source: 'sidebar',
      });
      return next;
    });
  };

  // Expose a custom event listener so TopBar's hamburger collapse button can also toggle the sidebar
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

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        className="fixed top-3 left-3 z-50 md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-surface-card/90 border border-surface-border text-fg-secondary hover:text-fg-primary hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        aria-label="Primary workspace navigation"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={clsx(
          'fixed left-0 top-0 bottom-0 bg-surface-card border-r border-surface-border flex flex-col z-40 transition-all duration-200 ease-out select-none',
          collapsed ? 'w-60 md:w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Brand Header */}
        <div
          className={clsx(
            'h-14 flex items-center border-b border-surface-border shrink-0',
            collapsed ? 'px-5 md:px-0 md:justify-center gap-2.5' : 'px-5 gap-2.5',
          )}
          style={whiteLabelled && branding?.accent_color ? { borderColor: branding.accent_color } : undefined}
        >
          {whiteLabelled && logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={`${branding?.product_name} logo`}
              className="w-[26px] h-[26px] rounded-lg object-contain shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-fg-primary text-sm shrink-0 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #22c55e)',
              }}
            >
              C
            </div>
          )}
          <div className={clsx('min-w-0 flex-1', collapsed && 'md:hidden')}>
            {whiteLabelled ? (
              <span
                className="text-fg-primary font-bold text-base tracking-tight truncate block"
                style={branding?.primary_color ? { color: branding.primary_color } : undefined}
              >
                {branding?.product_name || 'CLOPS-SOC'}
              </span>
            ) : (
              <span className="text-fg-primary font-bold text-base tracking-tight flex items-center gap-0.5">
                <span className="text-blue-500 font-extrabold">CLOPS</span>
                <span className="text-fg-primary">-SOC</span>
              </span>
            )}
          </div>
        </div>

        {/* 8-Workspace Enterprise Navigation */}
        <nav
          aria-label="Primary workspaces"
          className="flex-1 px-2.5 py-3 overflow-y-auto space-y-0.5"
        >
          {workspaces.map((item) => {
            const isActive = isWorkspaceActive(item, pathname);
            return (
              <div key={item.id}>
                {item.section && (
                  <div
                    className={clsx(
                      'px-3 pt-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted',
                      collapsed && 'md:invisible md:h-2 md:p-0',
                    )}
                  >
                    {item.section}
                  </div>
                )}
                <Link
                  href={item.href}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    emitNavigationAnalytics({
                      event: 'workspace_opened',
                      workspaceId: item.id,
                      href: item.href,
                      source: 'sidebar',
                    });
                  }}
                  className={clsx(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors whitespace-nowrap',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-card',
                    collapsed && 'md:justify-center md:px-0',
                    isActive
                      ? 'bg-brand-500/12 text-brand-400 font-semibold'
                      : 'text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated',
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-2.5 top-2 bottom-2 w-[3px] rounded-full bg-brand-400"
                    />
                  )}
                  <span className="shrink-0">
                    <WorkspaceIcon icon={item.icon} />
                  </span>
                  <span className={clsx('truncate', collapsed && 'md:hidden')}>
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* [P5 nav-secondary-rail] Pages of the active workspace as a secondary rail (separate landmark so the
            primary workspace list keeps exactly one link per workspace). */}
        {activeWorkspace && !collapsed && workspacePages.length > 1 && (
          <nav
            aria-label={`${activeWorkspace.label} pages`}
            className="max-h-[40%] overflow-y-auto border-t border-surface-border px-2.5 py-2"
          >
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
              {activeWorkspace.label}
            </div>
            <ul className="space-y-0.5">
              {workspacePages.map((page) => {
                const pageActive = isWorkspaceTabActive(page, workspacePages, pathname);
                return (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      aria-current={pageActive ? 'page' : undefined}
                      onClick={() => {
                        emitNavigationAnalytics({
                          event: 'workspace_tab_changed',
                          workspaceId: activeWorkspace.id,
                          tab: page.label,
                          href: page.href,
                          source: 'sidebar',
                        });
                      }}
                      className={clsx(
                        'block truncate rounded-[0.75rem] px-3 py-1.5 text-[13px] transition-colors',
                        pageActive
                          ? 'bg-[var(--co-ac-bg)] font-semibold text-[var(--co-ac)]'
                          : 'text-fg-muted hover:bg-surface-hover hover:text-fg-primary',
                      )}
                    >
                      {page.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Footer */}
        <div className="p-2.5 border-t border-surface-border space-y-2">
          <div
            className={clsx(
              'flex items-center gap-2.5 p-2 rounded-lg bg-surface-base border border-surface-border',
              collapsed && 'md:justify-center md:p-1.5',
            )}
          >
            <div className="w-[30px] h-[30px] rounded-full bg-surface-elevated grid place-items-center text-xs font-semibold text-fg-primary shrink-0">
              {whiteLabelled && branding?.product_name
                ? branding.product_name.slice(0, 2).toUpperCase()
                : 'AS'}
            </div>
            <div className={clsx('min-w-0 flex-1', collapsed && 'md:hidden')}>
              <div className="text-[13px] font-semibold text-fg-primary leading-tight truncate">
                {whiteLabelled && branding?.footer_text && branding.footer_text !== branding.product_name
                  ? branding.footer_text
                  : 'Production Workspace'}
              </div>
              <div className="text-[11px] text-fg-muted truncate">Production</div>
            </div>
          </div>

          <div className={clsx('px-2 flex items-center justify-between text-[11px] text-fg-muted', collapsed && 'md:hidden')}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
            {whiteLabelled && branding?.support_url ? (
              <a
                href={branding.support_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg-secondary transition-colors"
              >
                Support
              </a>
            ) : (
              <a
                href="https://github.com/beenuar/AiSOC"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-fg-secondary transition-colors"
              >
                MIT License
              </a>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
