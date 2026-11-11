# AiSOC console redesign — work log

Reference implementation: `ui_src_final` (SREOps console) — Shell.tsx, ui.tsx,
styles/app.css, screens/Overview.tsx, Incidents.tsx, IncidentDetail.tsx,
ActionCenter.tsx, Connectors.tsx, Runbooks.tsx, Analytics.tsx, components/Copilot.tsx.

Scope: six screens only — Overview (`/dashboard`), Incidents (`/incidents`),
Action Center (`/responder/approvals`), Skills & Connectors (`/connectors`),
Runbooks (`/playbooks`, behind a flag), Analytics (`/sla`, behind a flag).

Working tree state: **SOC-1 is complete.** Nothing from SOC-2 onwards has been started.

2026-11-11: `next.config.js` had two `redirects()` keys; the second silently
replaced the first and dropped `/signup` → `/dashboard`. They are one function
now (`/signup` permanent, plus the SOC-1 aliases).

2026-11-11 (SOC-1 completion pass — verified):
- Fixed `Sidebar.tsx` Light/Dark switch to call `setPreference(dark ? 'light' : 'dark')`
  instead of `toggle()` (which cycled through `'system'` and stalled in Light
  mode when OS prefers light), and reused `<Badge>` for the user role pill for
  clean Light-mode contrast.
- Fixed `TopBar.tsx` mobile spacing (`pl-14 pr-5 md:px-5`) and hid the desktop
  collapse chevron on `< md` (`hidden md:inline-flex`) so it does not collide
  with the mobile drawer hamburger button.
- Raised `CopilotDock.tsx` open panel from `z-40` to `z-50` to clear the
  `z-40` Sidebar; tagged unused `Breadcrumbs` import in `AppShell.tsx` with
  `[HIDDEN-UI SOC-1 topbar-breadcrumbs]`.
- Updated `apps/web/src/app/(responder)/layout.tsx` and
  `apps/web/src/components/responder/ResponderShell.tsx` so `/responder/approvals`
  (Action Center) renders inside `<AppShell>` and shares the SOC-1 SREOps shell,
  while `/responder/{login,triage,case,oncall,settings}` retain `ResponderShell`.
- Expanded `apps/web/next.config.js` `redirects()` to cover remaining out-of-scope
  `(app)` routes (`/investigate`, `/detection/:path*`, `/compliance/:path*`,
  `/threat-intel`, `/explore`, `/federated-search`, `/identity/permissions`,
  `/coverage-advisor`, `/noise-tuning`, `/purple-team`, `/honeytokens`,
  `/ai-estate`, `/audit`, `/access-review`, `/evaluate`, `/marketplace`,
  `/reports/digest`, `/analytics/team`, `/dashboards/operations`,
  `/dashboards/soc-insights`).
- Restored EOL-only modification on `apps/web/src/test/__snapshots__/storybook-snapshots.test.tsx.snap`.

---

## Phase status

| Phase | Screen / area | Status |
| --- | --- | --- |
| SOC-1 | Shell (sidebar, top bar, content frame, theme switch, floating AI bot) | Complete |
| SOC-2 | Overview | Not started |
| SOC-3 | Incidents (list + detail, AI investigation, Jira, escalate) | Not started (only thin route wrappers exist) |
| SOC-4 | Action Center | Not started |
| SOC-5 | Skills & Connectors (connector wizard, agent settings) | Not started |
| SOC-6 | Runbooks + Analytics (table-first) | Not started |

---

## SOC-1 — Shell

### What was built

- **Sidebar** (`apps/web/src/components/layout/Sidebar.tsx`)
  - 256px wide (`w-64`), collapses to a 64px icon rail (`w-16`) on `md+`;
    mobile is a drawer with a hamburger and scrim. Collapse state persists in
    `localStorage` (`aisoc:sidebar-collapsed`) and syncs to `--sidebar-w`.
  - Header: product name. Unbranded shows the `Ai`/`SOC` wordmark; white-label
    still uses `branding.product_name`, the accent border and the authenticated
    blob logo (unchanged behaviour).
  - One group label **NAVIGATION**, one flat list of six items, no sections,
    no sub-rail, no workspaces: Overview `/dashboard`, Incidents `/incidents`,
    Action Center `/responder/approvals`, Skills & Connectors `/connectors`,
    Runbooks `/playbooks`, Analytics `/sla`. Active state uses the
    segment-safe `matchesRoutePrefix` helper, and each item still emits
    `workspace_opened` analytics.
  - Footer: light/dark switch (role="switch", sun/moon icons, wired to the
    existing `ThemeProvider`) followed by the user card — avatar initials,
    name, email, role chip, sign-out.
  - Runbooks and Analytics are gated by nav flags, so either can be hidden
    through configuration: `NEXT_PUBLIC_NAV_RUNBOOKS_ENABLED` and
    `NEXT_PUBLIC_NAV_ANALYTICS_ENABLED` (`src/config/features.ts`,
    `getSREOpsNavConfig()` in `src/config/navigation.ts`, documented in
    `.env.example`).
- **Top bar** (`apps/web/src/components/layout/TopBar.tsx`)
  - Only the back/collapse chevron, the page title as a plain string derived
    from the route (`Incidents > <id>` on detail routes, `Overview` on
    `/dashboard`, `Action Center`, `Skills & Connectors`, `Runbooks`,
    `Analytics`), and the org logo on the right (light/dark logo, unchanged).
  - Kept for tests only, both invisible: the `sr-only` route heading/description
    block and the `sr-only` command-palette trigger.
- **Content frame** (`apps/web/src/components/layout/AppShell.tsx`)
  - `max-w-[1320px]`, padding `28px 32px 96px` (the 96px bottom keeps the
    floating AI button off the last row of content).
- **Floating AI button** (`apps/web/src/components/copilot/CopilotDock.tsx`)
  - Round gradient button bottom-right (26px), present on every screen
    (the `/copilot` page suppression is commented out), opens the existing
    Copilot dock — no second chat implementation.
  - The badge reuses the existing `LiveQueueBadge` (queue poller) instead of a
    hardcoded number, so it renders nothing when the count is zero or unknown.
- **Shell CSS** (`apps/web/src/styles/cloudifyops.css`)
  - Ported SREOps tokens/classes: `--bg/--surf/--bd/--t/--ac/--pill-*` aliases
    for both themes, `.sidebar`, `.brand`, `.nav`, `.nav-group-label`,
    `.nav-item`, `.theme-row`, `.switch`, `.user-card`, `.avatar.lg`,
    `#copilot-fab`, `.fab-badge-slot`.
- **Redirects** (`apps/web/next.config.js`, `redirects()` only — no route files
  deleted):

  | From | To |
  | --- | --- |
  | `/overview` | `/dashboard` |
  | `/alerts`, `/alerts/:id` | `/incidents`, `/incidents/:id` |
  | `/queue` | `/incidents` |
  | `/cases`, `/cases/:id` | `/incidents`, `/incidents/:id` |
  | `/investigations`, `/investigations/:id` | `/incidents`, `/incidents/:id` |
  | `/mitigations`, `/action-center` | `/responder/approvals` |
  | `/runbooks` | `/playbooks` |
  | `/analytics` | `/sla` |
  | `/investigate` | `/incidents` |
  | `/hunt`, `/detection/:path*`, `/coverage-advisor`, `/noise-tuning`, `/purple-team`, `/honeytokens`, `/threat-intel`, `/explore`, `/federated-search`, `/identity/permissions`, `/ai-estate`, `/easm`, `/compliance/:path*`, `/fim`, `/graph`, `/shifts`, `/audit`, `/access-review`, `/evaluate`, `/marketplace`, `/reports/digest`, `/analytics/team`, `/dashboards/operations`, `/dashboards/soc-insights` | `/dashboard` |

  Verified against the built `.next/routes-manifest.json` (39 redirects total including trailing-slash normalization).
- **Action Center AppShell bridge** (`apps/web/src/app/(responder)/layout.tsx`, `apps/web/src/components/responder/ResponderShell.tsx`)
  - `/responder/approvals` delegates to `<AppShell demoMode={demoMode}>` instead of `ResponderShell`, so all six console screens share the SOC-1 shell while `/responder/{login,triage,case,oncall,settings}` keep `ResponderShellMobile`.
- **`/incidents` routes** — thin wrappers only, added so the nav item and the
  redirects resolve: `src/app/(app)/incidents/page.tsx` renders `AlertsView`,
  `src/app/(app)/incidents/[id]/page.tsx` renders `AlertDetailView`. Both are
  placeholders for SOC-3; no data, hook or API changes.

### Commented-out blocks (restore by searching the tag)

| Tag | File | What it is |
| --- | --- | --- |
| `[HIDDEN-UI SOC-1 8-workspace-sidebar]` | Sidebar.tsx | registry-driven 8-workspace rail |
| `[HIDDEN-UI SOC-1 P5-secondary-rail]` | Sidebar.tsx | workspace page sub-rail |
| `[HIDDEN-UI SOC-1 legacy-footer]` | Sidebar.tsx | platform wordmark + MIT licence row |
| `[HIDDEN-UI SOC-1 topbar-controls]` | TopBar.tsx | time window, tenant switcher, role badge, notifications, AI Copilot button, `ThemeToggle` |
| `[HIDDEN-UI SOC-1 search trigger]` | TopBar.tsx | visible search button (now `sr-only`, kept for the palette shortcut test) |
| `[HIDDEN-UI SOC-1 present on every screen including /copilot]` | CopilotDock.tsx | `if (onCopilotPage) return null` |
| `[HIDDEN-UI SOC-1 static-fab-badge]` | cloudifyops.css | hardcoded badge, replaced by the live queue count |
| `[HIDDEN-UI SOC-1 topbar-breadcrumbs]` | AppShell.tsx | `Breadcrumbs` import hidden from the simplified TopBar |
| `[HIDDEN-UI P5 nav-simplified]` | AppShell.tsx | workspace tab bar import (predates this phase) |

Nothing deleted: every route file, hook, API client, type and backend file is
still on disk.

### Tests touched (and why)

The shell spec replaced the navigation the old assertions described, so two
shell test files were updated — the registry/permission/route tests in them are
untouched and still assert the full 8-workspace registry:

- `Sidebar.test.tsx`: asserts the flat six-item nav, one NAVIGATION label, no
  section headers, no nested sub-rail, the theme switch and the user card;
  renders are wrapped in `ThemeProvider` (the sidebar now reads the theme
  context, exactly as the top bar already did).
- `SidebarBranding.test.tsx`: wrapped in `ThemeProvider`; every branding
  assertion (name, palette, authenticated blob logo, no platform wordmark) is
  unchanged.

### Verification (numbers)

| Check | Result |
| --- | --- |
| `pnpm run type-check` | **13 errors, all pre-existing in `AlertsView.tsx`** — 0 new errors (`Sidebar.tsx` reads `user?.username || 'SOC Analyst'`, `AuthUser` unchanged) |
| `pnpm run build` | **Passed** (exit 0, Next 16.4.3 Turbopack, 106 pages) |
| `pnpm run check:tokens` | **Passed** (35 variables referenced) |
| `pnpm exec eslint` (SOC-1 files) | **Passed** (0 errors, 6 pre-existing warnings) |
| `pnpm test` | **70 failed / 1059 passed (1129)** across 116 files (28 `storybook-snapshots`, 11 failed files total) — clean uncontended run |

Test baseline notes:

- All 70 failures are pre-existing on `HEAD` (`dd09e81f4`): `storybook-snapshots` (28), `SettingsView.byok` (21), `SettingsView.llmhealth` (5), `AlertsTileCounts` (5), `MitrePanelWording` (3), `AlertsQueryOrder` (2), `L1InvestigationStory` (1), `ConnectedSourceCount` (1), `BrandedDocumentTitle` (1), `Sidebar.test.tsx > WorkspaceTabBar` (1 — `WorkspaceTabBar.tsx` and the `next/link` mock without `ref` forwarding are unchanged from `HEAD`), and `a11y` (2: `AlertsView` heading order + `InvestigationRail` 5000ms timeout under full-suite load, which passed in 1,569ms when `a11y.test.tsx` ran solo).
- Note vs prompt baseline (`49`): `28` (`storybook-snapshots`) + `21` (`SettingsView.byok`) = `49`; the remaining `21` failures are also in untouched files from `df26c37d9` and the 10 `style: declutter` commits on `ui-clean-all`. SOC-1 added **0** new failures.
- Targeted shell checks: `SidebarBranding.test.tsx` (1/1 passed), `TopBar.test.tsx` (5/5 passed), `OperationsDashboard.test.tsx` (18/18 passed), `Sidebar.test.tsx` (12/13 passed, including the new Light ↔ Dark toggle test; only the pre-existing `WorkspaceTabBar` test failed).

### Remaining manual visual check for SOC-1

- Look at the shell in **light and dark** at `/dashboard`, `/incidents`,
  `/responder/approvals`, `/connectors` (plus `/playbooks` and `/sla` with the
  nav flags on): sidebar rail collapse, theme switch, user card, floating AI
  button, and the top bar on an incident detail route (`/incidents/alert-1`).

---

## SOC-2 — Overview (`/dashboard`)

Not started. Planned against `screens/Overview.tsx`:

- `PageHead "Dashboard"` with a segmented range control (Last 24h / 7d / 30d /
  Custom) driving the existing time-window provider.
- 5-cell `MetricStrip`: total incidents, open, awaiting approval, mean time to
  RCA, cost / AI usage — reusing existing dashboard data, honest empty states.
- Severity strip (Critical / High / Medium / Low with dot, count, %).
- "Incidents over time" chart.
- Comment out the hero banner, welcome card, deep-telemetry drawer and every
  extra widget with `[HIDDEN-UI SOC-2 ...]` tags.

## SOC-3 — Incidents (revised brief, supersedes the earlier SOC-3 text)

Not started. Before writing UI, report the source:

- Use the alerts pipeline as the source of truth and call every detection an
  **Incident**. Reuse the existing alert list hook/API (`AlertsView` /
  `alertsApi`) and the alert detail data; do not rename API fields or backend
  routes.
- Hide the case concept (`CasesView`, `CaseWorkspace`, create-case modal,
  shifts) with `[HIDDEN-UI SOC-3 ...]`, redirect `/alerts`, `/queue`, `/cases`,
  `/cases/[id]`, `/alerts/[id]`, `/alerts/[id]` → `/incidents[/id]` (already in
  `next.config.js`).
- List: `PageHead "Incidents"`, 4-cell MetricStrip (Open, Total, mean time to
  RCA, auto-RCA rate), filter chips with counts, fixed-layout wrapping table
  (Incident, Alarm, Space/Account, Status, Age, Jira key, Investigate), row
  click to detail.
- Detail `/incidents/[id]`: `Incidents > <id>` top-bar title, back link, 22px
  title, one subtitle line, action row with exactly one primary button, badge
  row (P1–P4 severity, status, account · region, detection→RCA chip), then
  `detail-grid` (main column: Root Cause Analysis, Evidence, Timeline,
  Proposed Actions; 340px rail: Details key/value list). RCA text must wrap and
  render ROOT CAUSE / WHO / WHAT / WHEN / IMPACT as bold lead-ins.
- AI investigation states: idle, running (skeleton + progress), done (RCA
  badge "RCA ready"), failed (message + Retry), wired to the existing
  investigation/copilot/explain endpoint. If nothing auto-investigates, add
  "Investigate all open" (sequential, progress count, Stop) and mark
  `[TODO-BACKEND: auto-investigate on ingest]`. Never fabricate RCA text.
- Jira: locate the existing Jira connector code and report it; per-incident key
  link, "View in Jira" / "Create Jira issue" via the existing create handler,
  "Connect Jira" -> Skills & Connectors when not connected,
  `[TODO-BACKEND: auto-create Jira issue on incident creation]` if absent.
- Escalate to human: existing escalation/assign/approval handler, otherwise a
  disabled button plus `[TODO-BACKEND]`.

## SOC-4 — Action Center

Not started. `PageHead` plus a list of cards (severity dot, title, "Awaiting
action" badge, context line, command/code block, Apply / View / Reject wired to
the existing approval handlers). Right-hand on-call shift pane only if shift
data already exists; otherwise comment it out with a `[HIDDEN-UI SOC-4 ...]` tag.

## SOC-5 — Skills & Connectors

Not started. Four KPI cells that filter sections (Skills, Webhooks, Capability
Providers, MCP Servers), Connected table (name, endpoint, last updated, status),
Available providers, and one wizard dialog reusing `AddConnectorModal` with a
provider picker (AWS, Splunk, Microsoft Sentinel, CrowdStrike, Palo Alto, Okta,
GitLab/GitHub, Slack, Jira, Prometheus, plus "Custom / Webhook / REST API").
Per connector: name, endpoint, auth type, masked API key with show/hide, test
connection, enable/disable, edit, remove. Agent configuration section using the
existing settings endpoints. Secrets go only to the existing backend endpoint —
never to `localStorage`, logs or URLs. Missing endpoints get `[TODO-BACKEND]`.

## SOC-6 — Runbooks and Analytics

Not started. Table-first screens: Runbooks (`PageHead`, `MetricStrip`, one table
with a Run button) and Analytics (range toggle, 4 KPIs, 2 charts), reusing the
existing playbook and SLA/analytics data.

---

## Registers to keep current

- **[TODO-BACKEND] stubs:** none yet (SOC-1 is shell only).
- **API contracts / auth / state / data model:** unchanged so far.
- **Known pre-existing problems:** 13 `AlertsView.tsx` type errors; the
  `WorkspaceTabBar` keyboard-focus test; 28 storybook primitive snapshot
  failures.
