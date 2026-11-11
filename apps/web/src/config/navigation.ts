/**
 * Centralized Enterprise AI-SOC Navigation Registry
 *
 * Single source of truth for the 8 Primary Sidebar Workspaces, their
 * context-aware Horizontal Workspace Tabs, segment-safe route matching,
 * feature-flag filtering, and permission gating.
 *
 * Zero hardcoded URLs should exist in layout components; all navigation
 * consumers (Sidebar, WorkspaceTabBar, TopBar, Breadcrumbs, CommandPalette)
 * derive their state from this registry and `routeRegistry.ts`.
 */

import { isFullIntelligenceEnabled, isOrgTemplateEnabled, isExternalIdpEnabled } from './features';

export enum WorkspaceId {
  CommandCenter = 'command-center',
  Alerts = 'alerts',
  Incidents = 'incidents',
  HuntingIntel = 'hunting-intel',
  AssetsIdentities = 'assets-identities',
  Detections = 'detections',
  Automation = 'automation',
  SettingsAdmin = 'settings-admin',
}

export enum WorkspaceSection {
  Operations = 'Operations',
  Investigation = 'Investigation',
  EngineeringAndResponse = 'Engineering & Response',
  Platform = 'Platform',
}

export type IconType =
  | 'command-center'
  | 'alerts'
  | 'incidents'
  | 'hunting-intel'
  | 'assets-identities'
  | 'detections'
  | 'automation'
  | 'settings-admin';

export type NavigationFeatureFlag = 'fullIntelligence' | 'orgTemplate' | 'externalIdp';

export interface WorkspaceTabItem {
  readonly label: string;
  readonly href: string;
  readonly badge?: string;
  readonly enabled?: boolean;
  readonly exact?: boolean;
  readonly featureFlag?: NavigationFeatureFlag;
  readonly permissions?: readonly string[];
  readonly matchPrefixes?: readonly string[];
}

export interface PrimaryWorkspaceItem {
  readonly id: WorkspaceId;
  /** Section header rendered above the first item of each group in the Sidebar. */
  readonly section?: WorkspaceSection;
  /** Canonical section group this workspace belongs to (used in Breadcrumbs). */
  readonly sectionGroup: WorkspaceSection;
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly icon: IconType;
  readonly matchPrefixes: readonly string[];
  readonly tabs: readonly WorkspaceTabItem[];
  readonly featureFlag?: NavigationFeatureFlag;
  readonly permissions?: readonly string[];
}

export interface NavigationFilterOptions {
  readonly fullIntelligence?: boolean;
  readonly permissions?: readonly string[];
  readonly userRole?: string | null;
}

/**
 * Normalizes a pathname by stripping query parameters, hash fragments, and
 * trailing slashes (except for the root `/` path).
 */
export function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] ?? '/';
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || '/';
}

/**
 * Segment-aware route matcher.
 *
 * Avoids naive `pathname.startsWith(prefix)` false positives (e.g. `/alerts-v2`
 * will NOT match `/alerts`).
 */
export function matchesRoutePrefix(
  pathname: string,
  prefix: string,
  exact = false,
): boolean {
  const cleanPath = normalizePath(pathname);
  const cleanPrefix = normalizePath(prefix);

  if (cleanPrefix === '/') {
    return cleanPath === '/';
  }
  if (exact) {
    return cleanPath === cleanPrefix;
  }
  return cleanPath === cleanPrefix || cleanPath.startsWith(`${cleanPrefix}/`);
}

/**
 * Evaluates a named feature flag against centralized feature configuration.
 */
export function isNavigationFeatureEnabled(
  flag: NavigationFeatureFlag | undefined,
  options?: NavigationFilterOptions,
): boolean {
  if (!flag) return true;
  if (flag === 'fullIntelligence') {
    return options?.fullIntelligence !== undefined
      ? options.fullIntelligence
      : isFullIntelligenceEnabled();
  }
  if (flag === 'orgTemplate') {
    return isOrgTemplateEnabled();
  }
  if (flag === 'externalIdp') {
    return isExternalIdpEnabled();
  }
  return true;
}

/**
 * Evaluates permission metadata against the current operator's permissions/role.
 * Items without `permissions` metadata are accessible to all authenticated SOC roles.
 */
export function hasNavigationPermissions(
  requiredPermissions: readonly string[] | undefined,
  options?: NavigationFilterOptions,
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  const granted = options?.permissions;
  const role = options?.userRole?.toLowerCase();

  // Platform admins satisfy all workspace permission gates.
  if (role === 'admin' || role === 'superadmin' || role === 'owner') {
    return true;
  }

  if (!granted || granted.length === 0) {
    // If no explicit permissions array was supplied, check if the userRole
    // matches any required permission token case-insensitively.
    if (role) {
      return requiredPermissions.some((req) => req.toLowerCase() === role);
    }
    return false;
  }

  const normalizedGranted = new Set(granted.map((p) => p.toLowerCase()));
  if (normalizedGranted.has('*') || normalizedGranted.has('admin')) {
    return true;
  }

  return requiredPermissions.every((req) => normalizedGranted.has(req.toLowerCase()));
}

/**
 * Immutable registry of the 8 Primary Enterprise AI-SOC Workspaces.
 */
export const WORKSPACE_REGISTRY: readonly PrimaryWorkspaceItem[] = Object.freeze([
  // ─── Operations ─────────────────────────────────────────────────────────────
  Object.freeze({
    id: WorkspaceId.CommandCenter,
    section: WorkspaceSection.Operations,
    sectionGroup: WorkspaceSection.Operations,
    label: 'Command Center',
    description: 'SOC overview, SLA posture, team analytics, and compliance reporting',
    href: '/dashboard',
    icon: 'command-center',
    matchPrefixes: Object.freeze([
      '/dashboard',
      '/dashboards',
      '/sla',
      '/analytics/team',
      '/reports/digest',
      '/compliance',
      '/onboarding',
    ]),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Dashboard',
        href: '/dashboard',
        matchPrefixes: Object.freeze(['/dashboard', '/dashboards']),
      }),
      Object.freeze({
        label: 'SLA Tracker',
        href: '/sla',
      }),
      Object.freeze({
        label: 'Team Analytics',
        href: '/analytics/team',
      }),
      Object.freeze({
        label: 'Executive Digest',
        href: '/reports/digest',
      }),
      Object.freeze({
        label: 'Compliance',
        href: '/compliance',
      }),
    ]),
  }),

  Object.freeze({
    id: WorkspaceId.Alerts,
    sectionGroup: WorkspaceSection.Operations,
    label: 'Alerts',
    description: 'Real-time security alert stream and rapid keyboard triage queue',
    href: '/alerts',
    icon: 'alerts',
    matchPrefixes: Object.freeze(['/alerts', '/queue']),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Alert Stream',
        href: '/alerts',
      }),
      Object.freeze({
        label: 'Focus Triage Queue',
        href: '/queue',
      }),
    ]),
  }),

  Object.freeze({
    id: WorkspaceId.Incidents,
    sectionGroup: WorkspaceSection.Operations,
    label: 'Incidents',
    description: 'Correlated multi-alert incident cases and shift handoff workflows',
    href: '/cases',
    icon: 'incidents',
    matchPrefixes: Object.freeze(['/cases', '/shifts']),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Active Incidents',
        href: '/cases',
      }),
      Object.freeze({
        label: 'Shift Handoff',
        href: '/shifts',
      }),
    ]),
  }),

  // ─── Investigation ──────────────────────────────────────────────────────────
  Object.freeze({
    id: WorkspaceId.HuntingIntel,
    section: WorkspaceSection.Investigation,
    sectionGroup: WorkspaceSection.Investigation,
    label: 'Hunting & Intel',
    description: 'Proactive threat hunting, IOC intelligence, attack graph, and data lake search',
    href: '/hunt',
    icon: 'hunting-intel',
    matchPrefixes: Object.freeze([
      '/hunt',
      '/threat-intel',
      '/graph',
      '/explore',
      '/federated-search',
      '/investigate',
    ]),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Threat Hunt',
        href: '/hunt',
        matchPrefixes: Object.freeze(['/hunt', '/investigate']),
      }),
      Object.freeze({
        label: 'Threat Intelligence',
        href: '/threat-intel',
      }),
      Object.freeze({
        label: 'Attack Graph',
        href: '/graph',
      }),
      Object.freeze({
        label: 'Data Lake Explorer',
        href: '/explore',
        featureFlag: 'fullIntelligence',
      }),
      Object.freeze({
        label: 'Federated Search',
        href: '/federated-search',
        featureFlag: 'fullIntelligence',
      }),
    ]),
  }),

  Object.freeze({
    id: WorkspaceId.AssetsIdentities,
    sectionGroup: WorkspaceSection.Investigation,
    label: 'Assets & Identities',
    description: 'Identity blast radius, external attack surface, file integrity, and AI posture',
    href: '/identity/permissions',
    icon: 'assets-identities',
    matchPrefixes: Object.freeze([
      '/identity/permissions',
      '/identity',
      '/easm',
      '/fim',
      '/ai-estate',
    ]),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Identities',
        href: '/identity/permissions',
        matchPrefixes: Object.freeze(['/identity/permissions', '/identity']),
      }),
      Object.freeze({
        label: 'EASM',
        href: '/easm',
      }),
      Object.freeze({
        label: 'FIM',
        href: '/fim',
      }),
      Object.freeze({
        label: 'AI Estate',
        href: '/ai-estate',
        featureFlag: 'fullIntelligence',
      }),
    ]),
  }),

  // ─── Engineering & Response ─────────────────────────────────────────────────
  Object.freeze({
    id: WorkspaceId.Detections,
    section: WorkspaceSection.EngineeringAndResponse,
    sectionGroup: WorkspaceSection.EngineeringAndResponse,
    label: 'Detections',
    description: 'Detection rules, ATT&CK coverage, noise tuning, proposals, and validation',
    href: '/detection',
    icon: 'detections',
    matchPrefixes: Object.freeze([
      '/detection',
      '/coverage-advisor',
      '/noise-tuning',
      '/purple-team',
      '/honeytokens',
    ]),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Active Rules',
        href: '/detection',
        exact: true,
        matchPrefixes: Object.freeze(['/detection/new']),
      }),
      Object.freeze({
        label: 'Rule Catalog',
        href: '/detection/catalog',
      }),
      Object.freeze({
        label: 'ATT&CK Coverage',
        href: '/coverage-advisor',
        matchPrefixes: Object.freeze(['/coverage-advisor', '/detection/coverage']),
      }),
      Object.freeze({
        label: 'Noise & Tuning',
        href: '/noise-tuning',
        matchPrefixes: Object.freeze(['/noise-tuning', '/detection/tuning']),
      }),
      Object.freeze({
        label: 'Rule Proposals',
        href: '/detection/proposals',
      }),
      Object.freeze({
        label: 'Purple Team',
        href: '/purple-team',
        featureFlag: 'fullIntelligence',
      }),
      Object.freeze({
        label: 'Deception',
        href: '/honeytokens',
        featureFlag: 'fullIntelligence',
      }),
    ]),
  }),

  Object.freeze({
    id: WorkspaceId.Automation,
    sectionGroup: WorkspaceSection.EngineeringAndResponse,
    label: 'Automation',
    description: 'Governed SOAR playbooks, automated response runs, and human approvals',
    href: '/playbooks',
    icon: 'automation',
    matchPrefixes: Object.freeze(['/playbooks', '/responder/approvals']),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Playbooks',
        href: '/playbooks',
      }),
      Object.freeze({
        label: 'Approval Inbox',
        href: '/responder/approvals',
      }),
    ]),
  }),

  // ─── Platform ───────────────────────────────────────────────────────────────
  Object.freeze({
    id: WorkspaceId.SettingsAdmin,
    section: WorkspaceSection.Platform,
    sectionGroup: WorkspaceSection.Platform,
    label: 'Settings & Admin',
    description: 'Platform configuration, connectors, marketplace, users, audit log, and MSSP',
    href: '/settings',
    icon: 'settings-admin',
    matchPrefixes: Object.freeze([
      '/settings',
      '/connectors',
      '/marketplace',
      '/access-review',
      '/audit',
      '/evaluate',
      '/costs',
      '/mssp',
    ]),
    tabs: Object.freeze([
      Object.freeze({
        label: 'Platform Settings',
        href: '/settings',
        exact: true,
        matchPrefixes: Object.freeze([
          '/settings/mfa',
          '/settings/business-context',
        ]),
      }),
      Object.freeze({
        label: 'Connectors',
        href: '/connectors',
      }),
      Object.freeze({
        label: 'Marketplace',
        href: '/marketplace',
      }),
      Object.freeze({
        label: 'Users',
        href: '/settings/users',
        matchPrefixes: Object.freeze(['/settings/users', '/settings/rbac']),
      }),
      Object.freeze({
        label: 'Access Reviews',
        href: '/access-review',
      }),
      Object.freeze({
        label: 'Audit Log',
        href: '/audit',
      }),
      Object.freeze({
        label: 'AI Evaluation',
        href: '/evaluate',
      }),
      Object.freeze({
        label: 'Cost Estimator',
        href: '/costs',
      }),
      Object.freeze({
        label: 'MSSP',
        href: '/mssp',
      }),
    ]),
  }),
]);

/**
 * Filters a workspace's tabs according to `enabled`, `featureFlag`, and `permissions`.
 */
export function filterWorkspaceTabs(
  tabs: readonly WorkspaceTabItem[],
  options?: NavigationFilterOptions,
): WorkspaceTabItem[] {
  return tabs.filter((tab) => {
    if (tab.enabled === false) return false;
    if (!isNavigationFeatureEnabled(tab.featureFlag, options)) return false;
    if (!hasNavigationPermissions(tab.permissions, options)) return false;
    return true;
  });
}

/**
 * Returns the filtered list of primary workspaces (maximum 8) with their
 * visible tabs resolved for the current feature-flag and permission context.
 */
export function getPrimaryWorkspaces(
  options?: NavigationFilterOptions,
): PrimaryWorkspaceItem[] {
  return WORKSPACE_REGISTRY.filter((ws) => {
    if (!isNavigationFeatureEnabled(ws.featureFlag, options)) return false;
    if (!hasNavigationPermissions(ws.permissions, options)) return false;
    return true;
  }).map((ws) => ({
    ...ws,
    tabs: filterWorkspaceTabs(ws.tabs, options),
  }));
}

/**
 * Determines whether a given workspace is active for `pathname`.
 */
export function isWorkspaceActive(
  workspace: PrimaryWorkspaceItem,
  pathname: string,
): boolean {
  const cleanPath = normalizePath(pathname);
  if (cleanPath === '/' && workspace.id === WorkspaceId.CommandCenter) {
    return true;
  }
  return workspace.matchPrefixes.some((prefix) => matchesRoutePrefix(cleanPath, prefix));
}

/**
 * Resolves the active `PrimaryWorkspaceItem` for a given `pathname`.
 */
export function getActiveWorkspace(
  pathname: string,
  options?: NavigationFilterOptions,
): PrimaryWorkspaceItem | null {
  const workspaces = getPrimaryWorkspaces(options);
  return workspaces.find((ws) => isWorkspaceActive(ws, pathname)) ?? null;
}

/**
 * Resolves the visible horizontal `WorkspaceTabItem[]` for the active workspace
 * corresponding to `pathname`.
 */
export function getVisibleWorkspaceTabs(
  pathname: string,
  options?: NavigationFilterOptions,
): WorkspaceTabItem[] {
  const workspace = getActiveWorkspace(pathname, options);
  return workspace ? [...workspace.tabs] : [];
}

/**
 * Determines whether a specific `WorkspaceTabItem` is active for `pathname`.
 * Checks specific sibling tabs first so `/detection/catalog` activates
 * `Rule Catalog` rather than `Active Rules` (`/detection`).
 */
export function isWorkspaceTabActive(
  tab: WorkspaceTabItem,
  allTabs: readonly WorkspaceTabItem[],
  pathname: string,
): boolean {
  const cleanPath = normalizePath(pathname);

  // 1. Exact match on tab href or explicit matchPrefixes
  if (cleanPath === normalizePath(tab.href)) {
    return true;
  }
  if (tab.matchPrefixes?.some((prefix) => matchesRoutePrefix(cleanPath, prefix))) {
    return true;
  }

  // 2. If another sibling tab has a more specific prefix match, yield to that sibling
  const otherSiblingMatches = allTabs.some(
    (other) =>
      other.href !== tab.href &&
      (matchesRoutePrefix(cleanPath, other.href) ||
        (other.matchPrefixes?.some((p) => matchesRoutePrefix(cleanPath, p)) ?? false)),
  );
  if (otherSiblingMatches) {
    return false;
  }

  // 3. Fallback: even if `tab.exact` is true (e.g. `/detection`), child detail
  // routes that don't match any sibling tab (e.g. `/detection/rule-123`)
  // highlight the primary parent tab!
  return matchesRoutePrefix(cleanPath, tab.href, false);
}

/**
 * Returns the active `WorkspaceTabItem` for a given `pathname` within the
 * resolved workspace, or `null` if no workspace matches.
 */
export function getActiveWorkspaceTab(
  pathname: string,
  options?: NavigationFilterOptions,
): WorkspaceTabItem | null {
  const workspace = getActiveWorkspace(pathname, options);
  if (!workspace) return null;
  return (
    workspace.tabs.find((tab) => isWorkspaceTabActive(tab, workspace.tabs, pathname)) ??
    workspace.tabs[0] ??
    null
  );
}
