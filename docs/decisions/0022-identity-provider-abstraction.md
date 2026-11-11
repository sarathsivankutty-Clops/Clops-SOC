# ADR-0022 (ADR-001) — Provider-agnostic Identity Provider abstraction on the console

- **Status:** accepted
- **Date:** 2026-11-10

## Context

Enterprise deployments of AiSOC require flexible authentication across multiple
identity architectures:

- Local database-backed email/password authentication with TOTP/WebAuthn MFA
  (default for self-hosted CORE evaluations and break-glass administrator
  accounts).
- Self-hosted or managed Keycloak acting as an OIDC identity broker (for
  example, federating Google Workspace via `kc_idp_hint`).
- Direct enterprise OIDC / SAML 2.0 Identity Providers such as Microsoft Entra
  ID (Azure AD), Okta, Auth0, and AWS Cognito.

When UI components (such as `/login`) import provider-specific modules or invoke
Keycloak-named functions directly (`keycloakLogin()`), switching or adding an
identity provider requires editing view components and introduces tight coupling
between presentation logic and a single vendor's terminology.

## Decision

Introduce a provider-agnostic `IdentityProvider` interface in
`apps/web/src/lib/auth/identity-provider.ts` that cleanly separates three
concerns:

1. **Identity Provider (`IdentityProvider`)** — implemented by
   `LocalIdentityProvider`, `ExternalOidcIdentityProvider`, and
   `KeycloakIdentityProvider`, resolved at runtime through
   `getIdentityProvider()`.
2. **Application Session (`authApi`)** — owns storage, refresh, and attachment
   of AiSOC's first-party session JWT.
3. **Authorization (RBAC)** — enforced server-side in `services/api` and tenant
   Row-Level Security (RLS) policies in PostgreSQL.

Presentation components (`/login`) depend exclusively on the `IdentityProvider`
contract (`validateEmail`, `loginWithPassword`, `buildSsoLoginUrl`,
`initiateSsoLogin`, `initiateFederatedLogin`, `completeSsoHandoff`, `logout`)
and never import `keycloak.ts` directly. `apps/web/src/lib/keycloak.ts` is
retained strictly as a thin backward-compatible facade for legacy callers.

## Alternatives considered

### 1. Call Keycloak-specific helpers directly from React components

Rejected. Sprinkling `keycloakLogin()` across UI components leaks broker-specific
terminology into the presentation layer and requires component changes whenever
an organization adopts Okta, Microsoft Entra ID, Auth0, or AWS Cognito.

### 2. Replace `authApi` with a vendor-specific SPA SDK (`keycloak-js`)

Rejected. Embedding a vendor SPA SDK in the browser couples token formats,
session lifecycles, and refresh semantics to a single IdP vendor and bypasses
AiSOC's tenant-scoped JWT issuance and MFA policy enforcement.

## Consequences

- `/login` and future authentication surfaces depend only on `IdentityProvider`.
- Adding support for a new OIDC/SAML provider requires zero changes to React
  components; operators configure `OIDC_ISSUER` / `OIDC_CLIENT_ID` on
  `services/api` and `NEXT_PUBLIC_IDP_PROVIDER` on `apps/web`.
- Existing callers and tests importing `@/lib/keycloak` continue to work
  unchanged through the compatibility re-export layer.
