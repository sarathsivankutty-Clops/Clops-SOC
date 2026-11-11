# SOC Console UI/UX Audit and Migration Roadmap

**Scope:** a comparative, evidence-based audit of two front-ends — a reference SRE
console, referred to throughout as *the reference console*, and the AiSOC console
(`apps/web`) — with a presentation-only migration strategy.

**Status:** analysis. No application code was modified to produce this document.

**Evidence rule:** every claim below cites a file and a line, or a reproducible
measurement. Where something could not be established from the tree it is marked
**Not verified from source.** Design intent is never inferred; where a file states a
reason, that reason is quoted.

---

## 0. Method

Two repositories were read directly. Measurements were taken with `Select-String`
and file line counts over the working tree, excluding `node_modules`, `.next`,
`dist`, and `build`. The exact commands are in [Appendix A](#appendix-a--measurement-commands)
so any number here can be re-derived.

**Reference UI:**
`ui_src_final/src` — 36 files, 16 screens, 4 shared component files, one stylesheet.

**Subject UI (AiSOC):** `apps/web/src` — 87 route files (`page.tsx`), 8 workspaces,
~36 declared workspace tabs, and 74 distinct tab surfaces in total.

Four structural facts frame everything that follows, and all are measurable rather
than aesthetic:

| | Reference console | AiSOC |
| --- | --- | --- |
| Shared stylesheet | 1 file, 1,121 lines (`src/styles/app.css`) | `globals.css` 412 lines **+** `tailwind.config.ts` 204 lines **+** 2,600+ inline utility strings |
| Navigation model | 7 flat items, 1 level (`Shell.tsx` L18–26) | 8 workspaces → 4 sections → ~36 route tabs → up to 15 in-page tabs |
| In-page tab bars in authenticated screens | **0** | **74 tab surfaces** |
| Component primitives actually consumed | `card`, `pane`, `tbl`, `badge`, `btn`, `fchip`, `chip`, `metrics` — used everywhere | `EmptyState` in 40 production files, `ErrorState` 27, `Skeleton` 22, `AiSpinner` 11; `Card`/`Button`/`Badge`/`StatusPill` in 0 production files |

The rest of this document explains, with citations, why those rows produce the
difference in perceived clarity.

---

## 1. Executive summary

The reference console feels cleaner for four reasons that are structural, not
cosmetic.

**1. One stylesheet, one vocabulary.** Every visual decision in the reference console is a
named class in `app.css` (1,121 lines). Components are written as
`className="card pad0"`, `className="tbl"`, `className="badge t2"` — a closed set.
AiSOC writes presentation inline: 792 arbitrary `text-[Npx]` sizes, 76 arbitrary
`rounded-[Npx]` radii, 532 raw `<button>` elements, 1,421 `gray-*` + 465 `zinc-*` +
408 `slate-*` + 330 `text-white` occurrences, and 402 literal hex colours inside
`.tsx`/`.ts` files. There is no closed set, so no two screens agree on what a card or
a button looks like.

**2. The token layer is broken in AiSOC.** `tailwind.config.ts` L29–45 maps
`brand.*` to `var(--brand-*)` and `ai.*` to `var(--ai-accent)`. Those variables are
**never defined anywhere in the repository** — a repo-wide search for
`--brand-500:`, `--brand-400:`, `--ai-accent:` returns zero hits. Meanwhile the
console uses 600 `brand-*` classes. Every one of them resolves to an invalid
`var()`, which browsers treat as an unset value: `bg-brand-500` paints nothing,
`text-brand-400` inherits. The same failure affects 469 further classes
(`surface-elevated` 221, `surface-sunken` 132, `surface-border-strong` 116) that
reference keys absent from the `surface` ramp in `tailwind.config.ts` L49–57. The
UI is therefore *visually inconsistent by construction*: some elements are styled,
and the elements meant to carry hierarchy and brand are silently invisible.

**3. AiSOC nests navigation three levels deep; the reference console nests zero.** AiSOC
stacks workspace tabs (`WorkspaceTabBar`, ~36) on top of in-page tab arrays
(`SettingsView` 15, `PlaybooksView` 7, `AlertsView` 6, `CaseWorkspace` 6,
`DetectionsView` 4). The reference console has exactly one tab bar in the whole
application, on the sign-in screen (`Auth.tsx` L197), where a two-way
sign-in/sign-up toggle is genuinely appropriate. Detail pages in the reference console are a
single scroll with a two-column `detail-grid` (`app.css` L400), not six tabs.

**4. Density is governed in one place, and only one place.** `app.css` L237–254
defines a KPI strip as a single framed grid with 1px gaps as dividers, collapsing
from 5 to 2 columns at one breakpoint (L245–246). AiSOC expresses the same idea
five different ways across `DashboardView`, `AlertsView`, `SOCMetricsDashboard`,
`DetectionsView`, and `QueueView`, each with its own padding, gap, and type sizes.

None of this is a criticism of ambition. AiSOC's surface area is roughly ten times
the reference console's, and the extra capability is real. The problem is that the
extra capability was added without a shared presentation contract, so each screen
re-invented the contract.

---

## 2. Deliverable 1 — Reverse-engineered reference design system

### 2.1 Token layer

All tokens live in `src/styles/app.css` in three blocks:

- **L21–42** `:root, [data-theme="light"]` — light colour tokens.
- **L44–56** `[data-theme="dark"]` — dark colour tokens. Every colour token is
  redefined here; nothing falls through.
- **L57–64** `:root` — non-colour tokens: font stacks, radii, the primary gradient,
  and the sidebar width.

Theming is a single attribute flip on `<html>`; no component branches on theme.

**Colour tokens (light → dark):**

| Token | Light (L21–42) | Dark (L44–56) | Role |
| --- | --- | --- | --- |
| `--bg` | `#F8FAFC` | `#0B1220` | page background |
| `--bg2` | `#FFFFFF` | `#111B2E` | secondary page surface |
| `--surf` | `#FFFFFF` | `#111B2E` | card / pane surface |
| `--surf2` | `#F8FAFC` | `#172442` | hover surface |
| `--surf3` | `#F1F5F9` | `#1C2840` | skeleton / inset surface |
| `--bd` | `#E2E8F0` | `#2A3A55` | default border |
| `--bd2` | `#CBD5E1` | `#36496A` | emphasised border (hover) |
| `--line` | `#EEF2F7` | `#223150` | table row divider |
| `--t` | `#0F172A` | `#F1F5F9` | primary text |
| `--t2` | `#475569` | `#94A3B8` | secondary text |
| `--m` | `#64748B` | `#94A3B8` | muted text |
| `--m2` | `#94A3B8` | `#64748B` | faintest text |
| `--ac` | `#2563EB` | `#3B82F6` | accent / link / active |
| `--ac2` | `#1D4ED8` | `#60A5FA` | accent hover |
| `--ac-bg` | `#EFF6FF` | `rgba(59,130,246,.15)` | accent tint |
| `--nav-active-bg` | `#EFF6FF` | `rgba(59,130,246,.12)` | active nav row |
| `--nav-active-bar` | `#10B981` | `#52B788` | active nav marker |
| `--g` | `#059669` | `#52B788` | success |
| `--am` | `#D97706` | `#FBBF24` | warning |
| `--r` | `#E11D48` | `#FB7185` | danger |
| `--p` | `#7C3AED` | `#A78BFA` | purple, used only by `.badge.pro` |
| `--pill-g/-am/-r/-ac/-tl/-p/-na` | solid soft tints (`#ECFDF5`…) | `rgba(…,.12)` | badge backgrounds |
| `--dot-g/-am/-r/-ac/-na` | `#10B981` / `#FBBF24` / `#FB7185` / `#60A5FA` / `#94A3B8` | same | badge dots |
| `--aws` / `--azure` / `--gcp` | `#FF9900` / `#0078D4` / `#4285F4` | same | cloud brand marks |

**Non-colour tokens (L57–64):** `--font`, `--display`, `--mono`,
`--radius:1.25rem`, `--radius-sm:0.75rem`, `--radius-lg:1.25rem`,
`--radius-pill:9999px`, `--btn-grad:linear-gradient(135deg,#2563EB,#22C55E)`,
`--sidebar-w:256px`.

Three properties are worth naming because AiSOC lacks all three:

1. **The semantic palette is closed.** Four status hues (`--g`, `--am`, `--r`,
   `--ac`) plus one purple. There is no `--blue-300`, no `--rose-700`. A developer
   who wants "red" uses `--r`; there is no second red to reach for. The three cloud
   accents (`--aws`, `--azure`, `--gcp`) exist solely to colour vendor marks, and
   nothing else in the UI uses them.
2. **Radius has three values.** `1.25rem` for containers, `0.75rem` for small
   controls, `9999px` for pills. There is no 6px, no 8px, no 10px, no 12px. AiSOC
   has 76 arbitrary radii.
3. **Elevation is three shadows.** `--shadow`, `--shadow-md`, `--shadow-lg`
   (L35–37 light, L52–54 dark). Everything else uses a 1px border. Cards are
   bordered, not floating.

### 2.2 Shell

`app.css` L81–193 defines the shell. `Shell.tsx` L60–137 renders it.

- Sidebar: fixed `256px` (`.sidebar`, L86), collapses to an icon rail via the
  `#app.collapsed` selector driven by a single `collapsed` state (`Shell.tsx` L32,
  L61).
- Nav: a flat `<nav className="nav">` with a single group label "Navigation"
  (`Shell.tsx` L69–70). Seven `NavLink`s. No sub-items, no flyouts, no accordions.
- Sidebar footer: `.sidebar-foot` (L109) holds the user card and a sign-out control.
- Topbar: `.topbar` (L143), `min-height: 60px`, `padding: 8px 20px`. Left slot holds
  a collapse toggle and a plain-string breadcrumb; right slot (`.topbar-right`, L163)
  holds the remaining controls. `Shell.tsx` takes `crumb` as a **string prop** —
  there is no breadcrumb component, no route introspection, no trail. A screen passes
  `crumb="Incidents"` and the topbar renders text.
- Content: `max-width: 1320px`, `padding: 28px 32px 64px`.

The consequence: the topbar has two clusters and a string. AiSOC's `TopBar.tsx`
(232 lines) renders ten controls — sidebar collapse (`L102`), command-palette search
(`L124`), time window (`L156`), tenant switcher (`L160`), role badge (`L164`),
pipeline-health indicator (`L167`), AI Copilot (`L175`), theme toggle (`L185`),
notifications (`L187`), and avatar (`L214`) — plus a conditional org logo (`L221`).
The right cluster holds eight of them with no further grouping, and three
(`TenantSwitcher`, `RoleBadge`, pipeline health) are hidden at different breakpoints,
so the bar's contents differ by screen width.

### 2.3 Layout primitives

| Class | Lines | Definition |
| --- | --- | --- |
| `.card` | L227–234 | `background: var(--surf); border: 1px solid var(--bd); border-radius: var(--radius)` |
| `.card.pad0` | L229 | removes padding for tables |
| `.card-head` / `.card-title` / `.card-link` | L230–233 | 12px/600 title, accent link |
| `.metrics` | L237–254 | `display:grid; gap:1px; background:var(--bd); border:1px solid var(--bd)` |
| `.metrics.c5/.c4/.c3` | L239–240 | column counts |
| `.metrics .kpi` | L242 | `padding:18px 20px; border-radius:0` — the 1px gap *is* the divider |
| responsive collapse | L245–246 | all variants → 2 columns; an odd last KPI spans the row |
| `.pane` | L564–576 | second container primitive; `.pane-head` + `.pane-head.bordered` |
| `.detail-grid` | L400–402 | `grid-template-columns: 1fr 340px`, collapses at 1180px |
| `.workspace` | L486–488 | three-column `300px 1fr 320px`, degrades to `1fr 320px` at 1280px, `1fr` at 980px |
| `.split` / `.split-wide` | L574–576 | `1.6fr 1fr` and `1fr 1fr`, both collapse at 1100px |
| `.grid` | L219 | `display:grid; gap:14px` — the generic two/four-column container |
| overflow guards | L611–625 | `overflow-x:hidden` on the shell; `min-width:0` on every grid child and on `.card`/`.pane`/`.kpi` |

The `.metrics` trick at L237 deserves attention. Five KPI cards are rendered as one
bordered panel whose *background* is the border colour and whose *gap* is 1px. The
gaps read as dividers. This produces a single visual object instead of five floating
cards, which is the single largest contributor to the reference console's calm
dashboard.

The overflow guards at L611–625 are the reason the reference console does not
produce horizontal scrollbars on narrow windows: `overflow-x:hidden` is set on
`html, body`, `#app`, `.main` and `.content`; every grid child is forced to
`min-width: 0`; and `.card`/`.pane`/`.kpi` are capped at `max-width: 100%`.

### 2.4 Typography

The scale is small and closed:

| Element | Size / weight | Line |
| --- | --- | --- |
| base body | `13px / 1.5` | `body`, L69 |
| page title | `22px / 700` | `.page-title` L198 |
| KPI value | `28px / 700` | `.kpi-v` L250 |
| card title | `12px / 600` | `.card-title` L231 |
| pane heading | `16px / 600` | `.pane-head h3` L568 |
| table head | `10.5px / 700`, uppercase, `letter-spacing: .4px` | `.tbl th` L380 |
| table cell | `13px 16px` | `.tbl td` L382 |
| button | `12.5px / 600` | `.btn` L204 |
| badge | `11px / 500` | `.badge` L263 |

Eight distinct sizes across nine roles (the table cell reuses the 13px body size).

Eight distinct sizes. No 11.5, no 14, no 15, no 17. AiSOC's arbitrary sizes alone
span 792 usages.

### 2.5 Colour usage discipline

Status is expressed with exactly one pattern: `.badge` (L263–279).

```css
.badge { font-size:11px; font-weight:500; padding:3px 10px;
         border-radius:var(--radius-pill); }
.badge::before { content:''; width:6px; height:6px; border-radius:50%;
                 background:var(--dot-na); }
.badge.t1 { background:var(--pill-g); color:var(--g); }
```

A pill, a 6px dot, a tinted background, **no border**, and a text colour from the
same hue as the tint. The light theme uses solid soft tints (`--pill-g: #ECFDF5`);
the dark theme uses 12% alpha (`rgba(82,183,136,.12)`). Thirteen class names map to
seven visual variants — green, amber, red, accent, teal, purple, neutral — because
`.badge.t1`/`.on`/`.ok` are aliases for one style, as are `.t2`/`.deg`/`.warn` and
`.t3`/`.off`/`.bad`. Because there is no border and no second background, a row of six
badges reads as a row of labels rather than a row of chips.

AiSOC's equivalent (`AlertsView.tsx` L67–71, L140–142) uses
`text-rose-400 bg-rose-500/12 border-rose-500/25` — text, tint, *and* border, each
from a different raw palette family, at 12% and 25% alpha. That is three visual
signals where the reference console uses two.

### 2.6 Tables

`.tbl` (L379–387) is `width:100%; border-collapse:collapse; table-layout:fixed`.
Fixed layout is the important detail: columns cannot be widened by content, so a
long value wraps (`overflow-wrap:anywhere; word-break:break-word`, L382) instead of
pushing the table wide. Header cells are 10.5px uppercase; body rows are
`13px 16px` with a single bottom border; `.tbl tr.click` adds a pointer cursor and a
hover surface (L384–385); `.tbl .mono` sets 11px monospace for identifiers (L386).

There is one table primitive. AiSOC renders tables in at least five distinct
in-house shapes across `DetectionsView`, `QueueView`, `MarketplaceView`,
`PlaybooksView`, and `ConnectorsView` — none of which use `packages/ui`'s
`DataTable`.

### 2.7 States: loading, empty, error

- `.skeleton` (L585–587): a shimmering block, 6px radius.
- `.empty` (L479): centred, `padding:40px`, muted.
- `.empty-state` (L595–599): an icon tile, a 17px heading, and a paragraph capped at
  `max-width:46ch`.

Two empty-state shapes for two contexts (inline table vs. full panel), both from the
same file. AiSOC's `EmptyState` is adopted in 41 files, so the primitive exists and
works; what it lacks is a single owner enforcing its use.

### 2.8 Overlays

- `.modal-back` (L713–715) with `backdrop-filter: blur(2px)`.
- `.modal` (L716–725): `max-width:460px`, `.wide` variant at 640px, structured as
  head / body / foot. The footer is a distinct surface (`--surf2`) with a top border.
- `.toast` (L740–751): `min-width:280px`, `max-width:min(440px, calc(100vw - 32px))`,
  a 3px left accent that changes with `.success`/`.error`/`.info`, a 20px icon slot,
  a 13px/600 message and an 11.5px detail line.

AiSOC has 116 `Dialog`/`Modal` references, 153 `Sheet`/`Drawer` references, and only
8 `role="dialog"` attributes — meaning most of its overlays are hand-built divs
without dialog semantics.

### 2.9 Forms and filters

- `.fld-input`, `.fld-hint`, `.auth-label` — one input style, one hint style.
- `.fchip` (L391–393): a 12px filter chip, `padding:7px 12px`, `border-radius:8px`.
- `.chip` (L463–465): a 10.5px/600 chip, `border-radius:20px`, which gains an accent
  border on hover.
- `.chip-select` (L895): a wrapping chip group for multi-select.

Two chip sizes with distinct jobs (filter vs. token). AiSOC has no chip primitive;
filters are rebuilt per screen.

### 2.10 Shared component layer

`src/components/ui.tsx` is 149 lines and exports eight components:

`KpiCard`, `MetricStrip`, `PageHead`, `FeedItem`, `EmptyState`, `LineChart`, `Donut`,
`Topology`.

`PageHead` is the page-header primitive: title, subtitle, and an actions slot. It is
used by every screen, which is why every screen has the same header rhythm. `MetricStrip`
wraps the `.metrics` grid so a screen cannot get the KPI layout wrong.

That is the entire component library. Four files, 448 lines total
(`ui.tsx` 149, `Shell.tsx` 152, `Copilot.tsx` 99, `Overlays.tsx` 48) serving 16
screens. The constraint is the design system.

---

## 3. Deliverable 2 — Primitive catalogue and verdicts

Each row states what the reference primitive does, whether AiSOC already has an
equivalent, and a verdict. "Reuse" means copy the idea as-is; "Adapt" means keep the
behaviour but re-express it against AiSOC tokens; "Replace" means AiSOC's current
approach should be retired rather than patched.

| # | Reference primitive | Source | AiSOC equivalent | Verdict | Reasoning |
| --- | --- | --- | --- | --- | --- |
| 1 | `.card` container | `app.css` L227 | `components/ui/Card.tsx` | **Reuse** | AiSOC's `Card` already exists and is correct; it is simply not imported. Adopt it, do not rewrite it. |
| 2 | `.pane` (bordered section) | L564 | none | **Adapt** | AiSOC's sections are bare `div`s. A second container primitive is needed for detail pages where a card would over-nest. |
| 3 | `.metrics` KPI strip | L237 | five bespoke strips | **Replace** | The single-panel-with-1px-gaps idea is strictly better than five floating cards. Replace all five implementations. |
| 4 | `KpiCard` | `ui.tsx` | `packages/ui/MetricCard` | **Reuse** | The prop shape (label, value, delta) already exists in `packages/ui`; the console just does not consume it. |
| 5 | `PageHead` | `ui.tsx` | none — five title sizes | **Replace** | AiSOC page titles are `text-[17px]`, `text-xl`, `text-2xl`, and `text-2xl sm:text-3xl` in four different files. One primitive removes the choice. |
| 6 | `.badge` status pill | L263 | `StatusPill.tsx` + inline variants | **Replace** | AiSOC's `StatusPill` is unused; screens inline `ring-1` + tint + border. Adopt the dot-plus-tint pattern and delete the borders. |
| 7 | `.tbl` table | L379 | `packages/ui/DataTable` + 5 hand-rolled | **Replace** | Fixed layout plus `overflow-wrap` is the fix for AiSOC's wide tables. Adopt `DataTable` and give it the reference's type scale. |
| 8 | `.empty-state` | L595 | `EmptyState.tsx`, used in 41 files | **Reuse** | AiSOC's `EmptyState` is already adopted and close. Standardise its copy and icon set. |
| 9 | `.skeleton` | L585 | `animate-pulse` divs | **Adapt** | Keep AiSOC's shimmer, but route it through one component so timing and radius are shared. |
| 10 | `.modal` | L716 | 116 `Dialog`/`Modal` refs | **Adapt** | Keep the existing dialog implementation; adopt the head/body/foot structure and the 460/640 width pair. |
| 11 | `.toast` | L740 | 87 `toast` refs | **Adapt** | AiSOC already has a toast host. Adopt the left-accent + two-line message structure. |
| 12 | `.fchip` filter chip | L391 | per-screen filter buttons | **Replace** | No filter primitive exists. One 8px-radius chip with a selected state would replace dozens of ad-hoc buttons. |
| 13 | `.chip` token chip | L463 | none | **Adapt** | Needed for the 20px-radius "selected value" chips in filters and tag inputs. |
| 14 | `.detail-grid` 1fr/340px | L400 | `CaseWorkspace` custom grid | **Reuse** | The fixed 340px rail is the right answer for a detail page with a context panel; AiSOC approximates it inconsistently. |
| 15 | `FeedItem` | `ui.tsx` | none | **Reuse** | The activity-feed row is a repeated shape in AiSOC (`InvestigationTimeline`, `InvestigationLedger`, `AlertsView` timeline) and should be one component. |
| 16 | `LineChart` / `Donut` | `ui.tsx` | `recharts` per screen | **Adapt** | Keep `recharts`; standardise axis, grid, and tooltip styling so charts stop looking like they came from different products. |
| 17 | Breadcrumb as string | `Shell.tsx` L28 | `Breadcrumbs.tsx` (route-aware) | **Reuse** (AiSOC's) | Here AiSOC is ahead: a route-derived trail is correct for 8 workspaces. Do not regress to a string. |
| 18 | Flat 7-item nav | `Shell.tsx` L18 | 8 workspaces × ~36 tabs | **Adapt** | AiSOC's breadth is real and cannot be flattened to seven items. Adapt by demoting tabs to in-page anchors rather than a third nav tier. |
| 19 | Overflow guards | L611–625 | none | **Reuse** | `min-width:0` on grid children is a one-line fix with a large effect on narrow-window behaviour. |
| 20 | Three-value radius scale | L61 | 76 arbitrary radii | **Replace** | Collapse to `rounded-xl` for containers, `rounded-lg` for small controls, `rounded-full` for pills. |

**Summary of verdicts:** 7 Reuse, 7 Adapt, 6 Replace.

---

## 4. Deliverable 3 — Why the reference console feels simpler

This section is reasoning, but every step is anchored to a measurement or a line.

### 4.1 It has fewer *kinds* of thing

A user of the reference console learns four container shapes: `card`, `pane`,
`metrics`, `detail-grid`. Once learned, every screen is legible. A user of AiSOC
learns a container shape per screen, because there are 22 card surfaces in
`CaseWorkspace.tsx` alone and 29 in `SettingsView.tsx`, each with local padding.

This is the mechanism behind the impression of clutter. Clutter is not density; it
is the *cost of re-parsing*. A dense screen built from three primitives is parsed
once. A sparse screen built from nine one-off layouts is parsed every time.

### 4.2 It has one navigation depth

The reference console's deepest route is `/investigations/:id` — two segments.
AiSOC's deepest is a workspace tab, then an in-page tab, then a drawer inside that
tab. Each level costs the user a decision about where they are, and the console
provides no persistent indicator of which of the 74 tab surfaces is currently open.

The reference console's breadcrumb is a string in the topbar (`Shell.tsx` L28), which
is enough at one level of depth. AiSOC has a real `Breadcrumbs.tsx`, which is the
correct response to eight workspaces — but the breadcrumb only describes the route,
not the in-page tab, so the tab layer is invisible to it.

### 4.3 Hierarchy is carried by one signal at a time

In the reference console, hierarchy is carried by *position and one border*. A card
is a bordered rectangle. A KPI strip is one bordered rectangle divided by hairlines.
A badge is a tint with no border. A button is either ghost, bordered, or the single
gradient primary.

In AiSOC, hierarchy is carried by border *and* tint *and* shadow *and* gradient
simultaneously. `AlertsView.tsx` L140–142 alone layers `text-*`, `bg-*/10`, and
`border-*` on a single badge. When every element carries three signals, no element
stands out, and the eye has no entry point.

### 4.4 Primary emphasis is one style, defined once

`app.css` L208 defines `.btn.primary` with `var(--btn-grad)` and a
`box-shadow: 0 2px 8px rgba(37,99,235,.25)`. It is the only gradient in the
authenticated UI, and every "do this" button in the product is that one class.

The count is not one per screen — the measured distribution is 0 on the list and
detail screens (`Incidents`, `IncidentDetail`, `ActionCenter`, `Analytics`,
`Runbooks`), 1 on the dashboard (`Overview`), and 2–8 on the form and wizard screens
(`Settings` 2, `ConfigureWebhook` 3, `RegisterMcpServer` 4, `Connectors` 8), where
each step or each table header legitimately carries one. The property that matters is
that there is **one style**, so emphasis is a product decision rather than a
per-screen choice.

AiSOC has no equivalent single style. `PlaybooksView.tsx` presents three header CTAs
and `DashboardView.tsx` presents a hero banner with its own CTA alongside four KPI
cards; because each screen invents its own emphasis treatment, "primary" does not
carry a consistent meaning across the product.

### 4.5 Type does not compete

Nine sizes, all in one file. A KPI value is 28px/700 and nothing else is 28px. A
card title is 12px/600 and nothing else is 12px/600. AiSOC's 792 arbitrary sizes
mean a 13px label can appear next to a 13.5px label next to a 12.5px label, which
the eye reads as misalignment even when it cannot name the cause.

### 4.6 Density is a system property, not a per-screen choice

`.metrics .kpi` fixes padding at `18px 20px` and radius at `0` (L242). `.tbl td`
fixes padding at `13px 16px` (L382). Because density is declared once, a list screen
and a dashboard screen feel like the same product at the same zoom. AiSOC's density
varies per screen, so switching workspaces feels like switching applications.

### 4.7 Failure is graceful by default

`min-width: 0` on every grid child (L617–625) plus `table-layout: fixed` (L379) plus
`overflow-wrap: anywhere` (L382) means long identifiers wrap instead of breaking
layout. AiSOC relies on `overflow-x-auto` in 49 places, which trades broken layout
for horizontal scrolling — a visible symptom of missing structural guards.

### 4.8 The honest counter-argument

AiSOC is not simply "worse". It has 87 routes against 16 screens, a real breadcrumb
system, a command palette, a persisted theme provider, density preferences
(`SettingsView.tsx` L100–101), and a demo-data gate (`canUseDemoData`,
`SettingsView.tsx` L59) that the reference console lacks. The reference console's
clarity is partly a function of doing less.

The migration target is therefore **not** "become the reference console". It is
"keep AiSOC's capability and adopt the reference console's presentation contract."

---

## 5. Deliverable 4 — AiSOC clutter audit

### 5.1 Token layer: 1,070 class usages that render nothing

| Class family | Usages | Defined? | Effect |
| --- | --- | --- | --- |
| `brand-50…900` | **600** | No `--brand-*` anywhere | `bg-brand-500` → transparent; `text-brand-400` → inherited |
| `surface-elevated` | **221** | Not in `surface` ramp (`tailwind.config.ts` L49–57) | no background |
| `surface-sunken` | **132** | Not in ramp | no background |
| `surface-border-strong` | **116** | Not in ramp | no border |
| `ai-accent` | **1** | No `--ai-accent` anywhere | no colour |

`tailwind.config.ts` L26–28 states the intent: "Primary brand — used for CTAs,
links, and active state. Aligned with the logo gradient." L41–45 states the AI accent
intent. Neither intent is realised, because the CSS variables the config points at
were never added to `globals.css` (which defines only `--surface-*` at L32–54 and
`--fg-*` at L57–61, in both themes).

The visible consequence is concentrated in exactly the places hierarchy matters most.
`SettingsView.tsx` L431 styles the active primary tab as
`border-brand-500 text-brand-400 font-semibold`, while the inactive state uses
`border-transparent text-fg-muted`. Both colour classes are dead, so both states
resolve to a transparent border. The only surviving difference between the active and
inactive primary tab is `font-semibold` versus `font-medium`. The same screen at L456
uses `border-brand-500/40 bg-brand-500/15 text-brand-400` for the active secondary
pill against `border-surface-border bg-surface-card text-fg-muted` for the inactive
one — all three active-state classes are dead, leaving the active pill
indistinguishable from the inactive one.

**This is the single highest-leverage fix in the audit.** It is a CSS-variable
addition, not a redesign.

The defect is visible in the chrome as well as in Settings. `TopBar.tsx` L178 styles
the AI Copilot button with `border-violet-500/35 bg-violet-500/10 text-violet-400` —
a raw palette where the `ai` token (`tailwind.config.ts` L42–45) was designed for
exactly this. L215 styles the user avatar with
`bg-gradient-to-br from-brand-500 to-violet-500`, so half the gradient is undefined
and the avatar renders as a violet-to-violet circle. L171 uses
`shadow-[0_0_0_3px_rgba(16,185,129,0.16)]`, an arbitrary shadow where a `status.live`
token exists.

### 5.2 Typography sprawl

- **792** arbitrary `text-[Npx]` utilities.
- Six distinct page-title treatments across six console screens:

| Screen | Class | Line |
| --- | --- | --- |
| Settings | `text-[17px] font-semibold tracking-[-0.015em]` | `SettingsView.tsx` L408 |
| Connectors | `text-xl font-semibold` | `ConnectorsView.tsx` L207 |
| Queue | `text-xl font-semibold text-gray-100` | `QueueView.tsx` L738 |
| Detections | `text-2xl font-semibold text-fg-primary` | `DetectionsView.tsx` L393 |
| Marketplace | `text-2xl font-bold text-zinc-100` | `MarketplaceView.tsx` L985 |
| Threat Hunt | `text-2xl font-semibold tracking-tight text-white sm:text-3xl` | `HuntView.tsx` L272 |

Six treatments spanning four sizes (17px, `xl`, `2xl`, `3xl`), four colour sources
(`fg-primary`, `gray-100`, `zinc-100`, `white`), and two weights. There is no
page-title primitive.

### 5.3 Colour sprawl

Raw palette utilities across console files, by family:

`gray` 1,421 · `zinc` 465 · `slate` 408 · `text-white` 330 · plus `red`, `amber`,
`emerald`, `blue`, `orange`, `indigo`, `rose`, `yellow`, `green`, `violet`,
`purple`, `sky`, `teal` — **16 hue families**, roughly 2,600 raw utility occurrences.

Additionally, **402 literal hex colours** appear inside `.tsx`/`.ts` files across 49
files, bypassing both Tailwind and the CSS-variable layer. The largest concentrations
are `stepSchemas.ts` (54), `theme.ts` (45), `ReplayPlayer.tsx` (34),
`AttackGraphView.tsx` (22) and `RealtimeGraph.tsx` (21). A sample from
`EffectivePermissionsView.tsx` L427–472 shows the character of them:
`'background-color': '#1f2937'`, `color: '#e5e7eb'`, `'border-color': '#374151'`,
`style: { 'background-color': '#0b3a8c' }` — these are UI surface colours, not vendor
marks, and they do not follow the theme.

The reference console's 51 hex occurrences are almost entirely a different kind of
value: third-party brand marks inside SVG paths (`icons.ts` — GitLab, Slack,
Prometheus; `Auth.tsx` L15–18 — Google; `IncidentDetail.tsx` L15–16 — Jira), one
chart-series map (`ui.tsx` L7), and two avatar gradients (`Shell.tsx` L95–96). Roughly
two are actual UI colours. In other words, the reference console uses hex where hex is
unavoidable; AiSOC uses it where a token already exists.

This is not only inconsistency; it is a theme-safety defect. `globals.css` L6–8
documents the intent that `bg-surface-card` and `text-fg-primary` follow
`data-theme="light"`. A `text-zinc-100` does not. `MarketplaceView.tsx` L985 and
`QueueView.tsx` L738 will render near-white text on a white background in light
theme.

### 5.4 Four visual languages in one product

| Shell | File | Language |
| --- | --- | --- |
| Console | `components/layout/AppShell.tsx` | `surface-*` / `fg-*` tokens |
| Responder | `app/(responder)/layout.tsx` | hardcoded `zinc-*` |
| Tools | `app/(tools)/layout.tsx` | inline hex `#0b1020` |
| Marketing | `app/(marketing)/layout.tsx` | VelvetEdge jewel-tone (`tailwind.config.ts` L109–132) |

The marketing language is documented as deliberately separate (`tailwind.config.ts`
L96–100). The other three are not; they are drift. A user moving from the console to
the responder view changes product identity.

### 5.5 Navigation depth: 74 tab surfaces

| Level | Mechanism | Count | Source |
| --- | --- | --- | --- |
| 1 | Workspace (sidebar) | 8 | `config/navigation.ts` L175+ |
| 2 | Route destinations rendered as a tab bar | 36 total, 2–9 per workspace | `navigation.ts` `tabs` arrays |
| 3 | In-page tabs | 38 | see below |

The sidebar also prints four section labels (`Operations`, `Investigation`,
`Engineering & Response`, `Platform` — `navigation.ts` L26–31) above groups of
workspaces. These are headings rather than navigation steps, so they are not counted
as a level, but they do add visual structure to an already long column.

In-page tab arrays:

| Screen | Tabs | Source |
| --- | --- | --- |
| `SettingsView` | 15 (7 horizontal + 8 pill chips) | L64–79, L386–402 |
| `PlaybooksView` | 7 | L60 |
| `AlertsView` | 6 | L29 |
| `CaseWorkspace` | 6 | L50–60 |
| `DetectionsView` | 4 | L146–172 |

`SettingsView.tsx` is the clearest example of the failure mode. It renders **two
different tab visual languages on one screen**: a 13px underlined horizontal bar
(L419–439) and an 11.5px pill row under the label "Platform & Governance:"
(L442–464). Both are `button` elements in the same `nav`. A user cannot tell whether
the pill row is a filter, a second navigation, or a status legend.

The deeper problem is that the same word names two different mechanisms. The
`tabs` arrays in `navigation.ts` are **routes**: the Settings workspace's nine
"tabs" are `/settings`, `/connectors`, `/marketplace`, `/settings/users`,
`/access-review`, `/audit`, `/evaluate`, `/costs`, `/mssp` (L432–475). The
`TABS` arrays inside screens are **local state**: `SettingsView`'s fifteen sections
all live under the single route `/settings`.

So the Settings workspace is split across nine routes and fifteen local tabs, with no
rule saying which concept belongs to which layer. A user who wants to change retention
must know that it is a local tab of `/settings` rather than a route; a user who wants
to review access must know that `/access-review` is a route rather than a local tab.

Detections shows the same ambiguity with an actual collision. `navigation.ts`
L355–390 declares `ATT&CK Coverage` as the route `/coverage-advisor` and
`Noise & Tuning` as the route `/noise-tuning`; `DetectionsView` at `/detection`
declares its own `Coverage` and `Drift` tabs (L146–172) covering the same ground.
Two entry points, two implementations, and no indication which is authoritative.

### 5.6 Selective component adoption

`apps/web/src/components/ui/` contains five primitives. Their adoption is split
almost perfectly in two:

| Primitive | Production imports | Files |
| --- | --- | --- |
| `EmptyState` | **41** | `AlertsView`, `DashboardView`, `SettingsView`, `QueueView`, `HuntView`, `MarketplaceView`, `DetectionsView`, and 34 more |
| `Card` | **0** | only `test/storybook-snapshots.test.tsx` |
| `Button` | **0** | only the test |
| `Badge` | **0** | only the test |
| `StatusPill` | **0** | only the test |

This is the most useful fact in the audit, because it disproves the easy explanation.
The primitives are not unused because the team cannot use them, or because the
component API is wrong — `EmptyState` was adopted in 41 files and works. The other
four were not adopted, and the console instead contains:

- **532** raw `<button>` elements against 0 `Button` imports
- **116** `Dialog`/`Modal` references, **153** `Sheet`/`Drawer` references, and only
  **8** `role="dialog"` attributes
- **63** `motion.div` elements across **35** `framer-motion` imports

So the migration risk is not "will anyone adopt a primitive". It is "will the four
existing primitives be adopted at the same rate `EmptyState` was". That is a
sequencing and review-discipline problem, not a design problem, and it is why Phase 0
(repairing the token layer, which every primitive depends on) precedes adoption.

### 5.7 Density and file size as a proxy for local re-invention

| File | Lines | Locally-defined surfaces |
| --- | --- | --- |
| `settings/SettingsView.tsx` | 2,731 | 29 bordered panels |
| `cases/CaseWorkspace.tsx` | 2,181 | 22 bordered panels |
| `connectors/AddConnectorModal.tsx` | 1,719 | — |
| `hunt/HuntView.tsx` | 1,353 | — |
| `marketplace/MarketplaceView.tsx` | 1,315 | — |
| `detections/RuleEditor.tsx` | 1,276 | — |
| `alerts/AlertsView.tsx` | 1,238 | 98 `div`s |

For comparison, the reference console's largest screen is `Connectors.tsx` at 1,131
lines, and its *entire* shared component layer is 448 lines.

### 5.8 Motion without a spec

63 `motion.div` and 112 `animate-` occurrences, but no shared duration, easing, or
reduced-motion contract. `SettingsView.tsx` L471–476 uses
`initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
transition={{duration:0.18}}`. Other screens use different values. The reference
console has no motion library; it uses CSS `transition` at `.14s` and `.12s` on
hover only (`app.css` L242, L384), and one `@keyframes` shimmer for skeletons (L586).

### 5.9 Light-theme breakage as a class

Because 2,600+ utilities and 402 hex values bypass the token layer, light theme
(`globals.css` L79–101) is only partially functional. This is a single defect class
with a single fix: route every colour through tokens.

---

## 6. Deliverable 5 — Side-by-side comparison

Facts only. No recommendations in this section.

| Dimension | Reference console | AiSOC |
| --- | --- | --- |
| Source files | 36 in `src/` | 288 in `components/`, 483 in `src/` |
| Routes / screens | 16 screens | 87 `page.tsx` |
| Stylesheet | 1 file, 1,121 lines | `globals.css` 412 + `tailwind.config.ts` 204 + inline utilities |
| Token definitions | 2 theme blocks, ~40 colour tokens + 9 scale tokens | `--surface-*` 7 + `--fg-*` 5; `--brand-*` 0; `--ai-accent` 0 |
| Nav items, level 1 | 7 | 8 workspaces + 4 sections |
| Nav levels | 1 (2 route segments) | 3 |
| Route tabs | 0 | ~36 |
| In-page tab bars | 0 (Auth only) | 38 across 5 screens |
| Shared components | 8 in `ui.tsx` + Shell/Copilot/Overlays = 12 | `EmptyState` in 41 files; 4 other primitives in 0 production files |
| Container primitives | 4 (`card`, `pane`, `metrics`, `detail-grid`) | per-screen |
| Radius values | 3 | 76 arbitrary |
| Font sizes | 9 | 792 arbitrary |
| Palette families | 5 (`ac`, `g`, `am`, `r`, `p`) | 16 |
| Literal hex in components | 51 (mostly vendor SVG marks) | 402 (mostly UI surfaces) |
| Primary buttons per screen | 1 style; 0–1 on list/detail, 2–8 on forms | no single style; 1–3 competing CTAs |
| Badge pattern | dot + tint, no border | text + tint + border |
| Table primitive | 1 | 5+ |
| Dialog semantics | `role="dialog"` on the modal host | 8 across 116+153 overlay refs |
| Motion | CSS hover transitions + 1 shimmer | 63 `motion.div`, 112 `animate-` |
| Overflow strategy | `min-width:0` guards + fixed table layout | 49 `overflow-x-auto` |
| Breadcrumb | string prop | route-aware component (more capable) |
| Theme switching | 1 attribute flip, fully tokenised | `ThemeProvider`, partially tokenised |
| Largest file | 1,131 lines | 2,731 lines |

---

## 7. Deliverable 6 — Migration strategy

Presentation only. No business logic, data fetching, state management, API
contracts, or route paths change.

### 7.1 Guiding constraints

1. **No route changes.** 87 routes stay. The sidebar keeps 8 workspaces.
2. **No data changes.** Components keep their props, hooks, and API calls.
3. **No big-bang rewrite.** Every step is independently shippable and reversible.
4. **The token layer is fixed first**, because every later step depends on
   `brand-*` and `surface-*` resolving. Fixing tokens retroactively restyles ~1,070
   class usages without touching a component.
5. **Deletion is a migration tool.** Every inline style replaced by a primitive is
   a net line reduction.

### 7.2 Phase plan

#### Phase 0 — Repair the token layer (no visual redesign)

| Action | Detail |
| --- | --- |
| Define `--brand-*` | Add `--brand-50…900` to both theme blocks in `globals.css`. Values: a blue ramp matching the logo gradient named in `tailwind.config.ts` L27. |
| Define `--ai-accent` | Add `--ai-accent` and `--ai-accent-soft`. |
| Extend `surface` ramp | Add `elevated`, `sunken`, `border-strong` to `tailwind.config.ts` L49–57, backed by variables in both themes. |
| Add a guard | A script that fails CI if a `tailwind.config.ts` colour key has no corresponding `--var` definition. |

**Effect:** 1,070 dead class usages become live. Active tabs become visible. Light
theme becomes viable. Zero component edits.

**Risk:** low. **Reversible:** yes, delete the variable block.

#### Phase 1 — Consolidate the type scale

Introduce one `PageHead` primitive (title, subtitle, actions) modelled on
`ui.tsx`'s. Replace the six page-title treatments listed in §5.2. Then replace
arbitrary `text-[Npx]` with a named scale of eight steps.

**Order:** page titles first (6 files), then body text, then badges.
**Risk:** low. **Reversible:** per-file.

#### Phase 2 — Collapse colour to semantic tokens

Introduce semantic utilities (`text-danger`, `bg-danger/10`, `border-danger/25`)
backed by `--severity-*` (already in `tailwind.config.ts` L72–78) and remove raw
palette families screen by screen. Replace 402 literal hexes with tokens.

**Order:** by hue family, largest first (`gray` 1,421 → `zinc` 465 → `slate` 408).
**Risk:** medium — requires visual review per screen. **Reversible:** per-file.

#### Phase 3 — Adopt the container primitives

Adopt `Card` for every card surface; add a `Pane` for bordered sections; replace the
five KPI strips with one `MetricStrip` built on the `.metrics` pattern (1px gaps,
`border-radius: 0`, 5→2 responsive collapse).

**Risk:** low–medium. **Reversible:** per-screen.

#### Phase 4 — Demote the tab layer

This is the highest-impact structural change and the one with the most product
judgement in it.

Rule: **a tab is a filter, not a destination.** If switching tabs changes the data
query, it is a filter and stays a tab. If switching tabs shows a different *view of
the same object*, it becomes a section on one scroll, addressed by anchor.

Applied:

- `SettingsView` 15 tabs → one scroll with a sticky section rail (the 7 primary
  sections), the 8 governance panels as anchored sections below. Removes the
  dual-language tab bar at L419–464.
- `CaseWorkspace` 6 tabs → one scroll with a `detail-grid` (1fr / 340px), the rail
  holding case metadata and the main column holding overview → investigation →
  attack path → ledger → report.
- `DetectionsView` 4 tabs → 1 list + 3 anchored panels.
- `PlaybooksView` 7 tabs → 2 (Library, Runs); the five content types become filters.
- `AlertsView` 6 detail tabs → 1 scroll, `detail-grid`.

**Risk:** medium — each screen needs a product decision about which tabs are filters.
**Reversible:** per-screen.

#### Phase 5 — Separate routes from sections

Decide one rule and apply it everywhere: **a route is a destination, a tab is a
filter.** Today `navigation.ts`'s `tabs` arrays are routes and each screen's local
`TABS` arrays are sections, both called "tabs", with no rule about which concept
belongs to which layer (§5.5). Apply the rule by either promoting every section to a
route or demoting every route-level tab to an anchor, per workspace.

**Risk:** low. **Reversible:** yes.

#### Phase 6 — Unify overlays and states

Route every overlay through one `Dialog` and one `Sheet`, both with `role="dialog"`
and a focus trap. Route every empty, loading, and error state through
`EmptyState` / `Skeleton` / `ErrorState`.

**Risk:** medium. **Reversible:** per-screen.

#### Phase 7 — Converge the four shells

Bring `ResponderShell` and the `(tools)` layout onto the same token layer as the
console. Keep `(marketing)` separate, as documented.

**Risk:** low–medium. **Reversible:** per-shell.

#### Phase 8 — Motion contract

One duration scale (120 / 180 / 240ms), one easing, `prefers-reduced-motion`
respected globally. Replace 63 ad-hoc `motion.div` transitions.

**Risk:** low. **Reversible:** yes.

### 7.3 Sequencing rationale

Phase 0 first because it is the only phase that improves every screen without a
component edit, and because Phases 1–8 all assume tokens resolve. Phase 1 before
Phase 2 because type is a smaller surface than colour and establishes the primitive
pattern. Phase 3 before Phase 4 because tabs cannot be demoted until the containers
they land in exist. Phase 5 last among structural work because it depends on the
Phase 4 decisions.

---

## 8. Deliverable 7 — Screen-by-screen migration plan

Columns: **Current** (file, size, structure) · **Problems** (measured) ·
**Equivalent** (reference pattern) · **Strategy** · **Risk** · **Complexity** ·
**Deps** · **Priority**.

Priority is P0 (blocks others) / P1 (highest user-visible gain) / P2 / P3.

### 8.1 Shell and chrome

#### Sidebar
- **Current:** `layout/Sidebar.tsx`, 515 lines. 8 workspaces, 4 sections, collapsible 15rem→4rem (`L357`), footer workspace card.
- **Problems:** 36 route links distributed across 8 workspaces (2–9 each), all inside one scrollable column; the active route is marked, but the sibling tabs of the current workspace are not visible.
- **Equivalent:** `Shell.tsx` L69–78 — flat `nav` with a group label.
- **Strategy:** keep 8 workspaces; show the active workspace's tabs as a secondary rail inside the sidebar rather than a separate `WorkspaceTabBar`.
- **Risk:** medium · **Complexity:** M · **Deps:** Phase 5 · **Priority:** P2

#### TopBar
- **Current:** `layout/TopBar.tsx`, 232 lines, ten controls plus a conditional org logo, in a `h-14` (56px) bar (`L91`).
- **Problems:** the right cluster holds eight items with no sub-grouping; three of them are hidden at different breakpoints (`md`, `xl`, `2xl`), so the bar's contents change with window width; the AI Copilot button uses raw `violet-*` utilities (`L178`) instead of the `ai` token, and the avatar gradient uses `from-brand-500` (`L215`), which is undefined.
- **Equivalent:** `app.css` L143–163 — two clusters, one left, one right.
- **Strategy:** group into three clusters (context · filters · account); move pipeline health into the sidebar footer; route the AI accent through `ai.*`.
- **Risk:** low · **Complexity:** S · **Deps:** Phase 0 · **Priority:** P1

#### WorkspaceTabBar
- **Current:** route tabs from `navigation.ts`.
- **Problems:** third navigation level; duplicates the route-level tabs with a second tab mechanism.
- **Equivalent:** none (reference has one level).
- **Strategy:** retire as a nav tier; render as in-page anchors.
- **Risk:** medium · **Complexity:** M · **Deps:** Phase 4, 5 · **Priority:** P2

#### Breadcrumbs
- **Current:** route-aware component.
- **Problems:** does not reflect in-page tabs, so it under-describes the current location.
- **Equivalent:** string prop (`Shell.tsx` L28) — AiSOC's is more capable.
- **Strategy:** keep; append the active section once Phase 4 lands.
- **Risk:** low · **Complexity:** S · **Deps:** Phase 4 · **Priority:** P3

### 8.2 Operations

#### DashboardView
- **Current:** `dashboard/DashboardView.tsx`, 699 lines. Hero banner + 4 KPI cards + 2×(2fr/1fr) grid + collapsed deep-telemetry drawer.
- **Problems:** hero banner competes with KPIs; four floating KPI cards instead of one strip; a drawer as a third layout tier.
- **Equivalent:** `screens/Overview.tsx` (135 lines): 5 KPIs → severity strip → chart → open-incident list.
- **Strategy:** drop the hero to a `PageHead`; convert the 4 KPIs to a `MetricStrip`; inline the drawer.
- **Risk:** low · **Complexity:** M · **Deps:** Phase 3 · **Priority:** P1

#### SOCMetricsDashboard / SLADashboard / TeamAnalyticsView
- **Current:** `dashboard/SOCMetricsDashboard.tsx` 653 lines, `sla/SLADashboard.tsx` 714 lines, `analytics/TeamAnalyticsView.tsx` 304 lines.
- **Problems:** each re-implements KPI and chart styling.
- **Equivalent:** `MetricStrip` + `LineChart`.
- **Strategy:** shared `MetricStrip`, shared chart theme.
- **Risk:** low · **Complexity:** M · **Deps:** Phase 3 · **Priority:** P2

#### QueueView
- **Current:** `queue/QueueView.tsx`, 794 lines. `text-xl font-semibold text-gray-100` title (L738); `gray`/`blue`/`violet` palette (L155–457).
- **Problems:** `gray-*` bypasses tokens and breaks light theme; title size differs from every other screen.
- **Equivalent:** `screens/Incidents.tsx` (60 lines) — `PageHead` + `.tbl`.
- **Strategy:** `PageHead`, `.tbl` semantics, token colours.
- **Risk:** low · **Complexity:** M · **Deps:** Phase 1, 2 · **Priority:** P1

### 8.3 Alerts and cases

#### AlertsView
- **Current:** `alerts/AlertsView.tsx`, 1,238 lines. 4-stat strip + 3-way mode switch + master/detail cockpit + 6 detail tabs (L29) + AI banner + runbook dropdown.
- **Problems:** 6 detail tabs; 3-way mode switch; 98 `div`s; badges layer text+tint+border (L67–71, L140–142); AI banner is a full-width row.
- **Equivalent:** `screens/Incidents.tsx` + `IncidentDetail.tsx` `detail-grid` (L400).
- **Strategy:** master/detail with `detail-grid`; detail tabs → one scroll; badges → dot+tint.
- **Risk:** high · **Complexity:** L · **Deps:** Phase 2, 3, 4 · **Priority:** P1

#### AlertDetailView
- **Current:** 1,119 lines.
- **Problems:** overlaps `AlertsView` detail pane; two implementations of one screen.
- **Equivalent:** `IncidentDetail.tsx` (671 lines).
- **Strategy:** converge with `AlertsView`'s detail pane into one component.
- **Risk:** high · **Complexity:** L · **Deps:** AlertsView · **Priority:** P2

#### CaseWorkspace
- **Current:** `cases/CaseWorkspace.tsx`, 2,181 lines, 6 tabs (L50–60), 22 card surfaces.
- **Problems:** 6 tabs; 22 locally-styled cards; 2,181 lines.
- **Equivalent:** `IncidentDetail.tsx` — `detail-grid` 1fr/340px with a meta-bar.
- **Strategy:** one scroll + sticky 340px rail; extract 22 cards to `Card`/`Pane`.
- **Risk:** high · **Complexity:** XL · **Deps:** Phase 3, 4 · **Priority:** P2

### 8.4 Hunting and intelligence

#### HuntView
- **Current:** 1,353 lines. `text-2xl sm:text-3xl` title (L272), `surface-border-strong` (L417, 524) and `surface-sunken` (L417) which are undefined.
- **Problems:** undefined surface tokens; three title sizes on one screen.
- **Equivalent:** `screens/Analytics.tsx` (47 lines) — `PageHead` + `.tbl`.
- **Strategy:** `PageHead`; fix tokens; `.tbl`.
- **Risk:** low · **Complexity:** M · **Deps:** Phase 0, 1 · **Priority:** P1

#### DetectionsView
- **Current:** 920 lines, 4 tabs (L146–172) against 7 declared in nav (L357–386).
- **Problems:** tab/nav mismatch; `border-blue-500/30 bg-blue-500/5` banner (L524) bypasses tokens.
- **Equivalent:** `screens/Analytics.tsx` — list + inline panels.
- **Strategy:** one list + 3 anchored panels; reconcile nav.
- **Risk:** medium · **Complexity:** M · **Deps:** Phase 2, 4, 5 · **Priority:** P2

#### RuleEditor
- **Current:** 1,276 lines.
- **Problems:** form built from ad-hoc inputs; no `.fld-input` equivalent.
- **Equivalent:** `.fld-input` / `.fld-hint` / `.auth-label`.
- **Strategy:** extract a `Field` primitive from this file, then reuse.
- **Risk:** medium · **Complexity:** L · **Deps:** Phase 1 · **Priority:** P2

### 8.5 Automation

#### PlaybooksView
- **Current:** 1,166 lines, 7 tabs (L60), 3 header CTAs.
- **Problems:** 7 tabs; 3 primaries; tabs mix content types with run history.
- **Equivalent:** `screens/Runbooks.tsx` (40 lines) — `PageHead` + list.
- **Strategy:** 2 tabs (Library, Runs); content types become filters; one primary CTA.
- **Risk:** medium · **Complexity:** M · **Deps:** Phase 3, 4 · **Priority:** P2

### 8.6 Settings and connectors

#### SettingsView
- **Current:** 2,731 lines, 15 tabs, 29 bordered panels, two tab visual languages (L419–464).
- **Problems:** worst token breakage in the repo (L431, L456); dual tab bars; 15 destinations.
- **Equivalent:** `screens/Settings.tsx` (397 lines) — one scroll, one `PageHead`.
- **Strategy:** one scroll; 7 sticky sections; governance panels as anchored sections; `Card` for all 29 surfaces.
- **Risk:** high · **Complexity:** XL · **Deps:** Phase 0, 3, 4, 5 · **Priority:** P0
  *(P0 because L431/L456 is the canonical demonstration of the token defect and the
  screen most likely to be screenshotted for demos.)*

#### ConnectorsView
- **Current:** 328 lines, thin wrapper; `text-xl` title (L207); "not measured" honesty at L285.
- **Problems:** title size; delegates everything to `AddConnectorModal`.
- **Equivalent:** `screens/Connectors.tsx` (1,131 lines) — table-first.
- **Strategy:** `PageHead`; `.tbl`.
- **Risk:** low · **Complexity:** S · **Deps:** Phase 1 · **Priority:** P1

#### AddConnectorModal
- **Current:** 1,719 lines.
- **Problems:** a single modal larger than the reference console's largest screen.
- **Equivalent:** `.modal` + the wizard at `app.css` L914–1121 (head/body/foot, steps).
- **Strategy:** adopt the wizard structure; split into steps.
- **Risk:** high · **Complexity:** XL · **Deps:** Phase 6 · **Priority:** P3

### 8.7 Marketplace and shared

#### MarketplaceView
- **Current:** 1,315 lines; `zinc`/`rose`/`yellow`/`sky` palette (L257–353); `text-2xl font-bold text-zinc-100` (L985).
- **Problems:** worst light-theme breakage; 4 raw hue families.
- **Equivalent:** `screens/Analytics.tsx` — `PageHead` + grid of `Card`s.
- **Strategy:** tokens only; `PageHead`; `Card` grid.
- **Risk:** medium · **Complexity:** L · **Deps:** Phase 2 · **Priority:** P2

#### ui/ primitives
- **Current:** `Card`, `Button`, `Badge`, `StatusPill` — all four test-only — and `EmptyState`, used in 41 files.
- **Problems:** the library exists and works (`EmptyState` proves it) but four of five primitives are bypassed, so 532 buttons and 29 settings panels are hand-built.
- **Equivalent:** `ui.tsx` (149 lines, 8 exports).
- **Strategy:** adopt, do not rewrite; add `PageHead`, `MetricStrip`, `Pane`, `Chip`, `Field`.
- **Risk:** low · **Complexity:** M · **Deps:** Phase 0 · **Priority:** P0

---

## 9. Deliverable 8 — Design principles, with evidence

Each principle states the rule, the reference evidence, and the AiSOC failure it
corrects.

### P1 — One container vocabulary
**Rule:** a screen may use at most four container shapes.
**Evidence:** `app.css` L227 (`card`), L564 (`pane`), L237 (`metrics`), L400
(`detail-grid`). Sixteen screens, four shapes.
**Corrects:** 22 card surfaces in `CaseWorkspace.tsx`, 29 in `SettingsView.tsx`.

### P2 — Every colour is a token
**Rule:** no literal hex and no raw palette utility in a component.
**Evidence:** `app.css` L21–56 — the entire palette is two blocks of colour
variables, every one redefined per theme. The 51 hex occurrences elsewhere in `src/`
are almost all vendor SVG marks and one chart-series map, not UI surfaces.
**Corrects:** 402 hexes in `.tsx`/`.ts`, 2,600 raw utilities, 16 hue families.

### P3 — A token that is referenced must be defined
**Rule:** every `tailwind.config.ts` colour key must have a `--var` in both themes,
enforced by CI.
**Evidence:** AiSOC `tailwind.config.ts` L29–45 references `--brand-*` and
`--ai-accent`; `globals.css` defines neither. 1,070 class usages render nothing.
**Corrects:** the `brand`/`surface`/`ai` defect class.

### P4 — Hierarchy uses one signal
**Rule:** an element carries a border *or* a tint *or* a shadow, not all three.
**Evidence:** `.badge` L263–279 — tint + dot + text colour, no border. `.card`
L227 — border only, no shadow. `.btn.primary` L208 — the only gradient.
**Corrects:** `AlertsView.tsx` L67–71 and L140–142, which layer all three.

### P5 — One primary style, one per view region
**Rule:** a single `.btn.primary`-weight style product-wide; at most one per view
region (header, table, or dialog footer).
**Evidence:** `app.css` L208 — one gradient definition for the whole authenticated UI.
Measured use is 0 on list/detail screens, 1 on the dashboard, and one per step or
table on form screens.
**Corrects:** three competing header CTAs in `PlaybooksView.tsx`; hero CTA plus KPIs
in `DashboardView.tsx`; the absence of any shared primary style.

### P6 — A tab is a filter, not a destination
**Rule:** tabs switch data, not views. Different views of one object are sections on
one scroll.
**Evidence:** zero in-page tab bars in 16 authenticated screens; the only tab bar is
`Auth.tsx` L197, a two-way toggle.
**Corrects:** 38 in-page tabs across 5 screens; 74 tab surfaces in total.

### P7 — Density is declared once
**Rule:** padding and gap come from the primitive, never from the call site.
**Evidence:** `.metrics .kpi` L242 fixes `18px 20px`; `.tbl td` L382 fixes `13px 16px`.
**Corrects:** per-screen padding across 51 bordered surfaces in two files.

### P8 — Eight type sizes
**Rule:** a closed scale; no arbitrary sizes.
**Evidence:** §2.4 — eight distinct sizes across nine roles in 1,121 lines.
**Corrects:** 792 arbitrary sizes; six page-title treatments.

### P9 — Three radii
**Rule:** container, small control, pill. Nothing between.
**Evidence:** `app.css` L61 — `--radius:1.25rem`, `--radius-sm:0.75rem`,
`--radius-pill:9999px`.
**Corrects:** 76 arbitrary radii.

### P10 — Tables wrap, never scroll
**Rule:** `table-layout: fixed` + `overflow-wrap: anywhere` + `min-width: 0` on grid
children.
**Evidence:** `app.css` L379–382 and L611–625.
**Corrects:** 49 `overflow-x-auto` usages.

### P11 — Status is a dot and a tint
**Rule:** one badge component, one shape, seven visual variants.
**Evidence:** `.badge` L263–279 — thirteen class names aliasing seven variants.
**Corrects:** per-screen badge markup in `AlertsView`, `QueueView`, `MarketplaceView`.

### P12 — Every state has one component
**Rule:** `Skeleton`, `EmptyState`, `ErrorState`. No inline variants.
**Evidence:** `.skeleton` L585, `.empty` L479, `.empty-state` L595.
**Corrects:** `EmptyState` is adopted in 41 files but has no `Skeleton` or `ErrorState`
peer, so loading and failure are still hand-built per screen (973 occurrences of
`loading`, `isLoading`, `animate-pulse`, or `Skeleton`, with no shared component).

### P13 — Overlays are dialogs
**Rule:** every overlay carries `role="dialog"`, a focus trap, and a labelled close.
**Evidence:** AiSOC itself — 8 `role="dialog"` against 269 overlay references shows
the gap; the reference console's `.modal` L716 has a structured head with a close slot.
**Corrects:** 116 modal + 153 drawer references, mostly hand-built divs.

### P14 — Motion is a contract
**Rule:** three durations, one easing, reduced-motion respected globally.
**Evidence:** `app.css` uses only `.14s` and `.12s` hover transitions (L242, L384)
and one shimmer keyframe (L586).
**Corrects:** 63 ad-hoc `motion.div` transitions across 35 imports.

### P15 — Breadth is expressed in navigation, not in nesting
**Rule:** when a product has more than ~10 destinations, widen the first level rather
than adding a third.
**Evidence:** AiSOC's own `Breadcrumbs.tsx` and 8-workspace sidebar are the right
answer for breadth; the failure is adding tabs *under* tabs.
**Corrects:** the 3-level hierarchy.

---

## 10. Deliverable 9 — Permanent AI SOC design guidelines

This is the normative document. It is written to be quotable in review.

### 10.1 Purpose and scope

These guidelines govern `apps/web` console surfaces: `(app)`, `(admin)`,
`(responder)`, `(tools)`. They do not govern `(marketing)`, which has its own
documented language (`tailwind.config.ts` L96–132).

They apply to presentation only. They do not constrain data models, API shapes,
state management, or route structure.

### 10.2 Non-negotiable rules

1. **No literal colour in a component.** Colour comes from a token. Hex belongs in
   `globals.css` and nowhere else.
2. **No raw palette utility.** `text-zinc-100`, `bg-gray-800`, `border-rose-500/25`
   are prohibited in console components. Semantic tokens only.
3. **No undefined token.** If `tailwind.config.ts` names a variable, both theme
   blocks in `globals.css` must define it. CI enforces the pairing.
4. **No arbitrary size or radius.** `text-[13.5px]` and `rounded-[10px]` are
   prohibited. Use the scale.
5. **No new container shape.** `Card`, `Pane`, `MetricStrip`, `DetailGrid`. A fifth
   shape requires an RFC.
6. **No new tab bar.** Tabs switch data. Views of one object are sections on one
   scroll.
7. **One primary style.** A single primary-weight treatment product-wide, used at
   most once per view region.
8. **Every overlay is a dialog**, with `role="dialog"`, a focus trap, and Escape.
9. **Every async surface declares four states:** loading, empty, error, populated.
10. **Every table wraps.** Fixed layout, `overflow-wrap`, `min-width: 0` on grid
    children.
11. **Motion respects `prefers-reduced-motion`.**
12. **No fabricated data outside demo mode.** An unmeasured value reads "not
    measured", never `0`.

### 10.3 The token contract

A token has four parts and all four must exist before use:

```
1. a CSS variable, in :root (dark) and [data-theme="light"]
2. a tailwind.config.ts colour key pointing at it
3. a semantic name (role, not hue)
4. a documented contrast pair for text-on-token
```

**Surface ramp** — 7 steps: `base`, `raised`, `card`, `hover`, `subtle`, `border`,
`divider`. Add `elevated`, `sunken`, `border-strong` to close the current gap.

**Foreground ramp** — 5 steps: `primary`, `secondary`, `muted`, `subtle`, `inverse`.

**Severity** — exactly five: `critical`, `high`, `medium`, `low`, `info`. This
matches the repository's five-tier ladder and must not be extended or collapsed.

**Status** — `live`, `warn`, `dead`, `idle`.

**Brand** — a 10-step ramp. One accent, one AI accent. Nothing else.

### 10.4 Type scale

| Token | Size | Weight | Use |
| --- | --- | --- | --- |
| `display` | 28px | 700 | KPI value only |
| `title` | 22px | 700 | page title only |
| `heading` | 16px | 600 | pane heading |
| `subheading` | 13px | 600 | card title, emphasis |
| `body` | 13px | 400 | default |
| `caption` | 12px | 400 | secondary copy |
| `label` | 10.5px | 700 | table head, uppercase |
| `micro` | 11px | 500 | badges |

Eight steps. A new size requires deleting one.

### 10.5 Density contract

| Surface | Padding | Gap |
| --- | --- | --- |
| `Card` | 18px | 16px |
| `Pane` | 18px | 14px |
| `MetricStrip` cell | 18px 20px | 1px (the divider) |
| table cell | 13px 16px | 0 |
| page content | 28px 32px 64px | 16px |

Compact density is a token override, not a per-component prop.

### 10.6 Navigation contract

- Level 1: workspace. Maximum 10. Icons plus labels.
- Level 2: sections within a workspace, rendered as a sticky rail or anchors, not a
  second sidebar.
- Level 3: none.
- A route tab registry may exist, but it must be generated from the same source the
  page renders. Two sources that can disagree are a defect.
- Breadcrumbs describe the route. If a page has anchored sections, the breadcrumb
  may append the active section, but must not invent a trail.

### 10.7 Status and severity presentation

One badge. A pill, a 6px dot, a tint (solid soft tint in light, 12% alpha in dark),
text in the same hue, no border.

Severity maps to `severity.*`. Status maps to `status.*`. A vendor that publishes
`critical` maps to `critical`; it is never collapsed into `high`.

### 10.8 Tables

Fixed layout. Uppercase 10.5px/700 headers. 13px cells with 13px/16px padding. One
bottom border per row, none on the last. Hover changes the row surface only.
Identifiers in 11px monospace. Long values wrap. Never scroll horizontally.

### 10.9 Overlays

| Kind | Width | Use |
| --- | --- | --- |
| `Dialog` | 460px / 640px (`wide`) | confirmations, forms |
| `Sheet` | 380px, right | context, filters, detail rail |
| `Toast` | 280–440px, bottom-right | transient feedback |

`Dialog` and `Sheet` carry `role="dialog"`, a focus trap, Escape, a labelled close,
and `backdrop-filter` blur. `Toast` carries `role="status"` and `aria-live="polite"`;
it must never be the only channel for an error a user has to act on. A `Sheet` used
for a detail rail must not be the only way to see that information — the information
must also be reachable without an overlay.

### 10.10 States

| State | Component | Rule |
| --- | --- | --- |
| Loading | `Skeleton` | match the shape of the content, never a spinner over empty space |
| Empty | `EmptyState` | icon tile, 17px heading, one sentence, one action |
| Error | `ErrorState` | what failed, what to do, retry |
| Not measured | `NotMeasured` | the literal text "not measured"; never `0` |

### 10.11 Forms

One `Field` primitive: label, input, hint, error. One input style. Validation on
blur, not on keystroke. Errors below the field, not in a toast.

### 10.12 Search and filters

One search input, one filter chip (`8px` radius, 12px text), one selected-value chip
(`20px` radius, 10.5px/600). Debounce server-side search at 250ms — the pattern
already used in `DetectionsView.tsx` L193–196 and worth standardising.

### 10.13 Motion

| Duration | Use |
| --- | --- |
| 120ms | hover, focus |
| 180ms | enter, tab/section change |
| 240ms | overlay |

One easing: `cubic-bezier(0.25, 1, 0.5, 1)`. `prefers-reduced-motion: reduce`
disables transform and opacity transitions globally, not per component.

### 10.14 Charts

One axis style, one grid style, one tooltip. Series colours come from `severity.*`
and `status.*` only. No decorative gradients in charts.

### 10.15 Review checklist

A pull request touching a console surface is rejected if it does any of the following.
Reviewers tick the box when the violation is present.

- [ ] introduces a literal hex colour
- [ ] introduces a raw palette utility
- [ ] introduces an arbitrary `text-[…px]` or `rounded-[…px]`
- [ ] references a token not defined in both themes
- [ ] adds a fifth container shape
- [ ] adds a tab bar to a screen that already has one
- [ ] adds a second primary-weight control to the same view region
- [ ] ships an async surface without four states
- [ ] adds a table without fixed layout
- [ ] adds an overlay without `role="dialog"`
- [ ] adds a transition without the motion token
- [ ] renders fabricated data outside demo mode

---

## Appendix A — Measurement commands

```powershell
# Token definitions (expect zero hits today)
Get-ChildItem -Recurse -File . -Include '*.css','*.ts','*.tsx','*.js','*.mjs','*.html' |
  Where-Object { $_.FullName -notmatch 'node_modules|\.next|dist|build' } |
  Select-String -Pattern '--brand-500\s*:|--brand-400\s*:|--ai-accent\s*:'

# Class-usage counts
$all = Get-ChildItem -Recurse -File 'apps/web/src' -Include '*.tsx','*.ts'
function C($pat){ ($all | Select-String -Pattern $pat -AllMatches |
  ForEach-Object { $_.Matches.Count } | Measure-Object -Sum).Sum }
C 'brand-(50|100|200|300|400|500|600|700|800|900)'
C 'surface-elevated'
C 'text-\[[0-9]+(\.[0-9]+)?px\]'
C '<button'

# File sizes
Get-ChildItem -Recurse -File 'apps/web/src/components' -Filter '*.tsx' |
  ForEach-Object { "$((Get-Content $_.FullName).Count)`t$($_.Name)" } |
  Sort-Object {[int]($_ -split "`t")[0]} -Descending

# Routes
(Get-ChildItem -Recurse -File 'apps/web/src/app' -Filter 'page.tsx').Count
```

## Appendix B — What was not verified

- **Reference console runtime behaviour.** No build or dev server was run. All claims are
  from source. Whether the CSS renders as read is not verified.
- **AiSOC visual output.** No screenshots, no browser session. Claims about what is
  "invisible" follow from the CSS specification — a `var()` whose custom property is
  never defined makes the declaration invalid at computed-value time — not from
  observation in a browser.
- **Whether `packages/ui` primitives are consumed anywhere outside `apps/web`.**
  Only `apps/web` was searched.
- **Historical intent** for the four shells. No commit archaeology was performed; the
  marketing split is documented (`tailwind.config.ts` L96–100), the other three are
  recorded as observed drift only.
- **Prior analysis in the source folder.** `ui_src_final/SRE-to-SOC-frontend-analysis.md`
  (29 KB) exists but was not used as evidence, because its provenance and accuracy
  could not be established. Every claim here is independently re-derived.
- **Performance.** No bundle analysis, no render profiling, no Lighthouse run.
