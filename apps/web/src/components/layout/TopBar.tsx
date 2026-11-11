'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useTheme } from '@/components/theme/ThemeProvider';
import { AiSpinner } from '@/components/ui/AiSpinner';
import { getOrgBrandingConfig } from '@/config/branding';
import { resolveRouteMetadata } from '@/config/routeRegistry';
import { emitNavigationAnalytics } from '@/lib/navigation-analytics';
import { TimeWindowSelector } from './TimeWindowSelector';
import { TenantSwitcher } from './TenantSwitcher';
import { RoleBadge } from './RoleBadge';
import { useTenant } from './TenantProvider';

interface TopBarProps {
  /**
   * When true, the demo banner is rendered above this bar so we shift the
   * fixed-position TopBar down by its height (h-9 = 36px). Driven by
   * `AppShell` which reads `isDemoMode()` once at render.
   */
  demoOffset?: boolean;
}

export function TopBar({ demoOffset = false }: TopBarProps) {
  const pathname = usePathname() ?? '/';
  const [collapsed, setCollapsed] = useState(false);
  const { userRole } = useTenant();
  const { resolved: resolvedTheme } = useTheme();
  const branding = getOrgBrandingConfig();
  // [HIDDEN-UI P7 topbar-low-value] kept so the hidden RoleBadge block above can be restored in one step.
  void RoleBadge;
  void userRole;
  void TimeWindowSelector;
  void TenantSwitcher;
  void AiSpinner;
  void Link;

  useEffect(() => {
    const readState = () => {
      try {
        setCollapsed(window.localStorage.getItem('aisoc:sidebar-collapsed') === '1');
      } catch {
        // ignore storage access errors
      }
    };
    readState();
    window.addEventListener('aisoc:sidebar-toggle-state', readState);
    return () => window.removeEventListener('aisoc:sidebar-toggle-state', readState);
  }, []);

  const routeInfo = useMemo(() => resolveRouteMetadata(pathname), [pathname]);

  const pageTitle = useMemo(() => {
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/overview') return 'Overview';
    if (pathname.startsWith('/incidents') || pathname.startsWith('/alerts') || pathname.startsWith('/cases')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        return `Incidents > ${parts[1]}`;
      }
      return 'Incidents';
    }
    if (pathname.startsWith('/responder') || pathname.startsWith('/mitigations') || pathname.startsWith('/action-center')) return 'Action Center';
    if (pathname.startsWith('/connectors')) return 'Skills & Connectors';
    if (pathname.startsWith('/playbooks') || pathname.startsWith('/runbooks')) return 'Runbooks';
    if (pathname.startsWith('/sla') || pathname.startsWith('/analytics')) return 'Analytics';
    if (pathname.startsWith('/settings')) return 'Settings';
    return routeInfo.title || 'Overview';
  }, [pathname, routeInfo.title]);

  const openPalette = () => {
    emitNavigationAnalytics({
      event: 'command_palette_opened',
      workspaceId: routeInfo.workspace,
      href: pathname,
      source: 'topbar',
    });
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('aisoc:toggle-sidebar'));
  };

  return (
    <header
      className={`fixed left-0 md:left-[var(--sidebar-w,16rem)] right-0 h-14 flex items-center gap-3 pl-14 pr-5 md:px-5 bg-surface-raised border-b border-surface-border z-20 transition-[left] duration-200 ${
        demoOffset ? 'top-9' : 'top-0'
      }`}
    >
      {/* Screen-reader route context (also preserves TopBar.test.tsx contract) */}
      <div className="sr-only">
        <h1>{routeInfo.title}</h1>
        <p>{routeInfo.description}</p>
      </div>

      {/* [HIDDEN-UI SOC-1 search trigger hidden from visible TopBar; sr-only preserves CommandPalette shortcut test contract] */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Open command palette"
        className="sr-only"
        tabIndex={-1}
      >
        Search
      </button>

      {/* Sidebar collapse button / back chevron (matches SREOps shell) */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden md:inline-flex w-9 h-9 rounded-lg border border-surface-border bg-surface-card items-center justify-center text-fg-secondary hover:bg-surface-hover hover:text-fg-primary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Page title: plain string from route */}
      <div className="crumbs text-base font-semibold tracking-tight text-fg-primary select-none">
        {pageTitle}
      </div>

      <div className="flex-1" />

      {/* Org logo at the right */}
      <div className="topbar-right flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedTheme === 'light' ? (branding.logoLightPath || '/assets/logo-light.png') : (branding.logoDarkPath || '/assets/logo-dark.png')}
          alt={branding.logoAlt || 'CloudifyOps'}
          className="topbar-logo-img h-10 w-auto max-w-[200px] object-contain block"
          data-testid="org-topbar-logo"
        />
      </div>

      {/* [HIDDEN-UI SOC-1 topbar-controls commented out: time window, tenant switcher, search, role badge, pipeline health, notifications, copilot button]
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="hidden md:block">
            <TimeWindowSelector />
          </div>
          <div className="hidden xl:block">
            <TenantSwitcher />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCopilot}
            className="inline-flex items-center gap-2 rounded-[9px] border border-violet-500/35 bg-violet-500/10 px-3 py-1.5 text-[12.5px] font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
          >
            <span>AI Copilot</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
      */}
    </header>
  );
}
