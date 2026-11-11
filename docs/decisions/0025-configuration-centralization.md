# ADR-0025 (ADR-004) — Centralized frontend configuration and separation of branding from theme

- **Status:** accepted
- **Date:** 2026-11-10

## Context

As the Next.js console (`apps/web`) grew to support configurable API base URLs,
external Identity Providers, corporate email domain policies, organisation
logos, and custom visual design tokens, reading `process.env.NEXT_PUBLIC_*`
directly inside React components created three maintenance hazards:

1. Default values and boolean parsing rules (`1`, `true`, `yes`, `on`) were
   duplicated across components.
2. Identity assets (organisation name, logo paths, favicon) were conflated with
   visual design tokens (surface colours, gradients, radii, shadows, spacing).
3. Deploying the same image across local development, Docker Compose, AWS EC2,
   and CI required auditing individual UI files to discover which environment
   variables existed.

## Decision

Centralize all frontend configuration under `apps/web/src/config/` with strict
separation of concerns:

- `apps/web/src/config/features.ts` — boolean and enum feature switches
  (`isFullIntelligenceEnabled`, `isExternalIdpEnabled`, `isKeycloakEnabled`,
  `getConfiguredIdpProvider`, `isOrgTemplateEnabled`).
- `apps/web/src/config/auth.ts` — authentication endpoints, IdP provider type,
  upstream IdP hint (`ssoIdpHint`), and corporate email domain policy
  (`getDisallowedEmailDomains`, `getAuthConfig`).
- `apps/web/src/config/branding.ts` — organisation identity assets only
  (`orgName`, `platformSubtitle`, `logoDarkPath`, `logoLightPath`, `logoAlt`,
  `faviconPath`).
- `apps/web/src/config/theme.ts` — visual design tokens only (dark/light colour
  palettes, auth card tokens, gradients, spacing, typography, shadows, border
  radii, and `getAuthThemeCssVars()`).

## Alternatives considered

### 1. Read `process.env.NEXT_PUBLIC_*` inline in each React component

Rejected. Inline environment reads scatter fallback defaults across the tree
and make unit testing with `vi.stubEnv()` brittle.

### 2. Combine branding assets and theme colours in a single `branding.ts` module

Rejected. An operator white-labelling the console with a custom logo and
organisation name via environment variables should not have to touch colour
palettes, gradients, or spacing tokens. Separating `branding.ts` (identity
assets) from `theme.ts` (visual tokens) keeps each module cohesive.

## Consequences

- Components consume typed configuration objects (`getAuthConfig()`,
  `getOrgBrandingConfig()`, `getOrgThemeConfig()`, `getAuthThemeCssVars()`)
  rather than raw `process.env` strings.
- Zero filesystem paths, hostnames, ports, or organisation names are hardcoded
  in UI components.
- The exact same container build runs unchanged across local laptops, Docker
  Compose, AWS EC2, and CI pipelines.
