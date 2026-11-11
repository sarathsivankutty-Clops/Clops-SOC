# Clean UI Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the AiSOC web console (`apps/web`) from its current cluttered, multi-layered layout into the clean, minimalist design system of `ui_src_final` (`C:\Users\CLOPS_Sarath_S\Downloads\ui_src_final-20261106T121344Z-1-001\ui_src_final`).

**Architecture:** Adopt `ui_src_final`'s core design system tokens and its 4 minimalist primitives (`PageHead`, `MetricStrip`/`KpiCard`, `.pane.pad0` + `table.tbl`, and `detail-grid` `dg-main`/`dg-side`). Remove redundant stacked header chrome (`WorkspaceTabBar`, nested breadcrumbs) from `AppShell`. Streamline `/alerts`, `/playbooks`, and `/responder/approvals` to directly match `Incidents.tsx`, `IncidentDetail.tsx`, `Runbooks.tsx`, and `ActionCenter.tsx`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, SWR, TypeScript.

**Spec Reference:** [`C:\Users\CLOPS_Sarath_S\Downloads\ui_src_final-20261106T121344Z-1-001\ui_src_final`](file:///C:/Users/CLOPS_Sarath_S/Downloads/ui_src_final-20261106T121344Z-1-001/ui_src_final) and [`SRE-to-SOC-frontend-analysis.md`](file:///C:/Users/CLOPS_Sarath_S/Downloads/ui_src_final-20261106T121344Z-1-001/ui_src_final/SRE-to-SOC-frontend-analysis.md).

---

## Global Constraints

- **No Tool / Assistant Attribution:** Zero attribution to tools or AI assistants in code, comments, or commit messages.
- **No Competitor Product Naming:** Outside authorized integration surfaces, strictly follow `scripts/competitor_names.toml`.
- **Zero Fabricated Data:** Preserve honest empty, zero, or error states.
- **Do Not Edit `plans/`:** All plans stored in `docs/superpowers/plans/` or the artifact directory.
- **100% Backward Compatibility:** Preserve all existing API routes, parameters, and authentication contracts.

---

## Review Focus

1. **Visual Simplicity:** The page must not show multiple stacked header bars (TopBar + TabBar + Breadcrumbs). Page header sits cleanly below TopBar.
2. **Readability & Density:** Metric strips must render as a framed 1px-gap grid (`.metrics.c3`/`.c4`/`.c5`) with large numbers and quiet trend arrows.
3. **Table Legibility:** Tables must use fixed-width column layouts (`table-layout: fixed`), subtle uppercase headers, monospace metadata chips, and soft pill badges.
4. **Investigation Clarity:** Alert details must use the 2-column `detail-grid` (`dg-main` + `dg-side`) with a clear RCA card, key-value change grid, and ready-to-run CLI mitigation card.
5. **No Regressions on Build:** The Next.js production build (`docker compose build web`) must pass with zero TypeScript errors.

---

## Tasks

### Task 1: Clean CSS Tokens & Minimalist Primitives (`apps/web`)

**Files:**
- Create: `apps/web/src/styles/cloudifyops.css`
- Modify: `apps/web/src/app/globals.css:1-25`
- Create: `apps/web/src/components/ui/CloudifyOpsUI.tsx`

**Requirements:**
- Extract and adapt CSS classes from `ui_src_final/src/styles/app.css`:
  - Layout: `#app`, `.content`, `.page-head`, `.eyebrow`, `.page-title`, `.page-desc`, `.page-actions`.
  - Buttons: `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.sm`, `.btn.ok`, `.btn.danger`.
  - Metrics: `.metrics`, `.kpi`, `.kpi-l`, `.kpi-v`, `.kpi-s`, `.kpi-status`, `.kpi-meta`, `.trend`.
  - Table: `.pane`, `.pane.pad0`, `.tbl`, `.tbl-inv`, `.fchip`, `.filters`, `.seg`.
  - Detail: `.detail-grid`, `.dg-main`, `.dg-side`, `.back-link`, `.meta-bar`, `.meta-chip`, `.kv`, `.kv-k`, `.kv-v`, `.cli-block`, `.mit-steps`, `.appr-btns`, `.evidence`.
  - Feed: `.feed`, `.feed-item`, `.feed-dot`, `.feed-line`, `.feed-body`, `.feed-time`.
- Implement `CloudifyOpsUI.tsx` exporting:
  - `PageHead({ title, desc, actions, eyebrow })`
  - `KpiCard({ k, onClick })`
  - `MetricStrip({ items, cols, onCardClick })`
  - `EmptyState({ ico, title, body, action })`
  - `FeedItem({ f })`

- [ ] Write `apps/web/src/styles/cloudifyops.css`
- [ ] Import `cloudifyops.css` in `apps/web/src/app/globals.css`
- [ ] Write `apps/web/src/components/ui/CloudifyOpsUI.tsx`

---

### Task 2: Unclutter Layout Shell (`AppShell.tsx` & `Sidebar.tsx`)

**Files:**
- Modify: `apps/web/src/components/layout/AppShell.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`
- Modify: `apps/web/src/components/layout/TopBar.tsx`

**Requirements:**
- In `AppShell.tsx`:
  - Remove `WorkspaceTabBar` and extra breadcrumbs from the global template so pages own their content and `PageHead`.
  - Clean padding: single top-bar offset with clean max-width container (`max-w-[1320px] mx-auto px-6 py-4`).
- In `Sidebar.tsx`:
  - Retain the clean navigation hierarchy from `ui_src_final/components/Shell.tsx`:
    - Brand mark with blue-green gradient
    - Navigation group label
    - Navigation items with clean icons and active green bar indicator (`.nav-item.active::before`)
    - Theme toggle switch (Dark / Light)
    - Clean user card with avatar and role chip
- In `TopBar.tsx`:
  - Retain collapse button, breadcrumb, global search input, and clean environment switcher.

- [ ] Edit `apps/web/src/components/layout/AppShell.tsx`
- [ ] Update `apps/web/src/components/layout/Sidebar.tsx`
- [ ] Update `apps/web/src/components/layout/TopBar.tsx`

---

### Task 3: Clean Incidents / Alerts View (`/alerts`)

**Files:**
- Modify: `apps/web/src/components/alerts/AlertsView.tsx`
- Modify: `apps/web/src/components/alerts/AlertDetailView.tsx`

**Requirements:**
- Align `AlertsView.tsx` directly with `ui_src_final/screens/Incidents.tsx`:
  - `PageHead title="Incidents"` (or "Alerts & Incidents")
  - `MetricStrip` with 3 clean KPIs (Open, In Progress, Mean Time to RCA)
  - Horizontal filter chips (`fchip`): `All`, `Critical`, `High`, `Medium`, `Low`, `Investigating`, `RCA ready`, `Mitigation proposed`
  - Clean `.pane.pad0` containing `table.tbl.tbl-inv`:
    - Columns: Severity dot (`.sev`), Incident / Alert title + ID + Resource, Detection / Alarm, Space / Account / Region, Status Badge, Age.
    - Click row $\to$ smoothly transitions to `AlertDetailView`.
- Align `AlertDetailView.tsx` directly with `ui_src_final/screens/IncidentDetail.tsx`:
  - `BackLink` ("← Back to incidents")
  - `PageHead` with title, ID, alarm/rule, and Jira / Action buttons.
  - `meta-bar` (severity badge, status badge, account/region chips, detection $\to$ RCA duration).
  - 2-Column Grid (`detail-grid` with `dg-main` and `dg-side`):
    - `dg-main`:
      - **Root Cause Analysis Card**: clean card title, paragraph explaining RCA in plain, readable English.
      - **What changed / Observed anomaly Card**: clean 2-column key-value grid (`API call`, `Who`, `When`, `Target`, `Detail`).
      - **Mitigation Plan / Response Action Card**:
        - Title + Badge ("Human action required" or "Recommended Response")
        - Action headline
        - Ordered steps list (`mit-steps`)
        - Ready-to-run CLI / API snippet (`cli-block` with copy button)
        - Safeguard / Note (blast radius & rollback note)
        - Action buttons: Primary `Apply fix` (green), secondary `Run via SSM/CLI`, destructive `Reject/Dismiss` (red)
    - `dg-side`:
      - **Details Card**: Key-value list (`kv`)
      - **Incident Timeline Card**: clean vertical feed (`feed`) with `FeedItem`
      - **Correlated Evidence Card**: clean icon + label + metadata rows (`evidence`)

- [ ] Update `apps/web/src/components/alerts/AlertsView.tsx`
- [ ] Update `apps/web/src/components/alerts/AlertDetailView.tsx`

---

### Task 4: Clean Runbooks View (`/playbooks`)

**Files:**
- Modify: `apps/web/src/components/playbooks/PlaybooksView.tsx`

**Requirements:**
- Align `PlaybooksView.tsx` directly with `ui_src_final/screens/Runbooks.tsx`:
  - `PageHead`:
    - Title: "Runbooks"
    - Description: "Playbooks the agent matches during incidents (via MCP runbook DB)"
    - Action: Search / Filter input
  - `MetricStrip` with 4 KPIs:
    - Total Runbooks
    - Matched This Week
    - Avg Success Rate
    - Exposed via MCP
  - Clean `.pane.pad0` with `table.tbl`:
    - Columns: `Runbook`, `Category`, `Applied`, `Success`, `Last used`, `Match`, `Actions` (Run button).
    - Clicking Run triggers the execution workflow with toast feedback.
  - Optional secondary action button "Create Runbook" or "Draft from Prompt" without cluttering the primary view.

- [ ] Update `apps/web/src/components/playbooks/PlaybooksView.tsx`

---

### Task 5: Clean Action Center View (`/responder/approvals`)

**Files:**
- Modify: `apps/web/src/components/responder/ApprovalsView.tsx` (or route component for `/responder/approvals`)

**Requirements:**
- Align with `ui_src_final/screens/ActionCenter.tsx`:
  - `PageHead`: "Action Center", "Agent-generated fixes awaiting human action — the agent never applies changes on its own"
  - 2-Column layout (`grid g32`):
    - Left column: Clean proposal cards (`.appr`) with severity dot, action title, detail text, CLI block with copy button, and Apply / Reject buttons.
    - Right column: On-call Shift roster (`.shift-row` with active/upcoming status) and Live Agent Activity stream (`.feed`).

- [ ] Update or create `apps/web/src/components/responder/ApprovalsView.tsx`

---

### Task 6: Build & Live Verification

**Requirements:**
- Run `docker compose build web` to ensure complete Next.js compilation without TypeScript or bundler errors.
- Start web container: `docker compose up -d --no-deps web`.
- Curl verify HTTP 200 on `/alerts`, `/playbooks`, and `/responder/approvals`.
- Run attribution check `python scripts/check_attribution.py --all`.
- Run competitor check `python scripts/check_competitor_names.py`.

- [ ] Execute Docker build
- [ ] Restart web container
- [ ] Verify HTTP 200 on key endpoints
- [ ] Pass CI attribution & competitor gates
