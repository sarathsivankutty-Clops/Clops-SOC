'use client';

import { useMemo, useRef, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  getActiveWorkspace,
  getVisibleWorkspaceTabs,
  isWorkspaceTabActive,
  type NavigationFilterOptions,
  type WorkspaceTabItem,
} from '@/config/navigation';
import { emitNavigationAnalytics } from '@/lib/navigation-analytics';

export interface WorkspaceTabBarProps {
  /** Optional filter overrides for unit testing or role/permission injection. */
  readonly filterOptions?: NavigationFilterOptions;
}

export function WorkspaceTabBar({ filterOptions }: WorkspaceTabBarProps) {
  const pathname = usePathname() ?? '/';
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const activeWorkspace = useMemo(
    () => getActiveWorkspace(pathname, filterOptions),
    [pathname, filterOptions],
  );

  const tabs = useMemo(
    () => getVisibleWorkspaceTabs(pathname, filterOptions),
    [pathname, filterOptions],
  );

  if (!activeWorkspace || tabs.length === 0) {
    return null;
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const count = tabs.length;
    if (count <= 1) return;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % count;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + count) % count;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = count - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const handleTabClick = (tab: WorkspaceTabItem) => {
    emitNavigationAnalytics({
      event: 'workspace_tab_changed',
      workspaceId: activeWorkspace.id,
      tab: tab.label,
      href: tab.href,
      source: 'tabbar',
    });
  };

  return (
    <nav
      role="navigation"
      aria-label="Workspace views"
      data-testid="workspace-tab-bar"
      className="border-b border-surface-border bg-surface-card/70 px-6 backdrop-blur-xs"
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
        {tabs.map((tab, idx) => {
          const isActive = isWorkspaceTabActive(tab, tabs, pathname);
          return (
            <Link
              key={tab.href}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onClick={() => handleTabClick(tab)}
              className={clsx(
                'relative inline-flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors rounded-t-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base',
                isActive
                  ? 'text-brand-400 font-semibold'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-surface-elevated/60',
              )}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="inline-flex items-center justify-center rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand-400">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  data-testid="workspace-tab-active-indicator"
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-brand-400"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
