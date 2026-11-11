/**
 * Centralized Feature Flags Configuration
 *
 * All UI and authentication feature switches resolve from environment
 * variables through this module so components do not scatter `process.env`
 * reads across the codebase and every feature can be rolled back via
 * configuration without reverting commits.
 */

export type ConfiguredIdpType = 'local' | 'keycloak' | 'oidc' | 'saml';

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

/**
 * When `false` (default), the Sidebar Intelligence section displays only
 * `Investigations` (`/investigate`). Set `NEXT_PUBLIC_SIDEBAR_FULL_INTELLIGENCE=true`
 * to restore all 12 specialist Intelligence links.
 */
export function isFullIntelligenceEnabled(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_SIDEBAR_FULL_INTELLIGENCE, false);
}

/**
 * Provider-neutral check for whether an external Identity Provider (Keycloak,
 * Okta, Microsoft Entra ID, Auth0, AWS Cognito, or generic OIDC/SAML) is enabled.
 * Reads `NEXT_PUBLIC_IDP_ENABLED` first and falls back to `NEXT_PUBLIC_KEYCLOAK_ENABLED`.
 */
export function isExternalIdpEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_IDP_ENABLED !== undefined && process.env.NEXT_PUBLIC_IDP_ENABLED.trim() !== '') {
    return parseBooleanFlag(process.env.NEXT_PUBLIC_IDP_ENABLED, false);
  }
  return parseBooleanFlag(process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED, false);
}

/**
 * Backward-compatible alias for `isExternalIdpEnabled()`.
 */
export function isKeycloakEnabled(): boolean {
  return isExternalIdpEnabled();
}

/**
 * Resolves the active frontend identity provider type from `NEXT_PUBLIC_IDP_PROVIDER`
 * (`local` | `keycloak` | `oidc` | `saml`), falling back to `keycloak` when
 * `isExternalIdpEnabled()` is true, or `local` otherwise.
 */
export function getConfiguredIdpProvider(): ConfiguredIdpType {
  const raw = process.env.NEXT_PUBLIC_IDP_PROVIDER?.trim().toLowerCase();
  if (raw === 'keycloak' || raw === 'oidc' || raw === 'saml' || raw === 'local') {
    return raw;
  }
  return isExternalIdpEnabled() ? 'keycloak' : 'local';
}

/**
 * When `true` (default), enables the organisation design template on `/login`,
 * `Sidebar`, and `TopBar`. Set `NEXT_PUBLIC_ORG_TEMPLATE_ENABLED=false` to
 * fall back to default chrome.
 */
export function isOrgTemplateEnabled(): boolean {
  return parseBooleanFlag(process.env.NEXT_PUBLIC_ORG_TEMPLATE_ENABLED, true);
}
