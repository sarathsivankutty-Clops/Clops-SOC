/**
 * Centralized Route Metadata Registry
 *
 * Maps application paths to their workspace, active tab, page title,
 * description, feature flags, and permission requirements.
 *
 * Consumed by:
 *   - TopBar (dynamic page title & description)
 *   - Breadcrumbs (`Section > Workspace > Tab / Page`)
 *   - CommandPalette (`⌘K` navigation search)
 *   - WorkspaceTabBar & Sidebar
 */

import {
  WorkspaceId,
  WorkspaceSection,
  WORKSPACE_REGISTRY,
  getActiveWorkspace,
  getActiveWorkspaceTab,
  hasNavigationPermissions,
  isNavigationFeatureEnabled,
  matchesRoutePrefix,
  normalizePath,
  type NavigationFeatureFlag,
  type NavigationFilterOptions,
} from './navigation';

export interface RouteRegistryEntry {
  readonly path: string;
  readonly workspace: WorkspaceId;
  readonly tab: string;
  readonly activeTab: string;
  readonly title: string;
  readonly description: string;
  readonly featureFlag?: NavigationFeatureFlag;
  readonly permissions?: readonly string[];
  readonly keywords?: readonly string[];
  readonly showInCommandPalette?: boolean;
}

export interface ResolvedRouteMetadata {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly workspace: WorkspaceId | null;
  readonly workspaceLabel: string | null;
  readonly workspaceHref: string | null;
  readonly section: WorkspaceSection | null;
  readonly tab: string | null;
  readonly activeTabHref: string | null;
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
  readonly current?: boolean;
}

function createRouteEntry(
  entry: Omit<RouteRegistryEntry, 'activeTab'> & { activeTab?: string },
): RouteRegistryEntry {
  return Object.freeze({
    ...entry,
    activeTab: entry.activeTab ?? entry.tab,
    keywords: entry.keywords ? Object.freeze([...entry.keywords]) : undefined,
    permissions: entry.permissions ? Object.freeze([...entry.permissions]) : undefined,
  });
}

/**
 * Immutable route registry ordered from most specific nested paths to top-level
 * workspace paths so segment-aware lookup always resolves the most specific match.
 */
export const ROUTE_REGISTRY: readonly RouteRegistryEntry[] = Object.freeze([
  // ─── Detections Nested Routes ───────────────────────────────────────────────
  createRouteEntry({
    path: '/detection/catalog',
    workspace: WorkspaceId.Detections,
    tab: 'Rule Catalog',
    title: 'Detection Catalog',
    description: 'Curated rule packs and templates',
    keywords: ['catalog', 'packs', 'sigma', 'templates'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/detection/proposals',
    workspace: WorkspaceId.Detections,
    tab: 'Rule Proposals',
    title: 'Rule Proposals',
    description: 'Review and approve proposed detection rule changes',
    keywords: ['proposals', 'review', 'rules', 'pr'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/detection/coverage',
    workspace: WorkspaceId.Detections,
    tab: 'ATT&CK Coverage',
    title: 'ATT&CK Coverage',
    description: 'MITRE ATT&CK matrix coverage and telemetry gap analysis',
    keywords: ['mitre', 'attack', 'coverage', 'matrix'],
    showInCommandPalette: false,
  }),
  createRouteEntry({
    path: '/detection/tuning',
    workspace: WorkspaceId.Detections,
    tab: 'Noise & Tuning',
    title: 'Noise & Tuning',
    description: 'False-positive suppression and threshold tuning recommendations',
    keywords: ['tuning', 'noise', 'false positive'],
    showInCommandPalette: false,
  }),
  createRouteEntry({
    path: '/detection/new',
    workspace: WorkspaceId.Detections,
    tab: 'Active Rules',
    title: 'New Detection Rule',
    description: 'Author and validate a new detection rule',
    keywords: ['new rule', 'author', 'sigma'],
    showInCommandPalette: false,
  }),

  // ─── Settings Nested Routes ─────────────────────────────────────────────────
  createRouteEntry({
    path: '/settings/rbac',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Users',
    title: 'Roles & Permissions',
    description: 'Access control and team management',
    keywords: ['rbac', 'roles', 'permissions', 'access'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/settings/mfa',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Platform Settings',
    title: 'Two-factor authentication',
    description: 'Your second factor, and whether this tenant requires one',
    keywords: ['mfa', '2fa', 'totp', 'security'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/settings/users',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Users',
    title: 'Users',
    description: 'Member and role management',
    keywords: ['users', 'team', 'members', 'invite'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/settings/business-context',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Platform Settings',
    title: 'Business Context',
    description: 'Critical assets, crown jewels, and organisational risk context',
    keywords: ['business', 'context', 'crown jewels'],
    showInCommandPalette: false,
  }),

  // ─── Command Center Nested & Sibling Routes ─────────────────────────────────
  createRouteEntry({
    path: '/dashboards/operations',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Dashboard',
    title: 'SOC Operations Dashboard',
    description: 'Operational queue depth, analyst throughput, and shift metrics',
    keywords: ['operations', 'dashboard', 'metrics'],
    showInCommandPalette: false,
  }),
  createRouteEntry({
    path: '/dashboards/soc-insights',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Dashboard',
    title: 'SOC Insights',
    description: 'Executive security posture and automation efficiency insights',
    keywords: ['insights', 'executive', 'posture'],
    showInCommandPalette: false,
  }),
  createRouteEntry({
    path: '/analytics/team',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Team Analytics',
    title: 'Team Analytics',
    description: 'Analyst workload distribution, MTTR trends, and triage velocity',
    keywords: ['team', 'analytics', 'workload', 'mttr'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/reports/digest',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Executive Digest',
    title: 'Executive Digest',
    description: 'Periodic CISO summary of incidents, SLA compliance, and risk posture',
    keywords: ['digest', 'executive', 'reports', 'ciso'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/compliance',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Compliance',
    title: 'Compliance',
    description: 'Frameworks, controls, and evidence',
    keywords: ['compliance', 'soc2', 'iso27001', 'nist', 'pci'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/sla',
    workspace: WorkspaceId.CommandCenter,
    tab: 'SLA Tracker',
    title: 'SLA Tracking',
    description: 'Response time targets and breach risk',
    keywords: ['sla', 'mtta', 'mttr', 'breach'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/onboarding',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Dashboard',
    title: 'Onboarding',
    description: 'Platform setup checklist and initial data source verification',
    keywords: ['onboarding', 'setup', 'getting started'],
    showInCommandPalette: false,
  }),
  createRouteEntry({
    path: '/dashboard',
    workspace: WorkspaceId.CommandCenter,
    tab: 'Dashboard',
    title: 'Dashboard',
    description: 'SOC overview and metrics',
    keywords: ['home', 'overview', 'metrics', 'command center'],
    showInCommandPalette: true,
  }),

  // ─── Alerts & Triage Routes ─────────────────────────────────────────────────
  createRouteEntry({
    path: '/queue',
    workspace: WorkspaceId.Alerts,
    tab: 'Focus Triage Queue',
    title: 'Focus Triage Queue',
    description: 'High-velocity keyboard-driven alert disposition queue',
    keywords: ['queue', 'triage', 'focus'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/alerts',
    workspace: WorkspaceId.Alerts,
    tab: 'Alert Stream',
    title: 'Alerts',
    description: 'Security alerts and incidents',
    keywords: ['notifications', 'incidents', 'alerts', 'triage'],
    showInCommandPalette: true,
  }),

  // ─── Incidents & Cases Routes ───────────────────────────────────────────────
  createRouteEntry({
    path: '/shifts',
    workspace: WorkspaceId.Incidents,
    tab: 'Shift Handoff',
    title: 'Shift Handoff',
    description: 'Incoming and outgoing SOC shift briefings and open escalations',
    keywords: ['shifts', 'handoff', 'rotation'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/cases',
    workspace: WorkspaceId.Incidents,
    tab: 'Active Incidents',
    title: 'Cases',
    description: 'Incident case management',
    keywords: ['investigations', 'tickets', 'cases', 'incidents'],
    showInCommandPalette: true,
  }),

  // ─── Hunting & Intel Routes ─────────────────────────────────────────────────
  createRouteEntry({
    path: '/threat-intel',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Threat Intelligence',
    title: 'Threat Intelligence',
    description: 'IOC lookup and threat feeds',
    keywords: ['ioc', 'feeds', 'cti', 'kev', 'threat intel'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/graph',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Attack Graph',
    title: 'Attack Graph',
    description: 'Visualize relationships across alerts and assets',
    keywords: ['graph', 'paths', 'cytoscape', 'blast radius'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/explore',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Data Lake Explorer',
    title: 'Data Lake Explorer',
    description: 'Query raw OCSF security events in the ClickHouse lake',
    featureFlag: 'fullIntelligence',
    keywords: ['data explorer', 'lake', 'sql', 'bi', 'query', 'identity', 'intel'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/federated-search',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Federated Search',
    title: 'Federated Search',
    description: 'Cross-source federated query execution across remote connectors',
    featureFlag: 'fullIntelligence',
    keywords: ['federated', 'remote search', 'query'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/investigate',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Threat Hunt',
    title: 'Investigate',
    description: 'AI-assisted threat hunt and investigation workbench',
    keywords: ['investigate', 'hunt'],
    showInCommandPalette: false,
  }),
  createRouteEntry({
    path: '/hunt',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Threat Hunt',
    title: 'Threat Hunting',
    description: 'Proactive threat hunts and queries',
    keywords: ['threat hunting', 'search', 'kql', 'esql', 'hunt'],
    showInCommandPalette: true,
  }),

  // ─── Assets & Identities Routes ─────────────────────────────────────────────
  createRouteEntry({
    path: '/identity/permissions',
    workspace: WorkspaceId.AssetsIdentities,
    tab: 'Identities',
    title: 'Identities & Blast Radius',
    description: 'Effective IAM permissions, privilege paths, and identity risk',
    keywords: ['identity', 'permissions', 'iam', 'blast radius', 'assets'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/easm',
    workspace: WorkspaceId.AssetsIdentities,
    tab: 'EASM',
    title: 'External Attack Surface',
    description: 'Internet-facing assets, exposed services, and certificate posture',
    keywords: ['easm', 'attack surface', 'external', 'assets'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/fim',
    workspace: WorkspaceId.AssetsIdentities,
    tab: 'FIM',
    title: 'File Integrity Monitoring',
    description: 'Real-time file creation, modification, and hash monitoring across hosts',
    keywords: ['fim', 'file integrity', 'osquery', 'hosts'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/ai-estate',
    workspace: WorkspaceId.AssetsIdentities,
    tab: 'AI Estate',
    title: 'AI Estate',
    description: 'Observed AI apps, agents, MCP servers, keys and grants',
    featureFlag: 'fullIntelligence',
    keywords: ['ai', 'estate', 'llm', 'mcp'],
    showInCommandPalette: true,
  }),

  // ─── Detections Top-Level & Sibling Routes ──────────────────────────────────
  createRouteEntry({
    path: '/coverage-advisor',
    workspace: WorkspaceId.Detections,
    tab: 'ATT&CK Coverage',
    title: 'ATT&CK Coverage',
    description: 'MITRE ATT&CK coverage matrix and AI gap recommendations',
    keywords: ['coverage', 'advisor', 'mitre', 'attack'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/noise-tuning',
    workspace: WorkspaceId.Detections,
    tab: 'Noise & Tuning',
    title: 'Noise & Tuning',
    description: 'Detection noise reduction, threshold tuning, and suppression analysis',
    keywords: ['noise', 'tuning', 'false positive', 'suppression'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/purple-team',
    workspace: WorkspaceId.Detections,
    tab: 'Purple Team',
    title: 'Purple Team',
    description: 'Adversary emulation and detection coverage',
    featureFlag: 'fullIntelligence',
    keywords: ['purple team', 'bas', 'simulation', 'atomic'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/honeytokens',
    workspace: WorkspaceId.Detections,
    tab: 'Deception',
    title: 'Honeytokens',
    description: 'Deception assets and trip-wire alerts',
    featureFlag: 'fullIntelligence',
    keywords: ['honeytokens', 'deception', 'canary', 'tripwire'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/detection',
    workspace: WorkspaceId.Detections,
    tab: 'Active Rules',
    title: 'Detection Rules',
    description: 'SIEM detection rules and tuning',
    keywords: ['rules', 'detections', 'sigma'],
    showInCommandPalette: true,
  }),

  // ─── Automation & Response Routes ───────────────────────────────────────────
  createRouteEntry({
    path: '/responder/approvals',
    workspace: WorkspaceId.Automation,
    tab: 'Approval Inbox',
    title: 'Approval Inbox',
    description: 'Human-in-the-loop governance queue for high-impact response actions',
    keywords: ['approvals', 'inbox', 'responder', 'governance'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/playbooks',
    workspace: WorkspaceId.Automation,
    tab: 'Playbooks',
    title: 'Playbooks',
    description: 'Automated response and SOAR workflows',
    keywords: ['playbooks', 'runbooks', 'soar', 'automation'],
    showInCommandPalette: true,
  }),

  // ─── Platform, Settings & Contextual Routes ─────────────────────────────────
  createRouteEntry({
    path: '/copilot',
    workspace: WorkspaceId.HuntingIntel,
    tab: 'Threat Hunt',
    title: 'AI Copilot',
    description: 'AI-assisted investigation and triage',
    keywords: ['assistant', 'chat', 'ai', 'copilot'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/connectors',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Connectors',
    title: 'Connectors',
    description: 'Security tool integrations',
    keywords: ['integrations', 'sources', 'connectors', 'ingestion'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/marketplace',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Marketplace',
    title: 'Marketplace',
    description: 'Plugins, integrations, and content packs',
    keywords: ['marketplace', 'plugins', 'integrations', 'packs'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/access-review',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Access Reviews',
    title: 'Access Reviews',
    description: 'Periodic entitlement certification and privilege review campaigns',
    keywords: ['access review', 'entitlements', 'governance'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/audit',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Audit Log',
    title: 'Audit Log',
    description: 'Platform activity and security events',
    keywords: ['audit', 'log', 'activity', 'security events'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/evaluate',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'AI Evaluation',
    title: 'AI Evaluation',
    description: 'Benchmark and calibrate agent triage accuracy against golden datasets',
    keywords: ['evaluate', 'harness', 'benchmark', 'ai'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/costs',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Cost Estimator',
    title: 'Cost Estimator',
    description: 'Ingestion volume, retention, and compute resource estimation',
    keywords: ['costs', 'billing', 'estimator', 'usage'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/mssp',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'MSSP',
    title: 'MSSP Overview',
    description: 'Multi-tenant operational posture and child-tenant management',
    keywords: ['mssp', 'tenants', 'multi-tenant'],
    showInCommandPalette: true,
  }),
  createRouteEntry({
    path: '/settings',
    workspace: WorkspaceId.SettingsAdmin,
    tab: 'Platform Settings',
    title: 'Settings',
    description: 'Platform configuration',
    keywords: ['preferences', 'profile', 'tenant', 'settings', 'admin'],
    showInCommandPalette: true,
  }),
]);

/**
 * Formats an unknown URL path segment (e.g. `/some-new-page`) into a sensible
 * human-readable title (`Some New Page`).
 */
export function humanizeRouteSegment(pathname: string): string {
  const clean = normalizePath(pathname);
  const segment = clean.split('/').filter(Boolean)[0] ?? '';
  if (!segment) return 'Dashboard';
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Looks up the most specific `RouteRegistryEntry` matching `pathname` using
 * segment-aware matching.
 */
export function findRouteRegistryEntry(
  pathname: string,
): RouteRegistryEntry | null {
  const cleanPath = normalizePath(pathname);
  if (cleanPath === '/') {
    return ROUTE_REGISTRY.find((r) => r.path === '/dashboard') ?? null;
  }
  return (
    ROUTE_REGISTRY.find((entry) => matchesRoutePrefix(cleanPath, entry.path)) ??
    null
  );
}

/**
 * Resolves full route metadata (`title`, `description`, `workspace`, `section`,
 * `tab`, `activeTabHref`) for any given `pathname`.
 */
export function resolveRouteMetadata(
  pathname: string,
  options?: NavigationFilterOptions,
): ResolvedRouteMetadata {
  const cleanPath = normalizePath(pathname);
  const entry = findRouteRegistryEntry(cleanPath);
  const activeWorkspace =
    getActiveWorkspace(cleanPath, options) ??
    (entry
      ? WORKSPACE_REGISTRY.find((ws) => ws.id === entry.workspace) ?? null
      : null);
  const activeTab = getActiveWorkspaceTab(cleanPath, options);

  if (entry) {
    return {
      path: cleanPath,
      title: entry.title,
      description: entry.description,
      workspace: activeWorkspace?.id ?? entry.workspace,
      workspaceLabel: activeWorkspace?.label ?? null,
      workspaceHref: activeWorkspace?.href ?? null,
      section: activeWorkspace?.sectionGroup ?? null,
      tab: activeTab?.label ?? entry.tab,
      activeTabHref: activeTab?.href ?? entry.path,
    };
  }

  return {
    path: cleanPath,
    title: humanizeRouteSegment(cleanPath),
    description: activeWorkspace?.description ?? '',
    workspace: activeWorkspace?.id ?? null,
    workspaceLabel: activeWorkspace?.label ?? null,
    workspaceHref: activeWorkspace?.href ?? null,
    section: activeWorkspace?.sectionGroup ?? null,
    tab: activeTab?.label ?? null,
    activeTabHref: activeTab?.href ?? null,
  };
}

/**
 * Generates contextual breadcrumb segments (`Section > Workspace > Tab [> Detail Page]`)
 * entirely from the central route and workspace registries.
 *
 * Example for `/noise-tuning`:
 *   1. `Engineering & Response` (Section)
 *   2. `Detections` (`/detection`)
 *   3. `Noise & Tuning` (`/noise-tuning`, `current: true`)
 */
export function resolveBreadcrumbs(
  pathname: string,
  options?: NavigationFilterOptions,
): BreadcrumbItem[] {
  const meta = resolveRouteMetadata(pathname, options);
  const items: BreadcrumbItem[] = [];

  if (meta.section) {
    items.push({
      label: meta.section,
    });
  }

  if (meta.workspaceLabel && meta.workspaceHref) {
    const hasDistinctTab = Boolean(
      meta.tab && meta.tab.toLowerCase() !== meta.workspaceLabel.toLowerCase(),
    );
    const hasDistinctPage = Boolean(
      meta.title &&
        meta.title.toLowerCase() !== meta.workspaceLabel.toLowerCase() &&
        meta.title.toLowerCase() !== (meta.tab ?? '').toLowerCase(),
    );

    items.push({
      label: meta.workspaceLabel,
      href: meta.workspaceHref,
      current: !hasDistinctTab && !hasDistinctPage,
    });

    if (meta.tab) {
      items.push({
        label: meta.tab,
        href: meta.activeTabHref ?? meta.path,
        current: !hasDistinctPage,
      });
    }

    if (hasDistinctPage) {
      items.push({
        label: meta.title,
        href: meta.path,
        current: true,
      });
    }

    return items;
  }

  // Fallback for unmapped routes
  items.push({
    label: meta.title,
    href: meta.path,
    current: true,
  });

  return items;
}

/**
 * Returns filtered navigation entries for the Command Palette (`⌘K`).
 */
export function getCommandPaletteNavigationItems(
  options?: NavigationFilterOptions,
): RouteRegistryEntry[] {
  const seenPaths = new Set<string>();
  return ROUTE_REGISTRY.filter((entry) => {
    if (!entry.showInCommandPalette) return false;
    if (!isNavigationFeatureEnabled(entry.featureFlag, options)) return false;
    if (!hasNavigationPermissions(entry.permissions, options)) return false;
    if (seenPaths.has(entry.path)) return false;
    seenPaths.add(entry.path);
    return true;
  });
}
