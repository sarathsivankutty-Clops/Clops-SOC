import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pathnameMock = vi.fn(() => '/dashboard');

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
    title,
    onClick,
    onKeyDown,
    'aria-current': ariaCurrent,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    title?: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLAnchorElement>;
    'aria-current'?: 'page' | undefined;
  }) => (
    <a
      href={href}
      className={className}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      onKeyDown={onKeyDown}
      aria-current={ariaCurrent}
    >
      {children}
    </a>
  ),
}));

import { Sidebar, getVisibleMoreToolsGroups } from './Sidebar';
import { ThemeProvider } from '../theme/ThemeProvider';
import { WorkspaceTabBar } from './WorkspaceTabBar';
import { Breadcrumbs } from './Breadcrumbs';
import {
  WORKSPACE_REGISTRY,
  WorkspaceId,
  WorkspaceSection,
  filterWorkspaceTabs,
  getActiveWorkspace,
  getActiveWorkspaceTab,
  getPrimaryWorkspaces,
  getVisibleWorkspaceTabs,
  hasNavigationPermissions,
  matchesRoutePrefix,
} from '@/config/navigation';
import {
  ROUTE_REGISTRY,
  resolveBreadcrumbs,
  resolveRouteMetadata,
} from '@/config/routeRegistry';
import {
  subscribeNavigationAnalytics,
  type NavigationAnalyticsPayload,
} from '@/lib/navigation-analytics';

describe('Enterprise 8-Workspace Navigation Architecture', () => {
  afterEach(() => {
    pathnameMock.mockReturnValue('/dashboard');
    vi.unstubAllEnvs();
  });

  it('renders the AiSOC mark, one NAVIGATION group label, and the flat six-item list with canonical hrefs', () => {
    render(
      <ThemeProvider>
        <Sidebar />
      </ThemeProvider>,
    );

    expect(screen.getByText('Ai')).toBeInTheDocument();
    expect(screen.getByText('SOC')).toBeInTheDocument();

    // One group label, one level — the four section headers are gone with the eight-workspace rail.
    expect(screen.getByText(/^navigation$/i)).toBeInTheDocument();
    for (const section of Object.values(WorkspaceSection)) {
      expect(screen.queryByText(section)).not.toBeInTheDocument();
    }

    expect(screen.getByRole('link', { name: /^overview$/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /^incidents$/i })).toHaveAttribute('href', '/incidents');
    expect(screen.getByRole('link', { name: /^action center$/i })).toHaveAttribute(
      'href',
      '/responder/approvals',
    );
    expect(screen.getByRole('link', { name: /^skills & connectors$/i })).toHaveAttribute(
      'href',
      '/connectors',
    );
    expect(screen.getByRole('link', { name: /^runbooks$/i })).toHaveAttribute('href', '/playbooks');
    expect(screen.getByRole('link', { name: /^analytics$/i })).toHaveAttribute('href', '/sla');
  });

  it('contains no "More tools" accordion, no duplicate routes, and no nested sub-rail in the sidebar', () => {
    render(
      <ThemeProvider>
        <Sidebar />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('button', { name: /more tools/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^investigations$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /on-call mobile/i })).not.toBeInTheDocument();

    const workspaceNav = screen.getByRole('navigation', { name: /primary workspaces/i });
    const links = Array.from(workspaceNav.querySelectorAll('a'));
    expect(links).toHaveLength(6);

    // One level only: no navigation element nested under the primary list.
    expect(workspaceNav.querySelector('nav')).toBeNull();

    const hrefs = links.map((a) => a.getAttribute('href'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('marks the active item with aria-current="page" and resolves child routes accurately', () => {
    pathnameMock.mockReturnValue('/incidents/inv-0zfndx');
    render(
      <ThemeProvider>
        <Sidebar />
      </ThemeProvider>,
    );

    const incidentsLink = screen.getByRole('link', { name: /^incidents$/i });
    expect(incidentsLink).toHaveAttribute('aria-current', 'page');

    const overviewLink = screen.getByRole('link', { name: /^overview$/i });
    expect(overviewLink).not.toHaveAttribute('aria-current');
  });

  it('performs segment-safe route matching without prefix false positives', () => {
    expect(matchesRoutePrefix('/alerts', '/alerts')).toBe(true);
    expect(matchesRoutePrefix('/alerts/123', '/alerts')).toBe(true);
    expect(matchesRoutePrefix('/alerts?severity=critical', '/alerts')).toBe(true);
    expect(matchesRoutePrefix('/alerts-v2', '/alerts')).toBe(false);
    expect(matchesRoutePrefix('/detection/catalog', '/detection', true)).toBe(false);
    expect(matchesRoutePrefix('/detection', '/detection', true)).toBe(true);
  });

  it('renders WorkspaceTabBar with role="navigation" and aria-label="Workspace views" for the active workspace', () => {
    pathnameMock.mockReturnValue('/detection/proposals');
    render(<WorkspaceTabBar />);

    const nav = screen.getByRole('navigation', { name: 'Workspace views' });
    expect(nav).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Active Rules' })).toHaveAttribute('href', '/detection');
    expect(screen.getByRole('link', { name: 'Rule Catalog' })).toHaveAttribute('href', '/detection/catalog');
    expect(screen.getByRole('link', { name: 'ATT&CK Coverage' })).toHaveAttribute('href', '/coverage-advisor');
    expect(screen.getByRole('link', { name: 'Noise & Tuning' })).toHaveAttribute('href', '/noise-tuning');

    const proposalsTab = screen.getByRole('link', { name: 'Rule Proposals' });
    expect(proposalsTab).toHaveAttribute('href', '/detection/proposals');
    expect(proposalsTab).toHaveAttribute('aria-current', 'page');
  });

  it('highlights the parent tab when visiting a child detail route (e.g. /cases/case-42 -> Active Incidents)', () => {
    pathnameMock.mockReturnValue('/cases/case-42');
    render(<WorkspaceTabBar />);

    const activeIncidentsTab = screen.getByRole('link', { name: 'Active Incidents' });
    expect(activeIncidentsTab).toHaveAttribute('aria-current', 'page');

    const shiftHandoffTab = screen.getByRole('link', { name: 'Shift Handoff' });
    expect(shiftHandoffTab).not.toHaveAttribute('aria-current');
  });

  it('filters feature-flagged tabs by default and restores them when fullIntelligence is enabled', () => {
    const defaultHunting = getPrimaryWorkspaces({ fullIntelligence: false }).find(
      (ws) => ws.id === WorkspaceId.HuntingIntel,
    );
    expect(defaultHunting?.tabs.map((t) => t.label)).toEqual([
      'Threat Hunt',
      'Threat Intelligence',
      'Attack Graph',
    ]);

    const fullHunting = getPrimaryWorkspaces({ fullIntelligence: true }).find(
      (ws) => ws.id === WorkspaceId.HuntingIntel,
    );
    expect(fullHunting?.tabs.map((t) => t.label)).toEqual([
      'Threat Hunt',
      'Threat Intelligence',
      'Attack Graph',
      'Data Lake Explorer',
      'Federated Search',
    ]);

    // Backward-compatible helper `getVisibleMoreToolsGroups` also reflects the flag
    const legacyGroupsFull = getVisibleMoreToolsGroups(true);
    const legacyDetections = legacyGroupsFull.find((g) => g.title === 'Detections');
    expect(legacyDetections?.items.map((i) => i.label)).toContain('Purple Team');
    expect(legacyDetections?.items.map((i) => i.label)).toContain('Deception');
  });

  it('filters tabs and workspaces based on permission metadata', () => {
    const sampleTabs = [
      { label: 'Public Tab', href: '/public' },
      { label: 'Admin Only Tab', href: '/admin-tab', permissions: ['DetectionAdmin'] },
    ];

    expect(filterWorkspaceTabs(sampleTabs, { permissions: ['Analyst'] }).map((t) => t.label)).toEqual([
      'Public Tab',
    ]);
    expect(
      filterWorkspaceTabs(sampleTabs, { permissions: ['DetectionAdmin'] }).map((t) => t.label),
    ).toEqual(['Public Tab', 'Admin Only Tab']);
    expect(filterWorkspaceTabs(sampleTabs, { userRole: 'admin' }).map((t) => t.label)).toEqual([
      'Public Tab',
      'Admin Only Tab',
    ]);
    expect(hasNavigationPermissions(['DetectionAdmin'], { permissions: [] })).toBe(false);
  });

  it('generates accurate Breadcrumbs ("Engineering & Response > Detections > Noise & Tuning") from the route registry', () => {
    pathnameMock.mockReturnValue('/noise-tuning');
    render(<Breadcrumbs />);

    const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumbNav).toBeInTheDocument();

    const segments = resolveBreadcrumbs('/noise-tuning');
    expect(segments.map((s) => s.label)).toEqual([
      'Engineering & Response',
      'Detections',
      'Noise & Tuning',
    ]);

    expect(screen.getByText('Engineering & Response')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Detections' })).toHaveAttribute('href', '/detection');
    expect(screen.getByText('Noise & Tuning')).toHaveAttribute('aria-current', 'page');
  });

  it('supports keyboard arrow navigation across WorkspaceTabBar links', () => {
    pathnameMock.mockReturnValue('/dashboard');
    render(<WorkspaceTabBar />);

    const dashboardTab = screen.getByRole('link', { name: 'Dashboard' });
    const slaTab = screen.getByRole('link', { name: 'SLA Tracker' });
    const complianceTab = screen.getByRole('link', { name: 'Compliance' });

    dashboardTab.focus();
    expect(document.activeElement).toBe(dashboardTab);

    fireEvent.keyDown(dashboardTab, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(slaTab);

    fireEvent.keyDown(slaTab, { key: 'End' });
    expect(document.activeElement).toBe(complianceTab);

    fireEvent.keyDown(complianceTab, { key: 'Home' });
    expect(document.activeElement).toBe(dashboardTab);
  });

  it('emits decoupled analytics events when opening workspaces, switching tabs, or collapsing the sidebar', async () => {
    const events: NavigationAnalyticsPayload[] = [];
    const unsubscribe = subscribeNavigationAnalytics((payload) => events.push(payload));

    pathnameMock.mockReturnValue('/dashboard');
    render(
      <ThemeProvider>
        <Sidebar />
        <WorkspaceTabBar />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole('link', { name: /^incidents$/i }));
    await userEvent.click(screen.getByRole('link', { name: 'SLA Tracker' }));
    window.dispatchEvent(new CustomEvent('aisoc:toggle-sidebar'));

    expect(events.some((e) => e.event === 'workspace_opened' && e.workspaceId === WorkspaceId.Incidents)).toBe(
      true,
    );
    expect(events.some((e) => e.event === 'workspace_tab_changed' && e.tab === 'SLA Tracker')).toBe(
      true,
    );
    expect(events.some((e) => e.event === 'sidebar_collapsed')).toBe(true);

    unsubscribe();
  });

  it('preserves all existing application routes in ROUTE_REGISTRY and WORKSPACE_REGISTRY', () => {
    expect(WORKSPACE_REGISTRY).toHaveLength(8);
    expect(getActiveWorkspace('/alerts')?.id).toBe(WorkspaceId.Alerts);
    expect(getActiveWorkspaceTab('/queue')?.label).toBe('Focus Triage Queue');

    expect(getVisibleWorkspaceTabs('/playbooks').map((t) => t.label)).toEqual([
      'Playbooks',
      'Approval Inbox',
    ]);
    expect(getVisibleWorkspaceTabs('/settings').map((t) => t.label)).toEqual([
      'Platform Settings',
      'Connectors',
      'Marketplace',
      'Users',
      'Access Reviews',
      'Audit Log',
      'AI Evaluation',
      'Cost Estimator',
      'MSSP',
    ]);

    const registeredPaths = new Set(ROUTE_REGISTRY.map((r) => r.path));
    for (const requiredPath of [
      '/dashboard',
      '/sla',
      '/analytics/team',
      '/reports/digest',
      '/compliance',
      '/alerts',
      '/queue',
      '/cases',
      '/shifts',
      '/hunt',
      '/threat-intel',
      '/graph',
      '/explore',
      '/federated-search',
      '/identity/permissions',
      '/easm',
      '/fim',
      '/ai-estate',
      '/detection',
      '/detection/catalog',
      '/coverage-advisor',
      '/noise-tuning',
      '/detection/proposals',
      '/purple-team',
      '/honeytokens',
      '/playbooks',
      '/responder/approvals',
      '/settings',
      '/connectors',
      '/marketplace',
      '/settings/users',
      '/access-review',
      '/audit',
      '/evaluate',
      '/costs',
      '/mssp',
    ]) {
      expect(registeredPaths.has(requiredPath)).toBe(true);
    }

    const noiseMeta = resolveRouteMetadata('/noise-tuning');
    expect(noiseMeta.workspace).toBe(WorkspaceId.Detections);
    expect(noiseMeta.tab).toBe('Noise & Tuning');
  });

  it('renders the light/dark switch and the user card in the sidebar footer', async () => {
    render(
      <ThemeProvider>
        <Sidebar />
      </ThemeProvider>,
    );

    const themeSwitch = screen.getByRole('switch', { name: /toggle dark mode/i });
    // Dark is the console default, so the switch starts checked.
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');

    // Toggles cleanly between dark and light in both directions without getting
    // stuck on a 'system' intermediate state.
    await userEvent.click(themeSwitch);
    expect(themeSwitch).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(themeSwitch);
    expect(themeSwitch).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    expect(screen.getByText('SOC Analyst')).toBeInTheDocument();
    expect(screen.getByText('analyst@clops.local')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});
