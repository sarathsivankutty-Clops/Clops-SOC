/**
 * Backward-Compatible Facade for `@/lib/auth/identity-provider`
 *
 * Application components (such as `/login`) must depend directly on
 * `@/lib/auth/identity-provider` rather than importing this file.
 * This module is retained strictly for backward compatibility with existing
 * callers and tests.
 */

import './crypto-polyfill';
import {
  AUTH_REFRESH_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  isTokenExpired,
} from '@/lib/api';
import {
  ExternalOidcIdentityProvider,
  KeycloakIdentityProvider,
  LocalIdentityProvider,
  buildOidcLoginUrl,
  formatDisplayName,
  getIdentityProvider,
  isPersonalEmail,
  type EmailValidationResult,
  type IdentityProvider,
  type SsoRedirectOptions,
} from '@/lib/auth/identity-provider';

export {
  AUTH_REFRESH_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  ExternalOidcIdentityProvider,
  KeycloakIdentityProvider,
  LocalIdentityProvider,
  buildOidcLoginUrl,
  formatDisplayName,
  getIdentityProvider,
  isPersonalEmail,
  isTokenExpired,
  type EmailValidationResult,
  type IdentityProvider,
  type SsoRedirectOptions,
};

/**
 * @deprecated Prefer `getIdentityProvider().initiateFederatedLogin(idpHint, redirectPath)`
 * from `@/lib/auth/identity-provider`.
 */
export function keycloakLogin(idpHint?: string, redirectPath = '/dashboard'): void {
  getIdentityProvider().initiateFederatedLogin(idpHint, redirectPath);
}

/**
 * @deprecated Prefer `getIdentityProvider().logout(options)`
 * from `@/lib/auth/identity-provider`.
 */
export function keycloakLogout(options?: {
  rpLogout?: boolean;
  postLogoutRedirectUri?: string;
}): Promise<void> {
  getIdentityProvider().logout(options);
  return Promise.resolve();
}
