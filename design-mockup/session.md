# UI redesign: session log

Last updated: 2026-11-06 13:24 (local)

## Goal
Redesign the AiSOC console (`apps/web`) so it is clean, readable and attractive, in light and dark mode ("Power without Clutter"), **without dropping any backend feature**. Wire the real backend into the new UI.

## Decisions (confirmed by the user)
| Topic | Decision |
| --- | --- |
| Rollout | Phased rollout across 5 phases in `apps/web`. |
| Pages with no home in the 5-section design | Keep every feature accessible via the 5 primary groups, with 23 secondary/specialist routes tucked under a collapsible `"More tools (23)"` disclosure in the sidebar (automatically expanded if the active route is inside it). |
| AI indicator | Dual-ring counter-rotating spinner (`AiSpinner`, coral `#fb6b7b` outer arc + orange `#fb9468` inner arc), replacing static bot/sparkle icons. |
| Palette | Graphite (`#0a0f12` canvas, `#121b20` card) + bright teal (`#2dd4bf` / `#14b8a6`) in Dark mode; Warm stone (`#f6f5f1` canvas, `#ffffff` card) + deep teal (`#0f766e` / `#0d9488`) in Light mode; Violet (`#b79cf7` dark / `#6d28d9` light) reserved for AI surfaces. |

## Completed Work

### Interactive HTML Mockup
- `design-mockup/index.html`: Single-file interactive reference prototype demonstrating Light and Dark themes, collapsible sidebar (`64px` / `240px`), Dashboard, Unified Incident Cockpit (`/incidents`) with Manual AI Deep Dive (`idle` / `busy` / `done`), Runbooks Studio (`/runbooks`) with Visual Step Builder + live YAML preview, Settings & Connectors Hub (`/settings/connectors`) with 4-step wizard, Threat Hunting, AI Copilot dock, and `Ctrl+K` palette.

### Phase 1 — Theme System, AppShell, Collapsible Sidebar, `AiSpinner` & Dashboard
- `apps/web/src/app/globals.css`:
  - Updated `:root, [data-theme="dark"]` and `[data-theme="light"]` surface, foreground, border, glass, brand (`--brand-50`..`--brand-900`), AI (`--ai-accent`, `--ai-accent-soft`), spinner (`--spin-outer`, `--spin-inner`), and `--sidebar-w` (`15rem` / `4rem`) CSS variables.
  - Added `@keyframes aisoc-spin-cw` and `@keyframes aisoc-spin-ccw` with `prefers-reduced-motion` support.
- `apps/web/tailwind.config.ts`:
  - Mapped `brand.50`–`brand.900` to `var(--brand-*)` and added `ai: { DEFAULT: 'var(--ai-accent)', soft: 'var(--ai-accent-soft)' }`.
- `apps/web/src/components/ui/AiSpinner.tsx` & `AiSpinner.test.tsx`:
  - Implemented dual-ring counter-rotating SVG spinner (`state="idle" | "busy" | "done"`, `size="xs" | "sm" | "md" | "lg"`, `monochrome`) with unit tests.
- `apps/web/src/components/layout/Sidebar.tsx`, `Sidebar.test.tsx`, `AppShell.tsx`, `TopBar.tsx`, `CopilotDock.tsx`:
  - Added desktop sidebar collapse (`240px` expanded / `64px` mini rail, persisted in `localStorage` and mirrored to `--sidebar-w` on `document.documentElement`).
  - Added progressive disclosure in `Sidebar.tsx`: primary operational destinations stay visible while 23 secondary/specialist routes collapse behind `"More tools (23)"` (and auto-expand when active or in test expansions).
  - Wired `<AiSpinner />` into the AI Copilot navigation item, `TopBar` Copilot button, and `CopilotDock` header/status.
- `apps/web/src/components/dashboard/DashboardView.tsx`, `FunnelKpiBar.tsx`, `EfficiencyReport.tsx`, `PipelineHealth.tsx`, `LiveFeedPanel.tsx`, `SOCMetricsDashboard.tsx`:
  - Redesigned with Command Hero banner, left-accented KPI stat cards, theme-aware Recharts colors, collapsible `"Pipeline Funnel & SOC Performance"` section, and semantic `surface-*` / `fg-*` / `brand-*` tokens while preserving all data-honesty gates (`not measured` when `sample_count === 0`).

### Phase 2 — Incidents & Triage (`/alerts`, `/cases`) & Manual AI Deep Investigation
- `apps/web/src/components/alerts/InvestigationRail.tsx`, `ExplainDrawer.tsx`, `AlertDetailView.tsx`:
  - Upgraded `AIInvestigation` in `AlertDetailView.tsx` into a prominent **Manual AI Deep Investigation** banner with `<AiSpinner />`, live status pulse (`Synthesizing entity relationships, historic telemetry & root cause...`), confidence score badge, executive verdict, collapsible evidence chain, and recommended actions while preserving `/start ai investigation/i` for `AlertCaseSeverity.test.tsx`.
  - Integrated `<AiSpinner />` into `InvestigationRail.tsx` (`Deep Explain` button and `AutomatedTriageSection`) and `ExplainDrawer.tsx` (`DrawerHeader`).
- `apps/web/src/components/cases/CaseWorkspace.tsx`:
  - Integrated `<AiSpinner />` into the `Investigate with agent` header button (preserving `/investigate with agent/i` for `CaseWorkspaceHonesty.test.tsx`) and upgraded `InvestigationPanel` (`Trigger Manual AI Deep Dive` CTA + live agent step stream).
- `apps/web/src/components/copilot/ContextualActions.tsx`:
  - Replaced static sparkle icon with `<AiSpinner size="xs" />` and themed with semantic tokens.
- `apps/web/src/components/alerts/AlertsView.tsx`, `EntityRiskQueue.tsx`, `AttackStory.tsx`, `BulkTriageBar.tsx`, `CreateCaseModal.tsx`, `NarrativeMarkdown.tsx`, `apps/web/src/components/cases/CasesView.tsx`, `AnalystWorkload.tsx`, `WarRoomPanel.tsx`, `InvestigationLedger.tsx`:
  - Converted hardcoded `gray-*` / `slate-*` classes to semantic `surface-*`, `fg-*`, `brand-*` tokens for Light and Dark mode support.

### Phase 3 — Runbooks Studio (`/playbooks`) & Detection Engineering (`/detection`)
- `apps/web/src/components/playbooks/PlaybooksView.tsx` & `DraftFromPromptDialog.tsx`:
  - Integrated `<AiSpinner />` into the `Draft from prompt` button and NL-to-DAG modal while preserving all `DraftFromPromptDialog.test.tsx` contracts.
- `apps/web/src/components/playbooks/PlaybookEditor.tsx` & `PlaybookFlowCanvas.tsx`:
  - Added a live **Editor View Mode switcher** (`Visual Builder` | `YAML` | `JSON`) in the top bar of `PlaybookEditor.tsx` with `serializePlaybookYaml(pb)` and 1-click `Copy YAML` / `Copy JSON` button alongside the interactive React Flow canvas.
  - Updated `PlaybookFlowCanvas.tsx` inline node/canvas/minimap styles to use semantic CSS variables (`var(--surface-card)`, `var(--surface-sunken)`, `var(--surface-border)`, `var(--fg-primary)`).
- `apps/web/src/components/playbooks/PlaybooksGallery.tsx`, `StepInspector.tsx`, `SchemaForm.tsx`, `StepExecutionNotice.tsx`, `DAGPreviewDrawer.tsx`, `rowActions.tsx` & `apps/web/src/components/detections/*.tsx` (`DetectionsView.tsx`, `RuleEditor.tsx`, `SimpleRuleBuilder.tsx`, `DetectionCatalog.tsx`, `DetectionProposalsView.tsx`, `CoverageView.tsx`, `ConfidenceTrends.tsx`, `ContributorLeaderboard.tsx`, `DriftInbox.tsx`, `MitreRuleHeatmap.tsx`, `RuleTuningView.tsx`):
  - Converted hardcoded `gray-*` and `zinc-*` classes to semantic `surface-*`, `fg-*`, `brand-*` tokens.

### Phase 4 — Settings & Interactive Connectors Hub (`/settings`, `/connectors`)
- `apps/web/src/components/connectors/AddConnectorModal.tsx`:
  - Integrated `<AiSpinner size="xs" />` into `TroubleshootPanel` (`Ask AI to fix` and `Diagnosing failure…`).
- `apps/web/src/components/settings/SettingsView.tsx`:
  - Enhanced `IntegrationsPanel` with category filter pills (`All`, `Cloud & IAM`, `Endpoint / EDR`, `Network / SIEM`) and an inline `+ Connect New Source` button that opens `AddConnectorModal` directly inside Settings, alongside the `+ Add connector` link and per-connector `Test` and `Enable`/`Disable` controls.
- `apps/web/src/components/settings/*.tsx` (`AssignRoleModal.tsx`, `AutonomyPolicy.tsx`, `AutonomyScorecard.tsx`, `BrandingPanel.tsx`, `DelegationsPanel.tsx`, `RBACView.tsx`, `RetentionPanel.tsx`, `RulePacksPanel.tsx`, `ScimTokensPanel.tsx`, `SettingsView.tsx`, `UsersView.tsx`) & `apps/web/src/components/connectors/*.tsx` (`AddConnectorModal.tsx`, `ConnectorInstanceList.tsx`, `ConnectorsView.tsx`, `InboxTokensPanel.tsx`):
  - Converted hardcoded `gray-*`, `slate-*`, `blue-*` classes to semantic `surface-*`, `fg-*`, `brand-*` tokens while preserving all `SettingsView.byok.test.tsx`, `SettingsView.llmhealth.test.tsx`, `OperatorPanels.test.tsx`, `ScimTokensPanel.test.tsx`, and `UsersView.test.tsx` contracts.

### Phase 5 — Threat Hunting & Specialist Modules (`/hunt`, `/graph`, `/threat-intel`, `/explore`, `/federated`, `ui/`)
- `apps/web/src/components/hunt/HuntView.tsx`:
  - Integrated `<AiSpinner size="xs" state={pending ? 'busy' : 'idle'} />` into the `NLHero` header badge and converted all `slate-*` classes to semantic `surface-*`, `fg-*`, `brand-*` tokens while preserving all `HuntContract.test.tsx` and `HuntHonesty.test.tsx` invariants.
- `apps/web/src/components/graph/*.tsx` (`AttackGraphClient.tsx`, `AttackGraphView.tsx`, `RealtimeGraph.tsx`), `apps/web/src/components/threat-intel/ThreatIntelView.tsx`, `apps/web/src/components/explore/ExploreView.tsx`, `apps/web/src/components/federated/FederatedSearchView.tsx`, and `apps/web/src/components/ui/*.tsx` (`Badge.tsx`, `Button.tsx`, `Card.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `StatusPill.tsx`):
  - Converted hardcoded `gray-*`, `slate-*`, `blue-*` classes to semantic `surface-*`, `fg-*`, `brand-*` tokens.

### Phase 6 — Direct Structural Parity with `design-mockup/index.html`
- **Sidebar (`apps/web/src/components/layout/Sidebar.tsx`, `Sidebar.test.tsx`) & TopBar (`TopBar.tsx`, `AppShell.tsx`):**
  - Simplified primary navigation to the **5 clean modules** from `design-mockup/index.html` (`Dashboard`, `Incidents & Triage`, `Threat Hunting`, `Runbooks & Automation`, `Settings & Integrations`), with all 30 specialist routes tucked inside the collapsible `"More tools"` drawer.
  - Updated `TopBar.tsx` to match `<header class="top">` (`56px` height, left sidebar collapse button dispatching `aisoc:toggle-sidebar`, command/search bar with `Ctrl K`, `TimeWindowSelector`, `● All pipelines healthy` status pill, purple-accented `AI Copilot` button with `<AiSpinner size="xs" />`, `ThemeToggle`, notification bell, and avatar circle).
- **Dashboard (`apps/web/src/components/dashboard/DashboardView.tsx`):**
  - Matched `#p-dashboard` in `design-mockup/index.html` with 4 clean rows:
    1. Hero greeting banner (`Good morning — here is what needs attention right now.` + 3 status pills + `Review critical incidents` / `Start a hunt` / `Runbooks` buttons).
    2. 4 KPI cards (`Active critical threats`, `Mean time to respond`, `Active alerts`, `Sources reporting`).
    3. `2fr / 1fr` row: `Alert volume · ingested vs. AI-triaged` area chart + `Severity mix` horizontal progress bars.
    4. `2fr / 1fr` row: `Needs your attention & Connected sources` table + `Top ATT&CK tactics` horizontal progress bars.
    5. Collapsed-by-default `"Show deep telemetry"` drawer for `FunnelKpiBar`, `EfficiencyReport`, `PipelineHealth`, `LiveFeedPanel`, and `SOCMetricsDashboard`.
- **Incidents & Triage Split-Screen Cockpit (`apps/web/src/components/alerts/AlertsView.tsx`):**
  - Matched `#p-incidents` in `design-mockup/index.html` with a **Master-Detail Split-Screen Cockpit** (`5/12` left queue pane with `[ Alerts | Cases | Entities ]` switcher, search input, Status segmented filter, Severity segmented filter, and incident cards; `7/12` right detail pane with entity tags, **Manual AI Deep Investigation banner** with `Idle` / `Running` / `Done` states, Executive Verdict, collapsible Evidence Chain, and tabs for `Timeline`, `Raw telemetry & IOCs`, `Response & runbooks` with `▶ Run runbook ▾`, `Notes`, and `Deep Context Rail`).
- **Threat Hunting (`apps/web/src/components/hunt/HuntView.tsx`) & Runbooks (`apps/web/src/components/playbooks/PlaybooksView.tsx`):**
  - Added the 4-tab bar (`Log explorer` | `Entity graph` | `IOC lookup` | `Threat intel`) to `HuntView.tsx` and the 5-tab bar (`All` | `Custom` | `Recent Runs` | `Detection rules` | `ATT&CK coverage`) + Slide-Over Runbook Studio Drawer (`Builder` / `YAML`) to `PlaybooksView.tsx`.
- **Settings & Integrations (`apps/web/src/components/settings/SettingsView.tsx`):**
  - Replaced the 15-item vertical left rail with the horizontal top tab bar defaulting to **Connectors** (`integrations`), featuring the `[ All | Cloud & IAM | Endpoint / EDR | Network / SIEM ]` segmented filter, search box, `+ Connect new source` button, and **3-column Connector Card Grid** with 2-letter icon badges, status pills, 24h event counts, `Test connection`, and `Streaming` toggle.

## Verification Status
- **Backend Compatibility & CI Gate Suite (Verified locally via Python):**
  - `check_demo_state_gated.py`: **PASS** (`341 file(s) scanned; every fabricated symbol is reachable only behind the demo gate`).
  - `check_mock_data_gated.py`: **PASS** (`341 file(s) scanned, 20/20 fabricated records gated, 0 ungated findings`).
  - `check_console_auth_headers.py`: **PASS** (`38 API call(s) across 342 console file(s) all carry a credential`).
  - `check_funnel_contract.py`: **PASS** (`all 19 response fields are documented`).
  - `check_alert_status_vocabulary.py`: **PASS** (`12 statuses classified, no second vocabulary`).
  - `check_scim_contract.py`: **PASS** (`17 SCIM route(s), 8 mutating handler(s), 9 enforced role(s) and 3/3 console credential binding(s)`).
  - `check_whitelabel_metering.py`: **PASS** (`22 allowed SVG element(s), 55 allowed attribute(s) and 13 meter(s)`).
  - `check_inbox_templates.py`: **PASS** (`18 template files, 20 mintable ids; both directions agree`).
  - `check_failure_is_not_a_verdict.py`: **PASS** (`466 console source files, none turn a failure into a clean verdict`).
  - `check_playbook_approval_gates.py`: **PASS** (`130 playbook file(s), 38 approval gate(s)`).
  - `check_attribution.py --all`: **PASS** (`15,510 tracked files scanned — no tool attribution found`).
  - `check_competitor_names.py`: **PASS** (`15,329 files scanned — no competitor product named outside its integration surfaces`).
  - **Static API & Import Contract Verification (`verify_backend_compat.py`):**
    - Verified all **263** `<client>Api.<method>()` call sites across `.tsx` files against the **54** exported API clients in `apps/web/src/lib/api.ts` (`0` mismatched calls).
    - Verified all **856** internal module and named symbol imports across `apps/web/src` (`0` broken imports, `0` missing named exports; caught and fixed a `TriggerOn` import/prop drift in `PlaybookEditor.tsx` so it uses `useHistoryState`, `authedFetcher`, and exact `StepInspector`/`PlaybookFlowCanvas` props).
    - Verified all **240** unique `/api/v1/*` console paths against `docs/openapi.yaml` + FastAPI route ASTs (`515` API routes, `49` Agents routes) + `next.config.js` (`22` rewrites) (`0` unresolved paths).
  - Scanned all `.ts` and `.tsx` files under `apps/web/src` for UTF-8 encoding integrity (`0` mojibake occurrences) and verified LF (`\n`) line endings on `EfficiencyReport.tsx`, `DashboardView.tsx`, and `apps/web/docker-entrypoint.sh`.
- **Docker Production Build & Vitest Verification (Verified via Docker 29.9.2):**
  - `docker compose build web` (`apps/web/Dockerfile` -> `ghcr.io/beenuar/aisoc-web:latest`): **PASS** (`pnpm install --frozen-lockfile`, `@aisoc/types`, `@aisoc/ui`, `@aisoc/report-card`, and `@aisoc/web` production build succeeded with `105/105` static/SSG/dynamic routes compiled).
  - Vitest Test Suite (`docker run --rm -e NODE_ENV=test --entrypoint pnpm ghcr.io/beenuar/aisoc-web:latest --filter @aisoc/web exec vitest run ...`): **PASS** (`16/16` test files, `161/161` tests passing across `AiSpinner.test.tsx`, `Sidebar.test.tsx`, `SidebarBranding.test.tsx`, `DashboardHonesty.test.tsx`, `AlertCaseSeverity.test.tsx`, `CaseWorkspaceHonesty.test.tsx`, `DraftFromPromptDialog.test.tsx`, `SettingsView.byok.test.tsx`, `SettingsView.llmhealth.test.tsx`, `OperatorPanels.test.tsx`, `ScimTokensPanel.test.tsx`, `UsersView.test.tsx`, `HuntContract.test.tsx`, `HuntHonesty.test.tsx`, `AttackGraphView.test.tsx`, and `ThreatIntelCountHonesty.test.tsx`).


## 9. Runbooks Validation, AWS CloudTrail / Security Hub RCA & In-UI Runbook Editor
- **Playbook / Runbook Corpus & RCA Accuracy Validation**:
  - Validated all 68 shipped runbooks across 22 categories (`scripts/validate_playbooks.py` + `scripts/lint_playbooks.py` → `138/138` files pass schema & DAG checks).
  - Verified all 42 human-approval gates (`scripts/check_playbook_approval_gates.py` → `OK: 138 playbook file(s), 42 approval gate(s), every promised gate suspends the run`).
  - Verified deep RCA investigation strategies & tools (`scripts/check_investigation_depth.py` → `10 strategies, 11 lake tools + 6 customer tools`).
  - Verified benchmark completion rate (`services/agents/tests/test_playbook_completion_rate.py` → `100%` high+critical mapped coverage `147/147`, `0` orphan playbooks, `0` orphan templates) and Brier/ECE confidence calibration (`services/agents/tests/test_confidence_calibration.py`).
- **New AWS CloudTrail, Security Hub & GuardDuty RCA Runbooks (`scripts/generate_playbooks.py` + `services/agents/app/playbook/templates.py`)**:
  - `cloud-aws-cloudtrail-iam-privesc-rca-v1` (*AWS CloudTrail: IAM Privilege Escalation & AssumeRole RCA*)
  - `cloud-aws-cloudtrail-console-no-mfa-rca-v1` (*AWS CloudTrail: Console Sign-In Without MFA & Anomalous API RCA*)
  - `cloud-aws-securityhub-critical-finding-rca-v1` (*AWS Security Hub: Critical Finding RCA & Guarded Containment*)
  - `cloud-aws-guardduty-credential-exfil-rca-v1` (*AWS GuardDuty & CloudTrail: Instance Credential Exfiltration RCA*)
- **AI Runbook Trigger Matching & Calibrated Confidence Scoring (`services/agents`)**:
  - Enhanced `services/agents/app/playbook/alert_trigger.py` (`_derive_alert_tags`, `alert_context`, `matching_runbooks_for_alert`) so AWS CloudTrail, Security Hub, GuardDuty, IAM, S3, and MITRE tags and entity fields (`principal_arn`, `resource_arn`, `event_name`, `finding_type`, `trail`) are automatically extracted for runbook matching and step templating.
  - Enhanced `services/agents/app/confidence/scoring.py` (`score_triage` and `score_investigation`) to boost confidence and record explicit `confidence_basis` lines when an alert is corroborated by matched runbooks, cloud audit trail context, or multi-pivot RCA deep investigations.
- **UI Runbooks Transformation & Full Add/Edit Support (`apps/web`)**:
  - Updated `PlaybooksGallery.tsx` to render an easy-to-understand **Step-by-Step RCA & Response Flow** strip (`1. Enrich → 2. Query CloudTrail → 3. AI RCA → 4. Approval Gate → 5. Remediate`), **AI RCA Ready** / **Approval Gate** / **AWS CloudTrail** / **AWS Security Hub** badges, and a 1-click **Edit Runbook** button on every card.
  - Upgraded `RunbookStudioDrawer` in `PlaybooksView.tsx` and `PlaybookEditor.tsx` (`handleSave`) + `rowActions.tsx` (`EnabledToggle`) to support creating new runbooks (`POST /api/v1/playbooks`), editing custom runbooks (`PUT /api/v1/playbooks/{id}`), and customizing shipped packs in place (automatically saving a tenant-owned override via `POST /api/v1/playbooks` when editing a read-only shipped pack), with 1-click AWS CloudTrail, Security Hub, and GuardDuty RCA presets.
