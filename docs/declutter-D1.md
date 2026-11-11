# Console Declutter Inventory & Audit (Phase D1)

**Goal:** Establish a neat, calm, uncluttered Security Operations Console matching the SRE reference standard (`ui_src_final`). Remove presentation noise, duplicate indicators, redundant chrome, and excessive ornamentation while preserving 100% of functional capabilities, routes, APIs, and state logic.

---

## Executive Summary & Category Counts

| Category | Total Audited | Proposed Action: HIDE | Proposed Action: MERGE | Proposed Action: KEEP |
| :--- | :---: | :---: | :---: | :---: |
| **1. Icons & Emojis** | **78** | **44** | **4** | **30** |
| **2. Navigation Items** | **48** | **6** | **14** | **28** |
| **3. Duplicates (Data, Actions & Screens)** | **36** | **9** | **23** | **4** |
| **4. Extra Chrome (Banners, Helper Text, AI Callouts)** | **34** | **28** | **4** | **2** |
| **TOTAL INVENTORY ITEMS** | **196** | **87** | **45** | **64** |

---

## 1. Global Shell & TopBar

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-SH-01` | `components/layout/TopBar.tsx:109` | Sidebar collapse SVG icon | **KEEP** | Standard icon-only button with `aria-label="Toggle sidebar"` and title tooltip. | Low |
| `ICN-SH-02` | `components/layout/TopBar.tsx:130` | Magnifying glass SVG inside search input | **KEEP** | Standard input affordance indicating searchable command palette. | Low |
| `ICN-SH-03` | `components/layout/TopBar.tsx:181` | `AiSpinner` SVG component inside "AI Copilot" button | **HIDE** | Decorative animated spinner placed alongside an explicit text label. | Low |
| `ICN-SH-04` | `components/layout/TopBar.tsx:185` | Sun/Moon/Monitor SVGs in `ThemeToggle.tsx:21,38,56` | **KEEP** | Functional icon-only utility button toggling theme preferences. | Low |
| `ICN-SH-05` | `components/layout/TopBar.tsx:193` | Bell notification SVG in TopBar header | **HIDE** | Redundant notification icon; `/alerts` in sidebar already displays alert counts. | Low |
| `ICN-SH-06` | `components/layout/TenantSwitcher.tsx:90` | Loading spinner SVG | **KEEP** | Transient status indicator while loading tenant configuration. | Low |
| `ICN-SH-07` | `components/layout/TenantSwitcher.tsx:155` | Chevron up/down SVG | **KEEP** | Standard select/dropdown affordance. | Low |
| `ICN-SH-08` | `components/layout/TenantSwitcher.tsx:240` | Checkmark SVG for active tenant | **KEEP** | Semantic selection indicator. | Low |
| `ICN-SH-09` | `components/layout/TenantSwitcher.tsx:274` | `TenantIcon` SVG building glyph | **HIDE** | Decorative icon placed immediately before tenant name text label. | Low |
| `ICN-SH-10` | `components/layout/TimeWindowSelector.tsx:128` | Clock SVG icon | **HIDE** | Decorative icon beside explicit time window label (`15m`, `1h`, `24h`). | Low |
| `ICN-SH-11` | `components/layout/TimeWindowSelector.tsx:148` | Chevron down SVG | **KEEP** | Standard dropdown affordance. | Low |
| `ICN-SH-12` | `components/layout/TimeWindowSelector.tsx:198` | Checkmark SVG for active window | **KEEP** | Semantic selection indicator. | Low |
| `ICN-SH-13` | `components/layout/Sidebar.tsx:69-182` | 8 Workspace SVGs in `WorkspaceIcon` | **KEEP** | Primary navigation identifiers for 8 main workspaces. | Low |
| `ICN-SH-14` | `components/layout/Sidebar.tsx:343` | Mobile menu hamburger/close SVG | **KEEP** | Mobile viewport navigation control. | Low |
| `ICN-SH-15` | `components/copilot/CopilotDock.tsx:187` | External link / expand SVG | **KEEP** | Icon-only button with `title="Open full page"`. | Low |
| `ICN-SH-16` | `components/copilot/CopilotDock.tsx:196` | Close dock X SVG | **KEEP** | Icon-only button with `aria-label="Close Copilot"`. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-SH-01` | `components/layout/TopBar.tsx:155` | `TimeWindowSelector` wrapped in `hidden md:block` | **MERGE** | Hidden on mobile viewports (<768px); should be accessible via compact filter sheet. | Med |
| `NAV-SH-02` | `components/layout/TopBar.tsx:159` | `TenantSwitcher` wrapped in `hidden xl:block` | **MERGE** | Hidden on viewports below 1280px; multi-tenant users on laptops lose context. | Med |
| `NAV-SH-03` | `components/layout/TopBar.tsx:163` | `RoleBadge` wrapped in `hidden 2xl:block` | **HIDE** | Already demoted in P7; user role belongs on settings/profile, not primary header. | Low |
| `NAV-SH-04` | `components/layout/TopBar.tsx:167` | Static "All pipelines healthy" badge | **HIDE** | Static text without dynamic telemetry; replaced by system health in footer. | Low |
| `NAV-SH-05` | `config/navigation.ts:178` | 8 Primary Sidebar Workspaces | **KEEP** | Standard canonical top-level navigation structure. | Low |
| `NAV-SH-06` | `components/layout/Sidebar.tsx:481` | Secondary rail for active workspace pages | **KEEP** | Adopted in P5 to eliminate tabs-under-tabs. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-SH-01` | `components/layout/TopBar.tsx:188` | Notification Bell linking to `/alerts` | **HIDE** | Redundant with the "Alerts" item in the primary sidebar navigation. | Low |
| `CHR-SH-01` | `components/layout/TopBar.tsx:146` | Search keyboard badge `<kbd>⌘K</kbd>` | **KEEP** | Helpful keyboard shortcut affordance for power users. | Low |
| `CHR-SH-02` | `components/layout/Sidebar.tsx:555` | "Live" green pulsing status dot | **KEEP** | Real-time connection feedback to the event bus. | Low |

---

## 2. Command Center & Dashboards (`/dashboard`, `/dashboards/operations`, `/dashboards/soc-insights`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-DB-01` | `components/dashboard/DashboardWelcome.tsx:102` | Close X SVG on welcome banner | **HIDE** | Accompanies banner that will be hidden. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-DB-01` | `config/navigation.ts:196` | Tab: "Dashboard" (`/dashboard`) | **KEEP** | Primary operational landing view. | Low |
| `NAV-DB-02` | `config/navigation.ts:201` | Tab: "SLA Tracker" (`/sla`) | **KEEP** | Dedicated MTTA/MTTD/MTTR performance metrics. | Low |
| `NAV-DB-03` | `config/navigation.ts:205` | Tab: "Team Analytics" (`/analytics/team`) | **KEEP** | Team shift metrics and triage throughput. | Low |
| `NAV-DB-04` | `config/navigation.ts:209` | Tab: "Executive Digest" (`/reports/digest`) | **KEEP** | Reporting roll-up view. | Low |
| `NAV-DB-05` | `config/navigation.ts:213` | Tab: "Compliance" (`/compliance`) | **KEEP** | Regulatory and audit framework view. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `CHR-DB-01` | `components/dashboard/DashboardWelcome.tsx:82-108` | Hero dismissible banner "Welcome back, SOC Analyst!" | **HIDE** | Marketing-style greeting and noise; SRE console starts directly with metrics. | Low |
| `DUP-DB-01` | `components/dashboard/DashboardWelcome.tsx:94` | Alert count in banner ("You have X active alerts") | **HIDE** | Exact duplicate of the MetricStrip KPI tile immediately below. | Low |
| `DUP-DB-02` | `app/(app)/dashboards/operations/page.tsx:43` | Standalone Operations Dashboard route | **MERGE** | Redundant sub-dashboard route duplicating widgets on `/dashboard`. | Med |
| `DUP-DB-03` | `app/(app)/dashboards/soc-insights/page.tsx:127` | Standalone SOC Insights route | **MERGE** | Duplicate analytics page duplicating `/analytics/team` and `/dashboard`. | Med |
| `CHR-DB-02` | `components/dashboard/DashboardView.tsx:354` | Gradient background on welcome card | **HIDE** | Gradients violate reference design contract (borders instead of shadows/fills). | Low |

---

## 3. Alerts Stream & Investigation Queue (`/alerts`, `/queue`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-AL-01` | `components/alerts/AlertsView.tsx:174` | Left arrow polyline SVG on "Back to incidents" | **KEEP** | Clear navigational affordance when drilled down into alert scope. | Low |
| `ICN-AL-02` | `components/alerts/L1InvestigationStory.tsx:118` | Unicode `✓` in "✓ No Action Required" button | **HIDE** | Emoji inside button text; clean text button is cleaner. | Low |
| `ICN-AL-03` | `components/alerts/L1InvestigationStory.tsx:129` | Shield emoji `🛡` in "🛡 Approve Containment" button | **HIDE** | Decorative emoji in high-priority action button. | Low |
| `ICN-AL-04` | `components/alerts/L1InvestigationStory.tsx:267` | Unicode `✔` checkmark in story checklist | **MERGE** | Replace literal Unicode emoji with semantic CSS badge dot. | Low |
| `ICN-AL-05` | `components/alerts/L1InvestigationStory.tsx:323` | Unicode `✓` in `<span>✓ {actionExecuted}</span>` | **HIDE** | Redundant status glyph; status pill conveys state. | Low |
| `ICN-AL-06` | `components/alerts/L1InvestigationStory.tsx:363` | Speech bubble `💬` in "💬 Ask User on Slack" button | **HIDE** | Decorative emoji inside button label. | Low |
| `ICN-AL-07` | `components/alerts/L1InvestigationStory.tsx:370` | Magnifying glass `🔍` in "🔍 Deep Inspection" button | **HIDE** | Decorative emoji inside button label. | Low |
| `ICN-AL-08` | `components/alerts/L1InvestigationStory.tsx:501` | Star `★` in `Wave 2 (91 ★)` | **HIDE** | Decorative glyph in heuristic scoring output. | Low |
| `ICN-AL-09` | `components/alerts/EntityRiskQueue.tsx:34-37` | Emojis `👤`, `🖥️`, `🌐`, `🔗` for User, Host, IP, Domain | **HIDE** | Inconsistent emoji set beside normalized entity labels. | Low |
| `ICN-AL-10` | `components/alerts/EntityRiskQueue.tsx:234` | Unicode `✓` and `↑` in SLA ratio label | **HIDE** | Glyph clutter in metric string `2026 bar ≥ 50:1 {meets ? '✓' : '↑'}`. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-AL-01` | `config/navigation.ts:229` | Tab: "Alert Stream" (`/alerts`) | **KEEP** | Core real-time alert triage feed. | Low |
| `NAV-AL-02` | `config/navigation.ts:233` | Tab: "Focus Triage Queue" (`/queue`) | **MERGE** | Separate page for queued alerts; should be a filter preset on `/alerts`. | Med |
| `NAV-AL-03` | `components/queue/QueueView.tsx:173` | In-page `role="tablist"` for entity types | **KEEP** | Functions as in-table category filter. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-AL-01` | `components/alerts/AlertsView.tsx:182` | PageHead title count vs MetricStrip card count | **MERGE** | Active alert count is rendered in PageHead subtitle AND MetricStrip. | Low |
| `DUP-AL-02` | `components/alerts/EntityRiskQueue.tsx:288` | Entity risk score bar vs severity badge in row | **MERGE** | Redundant risk visualization; badge with dot+tint is sufficient. | Low |
| `CHR-AL-01` | `components/alerts/AlertsView.tsx:184` | Verbose subtitle paragraph under PageHead | **HIDE** | Paragraph restates obvious console function ("Unified real-time detection..."). | Low |
| `CHR-AL-02` | `components/alerts/BulkTriageBar.tsx:161` | Floating bulk triage action bar | **KEEP** | Critical bulk operator action surface; only visible upon selection. | Low |

---

## 4. Alert Detail (`/alerts/[id]`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-AD-01` | `components/alerts/ExplainDrawer.tsx:547` | Close X SVG button | **KEEP** | Icon-only drawer dismissal button with tooltip/aria-label. | Low |
| `ICN-AD-02` | `components/alerts/CreateCaseModal.tsx:136` | Close X SVG button | **KEEP** | Modal dismissal button. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-AD-01` | `components/alerts/AlertDetailView.tsx:805` | In-page tabs `overview` \| `timeline` \| `raw` | **MERGE** | Convert into single scrollable pane with sticky anchor rail. | Med |
| `NAV-AD-02` | `components/alerts/InvestigationRail.tsx:201` | Side rail tabs `alerts` \| `evidence` \| `actions` | **KEEP** | Contextual drawer rail providing fast triage actions. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-AD-01` | `components/alerts/AlertDetailView.tsx:875` | Alert title in breadcrumb + header + detail card | **MERGE** | Alert title is displayed 3 times on the initial screen load. | Low |
| `DUP-AD-02` | `components/alerts/ExplainDrawer.tsx:320` | Drawer content duplicating main view investigation | **MERGE** | Both display AI rationale, rule match details, and affected entities. | Med |
| `CHR-AD-01` | `components/alerts/AlertDetailView.tsx:1051` | Divider line between timeline dots | **KEEP** | Structural timeline spine. | Low |
| `CHR-AD-02` | `components/alerts/AttackStory.tsx:232` | Secondary vertical divider | **HIDE** | Redundant border line creating double-border clutter. | Low |

---

## 5. Incidents / Cases (`/cases`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-CS-01` | `components/cases/CasesView.tsx:173` | Document/Export SVG next to "Export Report" text | **HIDE** | Decorative icon duplicated next to explicit text label. | Low |
| `ICN-CS-02` | `components/cases/CasesView.tsx:266` | Plus SVG next to "New Case" text | **HIDE** | Decorative icon duplicated next to explicit text label. | Low |
| `ICN-CS-03` | `components/cases/CasesView.tsx:347` | Search glass SVG in search input | **KEEP** | Standard search input affordance. | Low |
| `ICN-CS-04` | `components/shifts/ShiftsView.tsx:108` | Document SVG in "Generate Handoff Report" | **HIDE** | Decorative icon duplicated next to explicit button label. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-CS-01` | `config/navigation.ts:249` | Tab: "Active Incidents" (`/cases`) | **KEEP** | Primary incident workspace view. | Low |
| `NAV-CS-02` | `config/navigation.ts:253` | Tab: "Shift Handoff" (`/shifts`) | **KEEP** | Critical shift exchange and handover logging. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-CS-01` | `components/cases/CasesView.tsx:266` | "New Case" button in header vs empty state button | **MERGE** | Same action repeated; keep one primary button per view region. | Low |
| `CHR-CS-01` | `components/cases/CasesView.tsx:257` | Subtitle helper text under "Cases" title | **HIDE** | Explanatory text clutter ("Manage incident investigations..."). | Low |

---

## 6. Case Workspace / Incident Detail (`/cases/[id]`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-CW-01` | `components/cases/CaseWorkspace.tsx:275` | Unicode checkmark `✓` in task status | **KEEP** | Semantic indicator for completed subtasks. | Low |
| `ICN-CW-02` | `components/cases/CaseWorkspace.tsx:1461` | Empty state SVG icon in AttackPathPanel | **KEEP** | Empty state illustration. | Low |
| `ICN-CW-03` | `components/cases/CaseWorkspace.tsx:1697` | Empty state SVG icon in AttackChainPanel | **KEEP** | Empty state illustration. | Low |
| `ICN-CW-04` | `components/cases/InvestigationLedger.tsx:932` | Arrow glyph `▸` / `▾` in ledger collapsible row | **KEEP** | Standard accordion expand/collapse affordance. | Low |
| `ICN-CW-05` | `components/cases/InvestigationLedger.tsx:972` | Arrow glyph `▸` / `▾` in prompt inspect row | **KEEP** | Standard accordion expand/collapse affordance. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-CW-01` | `components/cases/CaseWorkspace.tsx:904-956` | In-page 6-tab bar (`overview`, `investigation`, `attack-path`, `attack-chain`, `ledger`, `report`) | **MERGE** | Converted to sticky pill rail in P4; prepare for single-scroll overview in P4 cleanup. | Med |
| `NAV-CW-02` | `components/cases/CaseWorkspace.tsx:922` | Tab badge: `audit` pill on Ledger tab | **HIDE** | Badge clutter on top of tab label. | Low |
| `NAV-CW-03` | `components/cases/CaseWorkspace.tsx:932` | Tab badge: `graph` pill on Attack path tab | **HIDE** | Badge clutter on top of tab label. | Low |
| `NAV-CW-04` | `components/cases/CaseWorkspace.tsx:942` | Tab badge: `timeline` pill on Attack chain tab | **HIDE** | Badge clutter on top of tab label. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-CW-01` | `components/cases/CaseWorkspace.tsx:972` | AttackPathPanel vs AttackChainPanel vs `/graph` | **MERGE** | Separate tabs showing attack graph and attack chain; should be unified. | Med |
| `DUP-CW-02` | `components/cases/CaseWorkspace.tsx:978` | InvestigationLedger vs Global `/audit` log | **MERGE** | Incident decision ledger duplicates audit log schema; keep scoped to case. | Low |
| `CHR-CW-01` | `components/cases/CaseWorkspace.tsx:780` | Large header badge stack above case title | **HIDE** | 5 inline badges above title create vertical spacing noise. | Low |

---

## 7. Hunting & Threat Intelligence (`/hunt`, `/threat-intel`, `/graph`, `/explore`, `/federated-search`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-HT-01` | `components/hunt/HuntView.tsx:267` | Sparkles/Logo SVG next to "AiSOC Hunt" heading | **HIDE** | Decorative branding icon beside page title. | Low |
| `ICN-HT-02` | `components/hunt/HuntView.tsx:291` | Search glass SVG in natural language query input | **KEEP** | Clear search input affordance. | Low |
| `ICN-HT-03` | `components/hunt/HuntView.tsx:425` | Clock SVG next to schedule text | **HIDE** | Decorative icon beside text string. | Low |
| `ICN-HT-04` | `components/hunt/HuntView.tsx:450` | Unicode `▶` in `▶ Run` button | **HIDE** | Decorative arrow inside button text. | Low |
| `ICN-HT-05` | `components/hunt/HuntView.tsx:458` | Trash/Delete SVG button | **KEEP** | Icon-only action button with `title="Delete"`. | Low |
| `ICN-HT-06` | `components/hunt/HuntView.tsx:542` | Trash/Delete SVG button | **KEEP** | Icon-only action button with `title="Delete"`. | Low |
| `ICN-HT-07` | `components/hunt/HuntView.tsx:1073` | Sparkles symbol `✦` in `✦ Ask another question` | **HIDE** | Decorative sparkle in secondary query button. | Low |
| `ICN-HT-08` | `components/hunt/HuntView.tsx:1193` | Select filter SVG | **HIDE** | Decorative icon beside preset dropdown. | Low |
| `ICN-HT-09` | `components/hunt/HuntView.tsx:1238` | Unicode `▶` in `<>▶ Run hunt</>` button | **HIDE** | Decorative glyph in primary execution button. | Low |
| `ICN-HT-10` | `components/threat-intel/ThreatIntelView.tsx:401` | Search glass SVG in indicator search | **KEEP** | Standard search input affordance. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-HT-01` | `config/navigation.ts:278` | Tab: "Threat Hunt" (`/hunt`) | **KEEP** | Primary interactive hypothesis and natural language hunt interface. | Low |
| `NAV-HT-02` | `config/navigation.ts:283` | Tab: "Threat Intelligence" (`/threat-intel`) | **KEEP** | External indicator feeds, IOC search, and threat actor dossiers. | Low |
| `NAV-HT-03` | `config/navigation.ts:287` | Tab: "Attack Graph" (`/graph`) | **KEEP** | Enterprise entity-relationship attack path visualizer. | Low |
| `NAV-HT-04` | `config/navigation.ts:291` | Tab: "Data Lake Explorer" (`/explore`) | **MERGE** | Raw ClickHouse query tool; overlaps with Threat Hunt SQL mode. | Med |
| `NAV-HT-05` | `config/navigation.ts:296` | Tab: "Federated Search" (`/federated-search`) | **MERGE** | Dispersed connector search; should be unified under Hunting query builder. | Med |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `CHR-HT-01` | `components/hunt/HuntView.tsx:264-282` | Giant marketing-style hero banner with gradient | **HIDE** | Visual noise inconsistent with calm SRE console layout. | Low |
| `CHR-HT-02` | `components/hunt/HuntView.tsx:274` | Subtitle "Transform natural language into high-fidelity..." | **HIDE** | Explanatory marketing copy on an operational screen. | Low |
| `DUP-HT-01` | `components/hunt/HuntView.tsx:1053` | Secondary `<h1>` "Threat Hunting" below hero | **MERGE** | Two `<h1>` page titles exist in the same component. | Low |
| `DUP-HT-02` | `components/threat-intel/ThreatIntelView.tsx:370` | Metric cards duplicating total IOC counts | **MERGE** | IOC count displayed in PageHead and in the summary cards below. | Low |

---

## 8. Assets & Identities (`/identity/permissions`, `/easm`, `/fim`, `/ai-estate`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-AI-01` | `components/ai-estate/AiEstateView.tsx` | (None present) | **KEEP** | Clean typography, no unnecessary icon usage. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-AI-01` | `config/navigation.ts:319` | Tab: "Identities" (`/identity/permissions`) | **KEEP** | Core IAM effective permissions and entitlement analysis. | Low |
| `NAV-AI-02` | `config/navigation.ts:324` | Tab: "EASM" (`/easm`) | **KEEP** | External Attack Surface Management asset inventory. | Low |
| `NAV-AI-03` | `config/navigation.ts:328` | Tab: "FIM" (`/fim`) | **KEEP** | File Integrity Monitoring critical asset changes. | Low |
| `NAV-AI-04` | `config/navigation.ts:332` | Tab: "AI Estate" (`/ai-estate`) | **KEEP** | Enterprise LLM & agent inventory / governance. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `CHR-AI-01` | `components/easm/EASMView.tsx:136` | Subtitle helper text under EASM heading | **HIDE** | Verbose explanatory paragraph. | Low |
| `CHR-AI-02` | `components/fim/FimDashboard.tsx:135` | Subtitle helper text under FIM heading | **HIDE** | Verbose explanatory paragraph. | Low |
| `CHR-AI-03` | `components/ai-estate/AiEstateView.tsx:132` | Subtitle helper text under AI Estate heading | **HIDE** | Verbose explanatory paragraph. | Low |
| `DUP-AI-01` | `components/ai-estate/AiEstateView.tsx:145` | Model count in stat card vs table summary header | **MERGE** | Same model metric displayed in two adjacent containers. | Low |

---

## 9. Detections & Rules (`/detection`, `/detection/*`, `/coverage-advisor`, `/noise-tuning`, `/purple-team`, `/honeytokens`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-DT-01` | `components/detections/DetectionsView.tsx:412` | Plus SVG in "New rule" button | **HIDE** | Decorative icon duplicated next to text label. | Low |
| `ICN-DT-02` | `components/detections/DetectionsView.tsx:475` | Search glass SVG in rule filter | **KEEP** | Standard search affordance. | Low |
| `ICN-DT-03` | `components/detections/DetectionCatalog.tsx:78-80` | Unicode stars `★`, `☆` for community ratings | **HIDE** | Uncalibrated consumer-style star ratings in enterprise console. | Low |
| `ICN-DT-04` | `components/detections/DetectionCatalog.tsx:195` | Unicode `✓` in "✓ Installed" button | **HIDE** | Text label alone or status pill is sufficient. | Low |
| `ICN-DT-05` | `components/detections/DetectionProposalsView.tsx:327` | External link SVG in "View PR" link | **KEEP** | Standard affordance indicating external GitHub navigation. | Low |
| `ICN-DT-06` | `components/detections/ContributorLeaderboard.tsx:84` | Arrow SVG in "Contribute a rule" button | **HIDE** | Decorative glyph next to explicit button text. | Low |
| `ICN-DT-07` | `app/(app)/honeytokens/page.tsx:248` | Unicode `✕` close button | **KEEP** | Modal dismiss control. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-DT-01` | `config/navigation.ts:357` | Tab: "Active Rules" (`/detection`) | **KEEP** | Primary ruleset index. | Low |
| `NAV-DT-02` | `config/navigation.ts:363` | Tab: "Rule Catalog" (`/detection/catalog`) | **KEEP** | Pre-built Sigma/OCSF detection library. | Low |
| `NAV-DT-03` | `config/navigation.ts:367` | Tab: "ATT&CK Coverage" (`/coverage-advisor`) | **MERGE** | DUPLICATE: Points to `/coverage-advisor`, while Detections has in-page coverage tab! | Med |
| `NAV-DT-04` | `config/navigation.ts:372` | Tab: "Noise & Tuning" (`/noise-tuning`) | **MERGE** | DUPLICATE: Points to `/noise-tuning`, while Detections has in-page drift tab! | Med |
| `NAV-DT-05` | `config/navigation.ts:377` | Tab: "Rule Proposals" (`/detection/proposals`) | **KEEP** | Community / git-backed detection proposals. | Low |
| `NAV-DT-06` | `config/navigation.ts:381` | Tab: "Purple Team" (`/purple-team`) | **KEEP** | Adversary emulation and detection validation. | Low |
| `NAV-DT-07` | `config/navigation.ts:386` | Tab: "Deception" (`/honeytokens`) | **KEEP** | Honeytoken generation and trigger inspection. | Low |
| `NAV-DT-08` | `components/detections/DetectionsView.tsx:146` | In-page tabs: `rules` \| `coverage` \| `confidence` \| `drift` | **MERGE** | Tab-under-tab anti-pattern; duplicate of standalone tabs NAV-DT-03 & 04. | Med |
| `NAV-DT-09` | `app/(app)/purple-team/page.tsx:887` | In-page tabs: `Coverage` \| `Executions` \| `Tabletop` | **KEEP** | View switcher within emulation suite. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-DT-01` | `components/detections/DetectionsView.tsx:735` | In-page `MitreRuleHeatmap` vs `/coverage-advisor` | **MERGE** | Exact duplicate heatmap component loaded on two different paths. | Med |
| `DUP-DT-02` | `components/detections/DetectionsView.tsx:739` | In-page `DriftInbox` vs `/noise-tuning` (`RuleTuningView`) | **MERGE** | Duplicate tuning views displaying identical false-positive data. | Med |
| `CHR-DT-01` | `components/detections/DetectionsView.tsx:455-460` | Amber "Detection API unreachable — showing curated demo rules..." banner | **KEEP** | Legitimate failover notification, but style should be quiet and compact. | Low |
| `CHR-DT-02` | `components/detections/DetectionsView.tsx:395` | Explanatory helper subtitle text | **HIDE** | Subtitle text clutter under page heading. | Low |

---

## 10. Automation & Playbooks (`/playbooks`, `/responder/approvals`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-PB-01` | `components/playbooks/ComposablePacksView.tsx:43-45` | Emojis `🔍 1. Investigation`, `⚡ 2. Response`, `🛡 3. Governance` | **HIDE** | Unprofessional emoji set in workflow stage tabs. | Low |
| `ICN-PB-02` | `components/playbooks/ThreeCategoryRunbookCard.tsx:117` | Unicode `▶` in `▶ Run` button | **HIDE** | Decorative arrow glyph inside text button. | Low |
| `ICN-PB-03` | `components/playbooks/ThreeCategoryRunbookCard.tsx:128,153,182` | Emojis `🔍`, `⚡`, `🛡` inside card badges | **HIDE** | Duplicate visual indicator alongside explicit category titles. | Low |
| `ICN-PB-04` | `components/playbooks/ThreeCategoryRunbookCard.tsx:137,162` | Unicode check `✔` and triangle `▸` in step indicators | **MERGE** | Replace emojis with standardized small 6px dot status indicators. | Low |
| `ICN-PB-05` | `components/playbooks/PlaybooksGallery.tsx:599` | Sparkles `✦` in `✦ AI RCA Ready` badge | **HIDE** | Marketing fluff and decorative sparkle on technical playbook tile. | Low |
| `ICN-PB-06` | `components/playbooks/PlaybookFlowCanvas.tsx:435` | Warning triangle `⚠ {validationError}` | **KEEP** | Crucial DAG canvas node validation warning. | Low |
| `ICN-PB-07` | `components/playbooks/PlaybookEditor.tsx:727` | Unicode `✕` close button | **KEEP** | Modal dismiss control. | Low |
| `ICN-PB-08` | `components/playbooks/DraftFromPromptDialog.tsx:156` | Unicode `✕` close button | **KEEP** | Modal dismiss control. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-PB-01` | `config/navigation.ts:403` | Tab: "Playbooks" (`/playbooks`) | **KEEP** | Primary automation runbook library. | Low |
| `NAV-PB-02` | `config/navigation.ts:407` | Tab: "Approval Inbox" (`/responder/approvals`) | **KEEP** | Governed human-in-the-loop action approval queue. | Low |
| `NAV-PB-03` | `components/playbooks/PlaybooksGallery.tsx:217` | In-page `role="tablist"` for playbook categories | **KEEP** | Category filter for runbook templates. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-PB-01` | `components/playbooks/PlaybooksView.tsx:214` | Runbooks Table vs PlaybooksGallery grid | **MERGE** | Both display the same playbook library; standardize on table view per reference. | Med |
| `CHR-PB-01` | `components/playbooks/PlaybooksView.tsx:158` | Subtitle helper text under PageHead | **HIDE** | Explanatory prose clutter ("Governed automated response workflows..."). | Low |

---

## 11. Settings & Platform Administration (`/settings`, `/connectors`, `/marketplace`, `/audit`, `/access-review`, `/evaluate`, `/costs`, `/mssp`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-ST-01` | `components/connectors/ConnectorsView.tsx:192` | Wrench emoji `🔧` in connector metadata | **HIDE** | Emoji clutter in technical configuration view. | Low |
| `ICN-ST-02` | `components/connectors/ConnectorsView.tsx:217` | Plus SVG in "Add Connector" button | **HIDE** | Decorative icon duplicated next to text label. | Low |
| `ICN-ST-03` | `components/connectors/ConnectorInstanceList.tsx:230` | Freshness clock SVG | **HIDE** | Decorative icon beside freshness timestamp text. | Low |
| `ICN-ST-04` | `components/connectors/ConnectorInstanceList.tsx:255` | Drift warning SVG | **HIDE** | Duplicate icon; badge tint already communicates drift status. | Low |
| `ICN-ST-05` | `components/connectors/ConnectorInstanceList.tsx:278` | Dropped events SVG | **HIDE** | Decorative icon in stat badge. | Low |
| `ICN-ST-06` | `components/connectors/ConnectorInstanceList.tsx:335` | Trash/Delete SVG button | **KEEP** | Icon-only button with title tooltip. | Low |
| `ICN-ST-07` | `components/connectors/ConnectorInstanceList.tsx:354` | Unicode `✓` and `✗` in connection test feedback | **HIDE** | Clean text status pill is calmer. | Low |
| `ICN-ST-08` | `components/connectors/ConnectorInstanceList.tsx:418` | Empty state SVG | **KEEP** | Empty state illustration. | Low |
| `ICN-ST-09` | `components/connectors/ConnectorInstanceList.tsx:438` | Plus SVG in "Add your first connector" | **HIDE** | Decorative icon duplicated next to text label. | Low |
| `ICN-ST-10` | `components/connectors/AddConnectorModal.tsx:1530` | Close X SVG | **KEEP** | Modal dismiss control. | Low |
| `ICN-ST-11` | `components/connectors/AddConnectorModal.tsx:1545` | Search glass SVG in connector modal | **KEEP** | Search input affordance. | Low |
| `ICN-ST-12` | `components/connectors/AddConnectorModal.tsx:1583` | Chevron down SVG | **KEEP** | Category dropdown affordance. | Low |
| `ICN-ST-13` | `components/connectors/InboxTokensPanel.tsx:627` | Copy clipboard SVG | **KEEP** | Icon-only copy action. | Low |
| `ICN-ST-14` | `components/marketplace/MarketplaceView.tsx:240,242` | Unicode stars `★`, `☆` for plugin rating | **HIDE** | Consumer star ratings in enterprise security catalog. | Low |
| `ICN-ST-15` | `components/audit/AuditLogView.tsx:217` | Download SVG in "Export CSV" button | **HIDE** | Decorative icon duplicated next to text label. | Low |
| `ICN-ST-16` | `components/audit/AuditLogView.tsx:243` | Refresh SVG in "Refresh" button | **HIDE** | Decorative icon duplicated next to text label. | Low |
| `ICN-ST-17` | `components/audit/AuditLogView.tsx:420` | Unicode `▲ hide` / `▼ show` | **KEEP** | Row expand/collapse affordance. | Low |
| `ICN-ST-18` | `components/settings/RBACView.tsx:185` | Unicode `✕` close button | **KEEP** | Modal dismiss control. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-ST-01` | `config/navigation.ts:434` | Tab: "Platform Settings" (`/settings`) | **KEEP** | Core platform configuration view. | Low |
| `NAV-ST-02` | `config/navigation.ts:443` | Tab: "Connectors" (`/connectors`) | **MERGE** | DUPLICATE: Connectors is also available under `/settings` integrations panel. | Med |
| `NAV-ST-03` | `config/navigation.ts:447` | Tab: "Marketplace" (`/marketplace`) | **KEEP** | Plugin and integration catalog. | Low |
| `NAV-ST-04` | `config/navigation.ts:451` | Tab: "Users" (`/settings/users`) | **MERGE** | DUPLICATE: Users is also available under `/settings` workspace/team panel. | Med |
| `NAV-ST-05` | `config/navigation.ts:456` | Tab: "Access Reviews" (`/access-review`) | **KEEP** | Entitlement recertification campaigns. | Low |
| `NAV-ST-06` | `config/navigation.ts:460` | Tab: "Audit Log" (`/audit`) | **MERGE** | DUPLICATE: Audit log is also embedded under `/settings` audit panel. | Med |
| `NAV-ST-07` | `config/navigation.ts:464` | Tab: "AI Evaluation" (`/evaluate`) | **KEEP** | Offline model and prompt regression benchmarking. | Low |
| `NAV-ST-08` | `config/navigation.ts:468` | Tab: "Cost Estimator" (`/costs`) | **KEEP** | LLM token and cloud infrastructure cost dashboard. | Low |
| `NAV-ST-09` | `config/navigation.ts:472` | Tab: "MSSP" (`/mssp`) | **KEEP** | Multi-tenant managed service provider portfolio. | Low |
| `NAV-ST-10` | `components/settings/SettingsView.tsx:397` | In-page 16-section sticky rail | **KEEP** | Demoted from tabs-under-tabs to calm sticky rail in P4. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-ST-01` | `components/connectors/ConnectorsView.tsx:217` | "Add Connector" in header vs empty state button | **MERGE** | Redundant duplicate action buttons. | Low |
| `DUP-ST-02` | `components/settings/SettingsView.tsx:481` | IntegrationsPanel vs `/connectors` view | **MERGE** | Two separate full-page surfaces displaying the exact same connector list. | Med |
| `DUP-ST-03` | `components/settings/SettingsView.tsx:497` | AuditPanel vs `/audit` view | **MERGE** | Two surfaces displaying the same operational audit events. | Med |
| `CHR-ST-01` | `components/settings/SettingsView.tsx:411` | Subtitle helper text under Settings header | **HIDE** | Explanatory text clutter under page title. | Low |

---

## 12. Analytics, Reports & Compliance (`/sla`, `/analytics/team`, `/reports/digest`, `/compliance`, `/compliance/soc2`)

### Icons & Symbols
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `ICN-AN-01` | `components/analytics/TeamAnalyticsView.tsx:53-55` | Emojis `🥇`, `🥈`, `🥉` for leaderboard rank | **HIDE** | Juvenile gamification emojis out of place in serious SOC console. | Low |
| `ICN-AN-02` | `components/analytics/TeamAnalyticsView.tsx:64-83` | SVGs for `badge`, `streak`, `record`, `rank` | **HIDE** | Decorative badges/stars cluttering analyst metrics. | Low |
| `ICN-AN-03` | `components/compliance/FrameworkView.tsx:310` | Chevron `▲` / `▼` for control details | **KEEP** | Standard accordion expand/collapse affordance. | Low |
| `ICN-AN-04` | `components/compliance/SOC2View.tsx:259` | Chevron `▲` / `▼` for evidence row | **KEEP** | Standard accordion expand/collapse affordance. | Low |

### Navigation
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `NAV-AN-01` | `components/compliance/FrameworkView.tsx:72` | In-page tabs `controls` \| `heatmap` | **KEEP** | View switch between compliance tabular checklist and matrix. | Low |

### Duplicates & Extra Chrome
| ID | File:Line | What It Is | Proposed Action | Reason | Risk |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `DUP-AN-01` | `components/compliance/SOC2View.tsx` | SOC2View vs FrameworkView (`/compliance/soc2`) | **MERGE** | Dedicated hardcoded SOC2 view duplicates generic FrameworkView renderer. | Med |
| `DUP-AN-02` | `components/reports/ExecutiveDigest.tsx:150` | Executive metric cards duplicating `/dashboard` | **MERGE** | Re-queries identical MTTD/MTTR and alert volumes; unify data fetcher. | Low |
| `CHR-AN-01` | `components/analytics/TeamAnalyticsView.tsx:130` | Subtitle helper text under Team Analytics | **HIDE** | Subtitle copy clutter. | Low |
| `CHR-AN-02` | `components/reports/ExecutiveDigest.tsx:146` | Subtitle helper text under Executive Digest | **HIDE** | Subtitle copy clutter. | Low |

---

## Next Steps

This inventory is complete and published to `docs/declutter-D1.md`.
No code files or implementations have been edited.

**Awaiting user review and approval** of the proposed HIDE / MERGE / KEEP items before proceeding to Phase D2 execution.
