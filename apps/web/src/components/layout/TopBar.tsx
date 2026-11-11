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
  const [now, setNow] = useState<Date | null>(null);
  const [shortcut, setShortcut] = useState<'⌘K' | 'Ctrl K'>('⌘K');
  const { userRole } = useTenant();
  const { resolved: resolvedTheme } = useTheme();
  const branding = getOrgBrandingConfig();
  // [HIDDEN-UI P7 topbar-low-value] kept so the hidden RoleBadge block above can be restored in one step.
  void RoleBadge;
  void userRole;

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    setShortcut(isMac ? '⌘K' : 'Ctrl K');
  }, []);

  const routeInfo = useMemo(() => resolveRouteMetadata(pathname), [pathname]);

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

  const openCopilot = () => {
    window.dispatchEvent(new CustomEvent('aisoc:open-copilot'));
  };

  const timeStr = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '—';
  const dateStr = now
    ? now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('aisoc:toggle-sidebar'));
  };

  return (
    <header
      className={`fixed left-0 md:left-[var(--sidebar-w,15rem)] right-0 h-14 flex items-center gap-3 px-5 bg-surface-raised border-b border-surface-border z-20 transition-[left] duration-200 ${
        demoOffset ? 'top-9' : 'top-0'
      }`}
    >
      {/* Screen-reader route context (also preserves TopBar.test.tsx contract) */}
      <div className="sr-only">
        <h1>{routeInfo.title}</h1>
        <p>{routeInfo.description}</p>
      </div>

      {/* Sidebar collapse button (matches mockup #collapse) */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        title="Collapse sidebar"
        className="w-[34px] h-[34px] rounded-lg border border-surface-border bg-surface-card inline-flex items-center justify-center text-fg-secondary hover:bg-surface-hover hover:text-fg-primary transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </button>

      {/* Search / command palette trigger (matches mockup .sbar) */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Open command palette"
        className="group relative flex flex-1 max-w-[460px] items-center gap-2.5 rounded-[10px] border border-surface-border bg-surface-base px-3 py-1.5 text-left text-[13px] text-fg-muted transition-all hover:border-brand-500/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-fg-subtle shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="flex-1 truncate text-fg-muted group-hover:text-fg-secondary">
          Search incidents, hosts, IPs, users…
        </span>
        <kbd className="pointer-events-none rounded-md border border-surface-border bg-surface-card px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle">
          {shortcut}
        </kbd>
      </button>

      <div className="flex-1" />

      {/* [P7 topbar-clusters] Right side is grouped into 3 clusters: scope | actions | account. */}
      <div className="flex items-center gap-4">
        {/* Cluster 1: scope */}
        <div className="flex items-center gap-2.5">
        <div className="hidden md:block">
          <TimeWindowSelector />
        </div>

        <div className="hidden xl:block">
          <TenantSwitcher />
        </div>
        </div>

        {/* [HIDDEN-UI P7 topbar-low-value] Role badge hidden (role is shown on the profile/settings pages):
        <div className="hidden 2xl:block">
          <RoleBadge role={userRole} />
        </div>
        */}

        {/* [HIDDEN-UI P7 topbar-low-value] Static "All pipelines healthy" text hidden: it is a hardcoded string, not a live health signal:
        <span
          className="hidden lg:inline-flex items-center gap-2 text-xs text-fg-secondary px-2 py-1"
          title="Ingestion & detection pipelines operational"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]" />
          <span>All pipelines healthy</span>
        </span>
        */}

        {/* Cluster 2: actions */}
        <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={openCopilot}
          className="inline-flex items-center gap-2 rounded-[9px] border border-violet-500/35 bg-violet-500/10 px-3 py-1.5 text-[12.5px] font-medium text-violet-400 transition-colors hover:bg-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          title="Open AI Copilot (⌘J)"
        >
          <AiSpinner size="xs" state="idle" />
          <span>AI Copilot</span>
        </button>

        <ThemeToggle />
        </div>

        {/* Cluster 3: account */}
        <div className="flex items-center gap-2.5">
        <Link
          href="/alerts"
          aria-label="Open notifications"
          className="relative w-[34px] h-[34px] rounded-lg border border-surface-border bg-surface-card inline-flex items-center justify-center text-fg-secondary hover:bg-surface-hover hover:text-fg-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"
          />
        </Link>

        {/* User avatar (matches mockup .ava) */}
        <div
          className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shrink-0"
          title={`SOC Analyst · ${timeStr} ${dateStr}`}
        >
          SA
        </div>

        {branding.enabled && (
          <img
            src={resolvedTheme === 'light' ? branding.logoLightPath : branding.logoDarkPath}
            alt={branding.logoAlt}
            className="topbar-logo-img hidden sm:block ml-1"
            data-testid="org-topbar-logo"
          />
        )}
        </div>
      </div>
    </header>
  );
}
