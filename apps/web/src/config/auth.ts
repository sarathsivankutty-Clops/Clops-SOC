/**
 * Centralized Authentication & Identity Provider Configuration
 *
 * All OIDC, external IdP, and corporate email domain settings are resolved from
 * environment variables here. No URLs, ports, realms, client IDs, or
 * credentials are hardcoded in application components.
 */

import { API_BASE } from '@/lib/api';
import {
  getConfiguredIdpProvider,
  isExternalIdpEnabled,
  type ConfiguredIdpType,
} from './features';

const DEFAULT_DISALLOWED_PERSONAL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
] as const;

export interface AuthConfig {
  /** Base path for backend API / Next.js same-origin rewrite proxy */
  apiBase: string;
  /** Provider-neutral active Identity Provider type (`local` | `keycloak` | `oidc` | `saml`) */
  idpProvider: ConfiguredIdpType;
  /** Provider-neutral flag indicating whether external IdP / OIDC federation is enabled */
  externalIdpEnabled: boolean;
  /** Provider-neutral upstream IdP hint (e.g. `google` for Google Workspace federation) */
  ssoIdpHint: string;
  /** Backward-compatible alias for `externalIdpEnabled` */
  keycloakEnabled: boolean;
  /** Backward-compatible alias for `ssoIdpHint` */
  googleIdpHint: string;
  /** Whether personal webmail domains (@gmail.com, etc.) are blocked */
  blockPersonalEmails: boolean;
  /** Disallowed personal email domains (lowercase) */
  disallowedEmailDomains: readonly string[];
}

export function getDisallowedEmailDomains(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_DISALLOWED_EMAIL_DOMAINS?.trim();
  if (!raw) {
    return DEFAULT_DISALLOWED_PERSONAL_DOMAINS;
  }
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function getAuthConfig(): AuthConfig {
  const blockRaw = process.env.NEXT_PUBLIC_BLOCK_PERSONAL_EMAILS?.trim().toLowerCase();
  const blockPersonalEmails =
    blockRaw === undefined || blockRaw === ''
      ? true
      : ['1', 'true', 'yes', 'on'].includes(blockRaw);

  const externalIdpEnabled = isExternalIdpEnabled();
  const ssoIdpHint =
    process.env.NEXT_PUBLIC_SSO_IDP_HINT?.trim() ||
    process.env.NEXT_PUBLIC_KEYCLOAK_GOOGLE_IDP_HINT?.trim() ||
    'google';

  return {
    apiBase: API_BASE,
    idpProvider: getConfiguredIdpProvider(),
    externalIdpEnabled,
    ssoIdpHint,
    keycloakEnabled: externalIdpEnabled,
    googleIdpHint: ssoIdpHint,
    blockPersonalEmails,
    disallowedEmailDomains: getDisallowedEmailDomains(),
  };
}
