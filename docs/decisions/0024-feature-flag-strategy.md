# ADR-0024 (ADR-003) — Feature flag strategy for UI navigation, branding, and external IdPs

- **Status:** accepted
- **Date:** 2026-11-10

## Context

Enterprise deployments of AiSOC customize both the navigation surface and the
identity/branding experience:

1. **Sidebar Intelligence scope** — some SOC deployments want only
   `Investigations` (`/investigate`) visible under `Intelligence`, while
   full-spectrum threat-intelligence teams need all 12 specialist intelligence
   views (`Threat Intel`, `Actor Attribution`, `Campaigns`, `Dark Web`, `EASM`,
   `Brand Takedowns`, `Phishing Intake`, `Vulnerability Intel`, `CTI Sharing`,
   `STIX / TAXII`, and `Retro Hunts`).
2. **Organisation theme & branding** — deployments need to toggle between the
   organisation-branded login/header experience and default AiSOC chrome.
3. **External Identity Provider mode** — deployments must be able to enable or
   disable external OIDC/Keycloak federation without code changes.

Hardcoding these choices or deleting existing navigation items would break
backward compatibility and require git reverts during incidents.

## Decision

Control all three capabilities through declarative configuration flags in
`apps/web/src/config/features.ts` and `services/api/app/auth/oidc.py`:

- `NEXT_PUBLIC_SIDEBAR_FULL_INTELLIGENCE` (default `false`): keeps only
  `Investigations` (`enabled: true`) visible under `Intelligence` by default,
  while retaining the other 11 items in `MORE_TOOLS_GROUPS` with
  `enabled: false` so setting the flag to `true` restores all 12 items without
  code edits.
- `NEXT_PUBLIC_ORG_TEMPLATE_ENABLED` (default `true`): controls organisation
  branding and login card rendering; setting `false` falls back to default
  AiSOC branding.
- `NEXT_PUBLIC_IDP_ENABLED` / `NEXT_PUBLIC_KEYCLOAK_ENABLED` (default `false`)
  paired with backend `SSO_ENABLED` (default `false`): gates external IdP
  federation behind explicit operator opt-in.

## Alternatives considered

### 1. Delete or comment out the 11 Sidebar Intelligence items in `Sidebar.tsx`

Rejected. Deleting or commenting out navigation items creates dead code,
prevents runtime or build-time toggling across tenants/environments, and makes
regression testing impossible.

### 2. Enable external SSO endpoints by default when unconfigured

Rejected. An unconfigured SSO endpoint must fail closed (`503 Service
Unavailable` when `SSO_ENABLED=false`, `501 Not Implemented` when `OIDC_ISSUER`
or `OIDC_CLIENT_ID` is unset).

## Consequences

- **Instant rollback:** Any feature stream can be rolled back in local Docker,
  Docker Compose, or AWS EC2 by flipping an environment variable and restarting
  the container—without reverting commits or modifying source files.
- **Testable in both states:** Unit tests (`Sidebar.test.tsx`,
  `identity-provider.test.ts`, `TopBar.test.tsx`) deterministically verify both
  the default state and the flag-overridden state.
