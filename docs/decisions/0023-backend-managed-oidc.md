# ADR-0023 (ADR-002) — Backend-managed OIDC Relying Party over browser-managed authentication

- **Status:** accepted
- **Date:** 2026-11-10

## Context

When integrating Keycloak and federated Google Workspace SSO into the console,
two architectural patterns were available:

1. **Browser-managed OIDC (SPA public client)** — the browser executes the OIDC
   code exchange directly against the Identity Provider, holds IdP tokens, or
   provisions users by calling Keycloak Admin REST APIs from client-side code.
2. **Backend-managed OIDC Relying Party (`services/api`)** — the browser
   initiates login via `/auth/oidc/login`, `services/api` manages state, nonce,
   PKCE (`S256`), token exchange, JWKS `RS256` signature verification, JIT user
   provisioning, group-to-role mapping, and tenant MFA policy evaluation, and
   then issues a first-party AiSOC session JWT.

## Decision

Keep all OIDC and SAML protocol handling strictly inside `services/api`
(`services/api/app/auth/oidc.py` and `services/api/app/auth/sso_provisioning.py`).
The frontend never communicates directly with Keycloak's token or admin
endpoints and never holds Identity Provider client secrets or admin credentials.

To support one-click federated login (such as Google Workspace via Keycloak),
`GET /auth/oidc/login` accepts an optional `kc_idp_hint` parameter validated
against a strict allowlist regex (`^[a-zA-Z0-9_\-]{1,64}$`) and forwards it to
the upstream authorization endpoint.

## Alternatives considered

### 1. Browser-direct Keycloak Admin REST API calls for user registration

Rejected as a critical security vulnerability. Calling Keycloak Admin REST APIs
from the browser requires exposing admin credentials (`admin-cli` or realm admin
passwords) in `NEXT_PUBLIC_*` client bundles, allowing any unauthenticated user
to take over the realm. Instead, user creation uses backend-mediated OIDC
Just-In-Time (JIT) provisioning (`complete_sso_login`).

### 2. Validating IdP `id_token` / `access_token` directly on API routes without issuing an AiSOC JWT

Rejected. AiSOC enforces multi-tenant Row-Level Security (`tenant_id`),
database-backed RBAC catalog synchronization (`sync_user_catalog_role`),
session revocation (`sessions_revoked_at`), and tenant-level MFA policies.
Resolving the assertion once at `/auth/oidc/callback` and minting a standard
AiSOC session JWT guarantees that password sign-in, OIDC sign-in, and SAML
sign-in produce identical session semantics across every backend microservice.

## Consequences

- Zero IdP secrets or admin credentials are exposed to the browser.
- Every security control in `sso_provisioning.py` (`email_verified` enforcement
  for GHSA-qjjc-q2h2-56cg, Redis-backed single-use `state` + `nonce`, PKCE
  `S256`, `ASSIGNABLE_ROLES` guard, and tenant MFA challenge handoff) applies
  automatically to Keycloak and Google Workspace logins.
- In Docker and AWS EC2 deployments, `apps/web` proxies `/auth/*` to
  `services/api` over the internal network while the browser only needs reachability
  to the public console origin and the IdP authorization URL.
