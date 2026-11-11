/**
 * Provider-Agnostic Identity Provider Abstraction Layer
 *
 * Separates:
 * 1. Identity Provider (`LocalIdentityProvider`, `ExternalOidcIdentityProvider`,
 *    `KeycloakIdentityProvider`, or future Entra ID / Okta / Auth0 / Cognito adapters)
 * 2. Application Session (`authApi` / `services/api` JWT issuance)
 * 3. Authorization (Server-side RBAC in `services/api`)
 *
 * All OIDC redirects, PKCE challenges, JWKS signature verification, and JWT
 * issuance are mediated by `services/api` (`/auth/oidc/*` and `/api/v1/auth/*`).
 * Zero admin credentials or direct IdP admin API calls exist in the browser.
 */

import '../crypto-polyfill';
import { getAuthConfig } from '@/config/auth';
import type { ConfiguredIdpType } from '@/config/features';
import {
  authApi,
  type AuthUser,
  type LoginResult,
  type MfaChallenge,
} from '@/lib/api';

export interface SsoRedirectOptions {
  redirectPath?: string;
  idpHint?: string;
  provider?: 'oidc' | 'saml';
}

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  reason?: string;
}

export type AuthTelemetryEvent =
  | 'auth.provider_selected'
  | 'auth.login_started'
  | 'auth.login_succeeded'
  | 'auth.login_mfa_challenged'
  | 'auth.login_failed'
  | 'auth.sso_redirect_initiated'
  | 'auth.sso_handoff_completed'
  | 'auth.sso_handoff_failed'
  | 'auth.logout';

/**
 * Emits a structured, secret-free client-side authentication telemetry event.
 * Never receives or logs passwords, access tokens, refresh tokens, or secrets.
 */
export function emitAuthEvent(
  event: AuthTelemetryEvent,
  metadata: Record<string, string | boolean | undefined> = {},
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('aisoc:auth-telemetry', {
        detail: {
          event,
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      }),
    );
  } catch {
    // Telemetry is best-effort and must never interrupt authentication.
  }
}

export interface IdentityProvider {
  readonly id: ConfiguredIdpType;
  /**
   * Validates whether an email address is permitted by corporate domain policy.
   */
  validateEmail(email: string): EmailValidationResult;
  /**
   * Authenticates with email & password via the backend auth endpoint
   * (`POST /api/v1/auth/login`), supporting MFA challenges.
   */
  loginWithPassword(email: string, password: string): Promise<LoginResult | MfaChallenge>;
  /**
   * Builds the backend-mediated SSO login URL (`/auth/oidc/login` or `/auth/saml/login`)
   * with optional upstream IdP hint (`kc_idp_hint`, e.g. `google` for 1-click SSO).
   */
  buildSsoLoginUrl(options?: SsoRedirectOptions): string;
  /**
   * Redirects the browser to the backend OIDC/SAML endpoint.
   */
  initiateSsoLogin(options?: SsoRedirectOptions): void;
  /**
   * Initiates federated / social SSO login via the backend OIDC Relying Party
   * using a provider-neutral interface.
   */
  initiateFederatedLogin(idpHint?: string, redirectPath?: string): void;
  /**
   * Consumes the `#access_token=...` fragment returned by `/auth/oidc/callback`
   * and verifies the session against `GET /api/v1/auth/me`.
   */
  completeSsoHandoff(): Promise<boolean>;
  /**
   * Returns the currently authenticated user from application session storage.
   */
  currentUser(): AuthUser | null;
  /**
   * Clears local session state and optionally triggers RP-initiated OIDC logout.
   */
  logout(options?: { rpLogout?: boolean; postLogoutRedirectUri?: string }): void;
}

export function formatDisplayName(firstName?: string, lastName?: string, fallbackName?: string): string {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  if (f && l && f.toLowerCase() === l.toLowerCase()) {
    return f;
  }
  const combined = [f, l].filter(Boolean).join(' ').trim();
  if (combined) {
    const parts = combined.split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      return parts[0];
    }
    return combined;
  }
  if (fallbackName) {
    const parts = fallbackName.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      return parts[0];
    }
    return fallbackName;
  }
  return 'User';
}

export function isPersonalEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const cfg = getAuthConfig();
  if (!cfg.blockPersonalEmails) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim() ?? '';
  return cfg.disallowedEmailDomains.includes(domain);
}

export function buildOidcLoginUrl(options: SsoRedirectOptions = {}): string {
  const cfg = getAuthConfig();
  const provider = options.provider ?? 'oidc';
  const redirectPath = options.redirectPath || '/dashboard';
  const base = cfg.apiBase.replace(/\/+$/, '');
  const endpoint = provider === 'saml' ? `${base}/auth/saml/login` : `${base}/auth/oidc/login`;
  const params = new URLSearchParams({
    redirect: redirectPath,
  });
  if (provider === 'oidc' && options.idpHint) {
    params.set('kc_idp_hint', options.idpHint.trim());
  }
  return `${endpoint}?${params.toString()}`;
}

export class LocalIdentityProvider implements IdentityProvider {
  readonly id: ConfiguredIdpType = 'local';

  validateEmail(email: string): EmailValidationResult {
    const trimmed = email.trim();
    if (!trimmed) {
      const msg = 'Please enter your email address.';
      return { valid: false, error: msg, reason: msg };
    }
    if (isPersonalEmail(trimmed)) {
      const msg =
        'Personal email accounts (@gmail.com, @yahoo.com, etc.) are prohibited. Please use your company email.';
      return { valid: false, error: msg, reason: msg };
    }
    return { valid: true };
  }

  async loginWithPassword(email: string, password: string): Promise<LoginResult | MfaChallenge> {
    const check = this.validateEmail(email);
    if (!check.valid) {
      emitAuthEvent('auth.login_failed', { provider: this.id, reason: 'email_policy_rejected' });
      throw new Error(check.error);
    }
    emitAuthEvent('auth.login_started', { provider: this.id, method: 'password' });
    try {
      const result = await authApi.login(email.trim(), password);
      if ('mfa_required' in result || 'mfa_enrollment_required' in result) {
        emitAuthEvent('auth.login_mfa_challenged', { provider: this.id });
      } else {
        emitAuthEvent('auth.login_succeeded', { provider: this.id, method: 'password' });
      }
      return result;
    } catch (err) {
      emitAuthEvent('auth.login_failed', { provider: this.id, method: 'password' });
      throw err;
    }
  }

  buildSsoLoginUrl(options: SsoRedirectOptions = {}): string {
    return buildOidcLoginUrl(options);
  }

  initiateSsoLogin(options: SsoRedirectOptions = {}): void {
    if (typeof window === 'undefined') return;
    emitAuthEvent('auth.sso_redirect_initiated', {
      provider: options.provider ?? 'oidc',
      hasIdpHint: Boolean(options.idpHint),
    });
    window.location.assign(this.buildSsoLoginUrl(options));
  }

  initiateFederatedLogin(idpHint?: string, redirectPath = '/dashboard'): void {
    const cfg = getAuthConfig();
    this.initiateSsoLogin({
      redirectPath,
      idpHint: idpHint ?? cfg.ssoIdpHint,
      provider: this.id === 'saml' ? 'saml' : 'oidc',
    });
  }

  async completeSsoHandoff(): Promise<boolean> {
    const ok = await authApi.completeSsoHandoff();
    emitAuthEvent(ok ? 'auth.sso_handoff_completed' : 'auth.sso_handoff_failed', {
      provider: this.id,
    });
    return ok;
  }

  currentUser(): AuthUser | null {
    return authApi.currentUser();
  }

  logout(options?: { rpLogout?: boolean; postLogoutRedirectUri?: string }): void {
    emitAuthEvent('auth.logout', {
      provider: this.id,
      rpLogout: Boolean(options?.rpLogout),
    });
    authApi.logout();
    if (options?.rpLogout && typeof window !== 'undefined') {
      const cfg = getAuthConfig();
      const base = cfg.apiBase.replace(/\/+$/, '');
      const target = options.postLogoutRedirectUri || '/login';
      window.location.assign(
        `${base}/auth/oidc/logout?post_logout_redirect_uri=${encodeURIComponent(target)}`,
      );
    }
  }
}

/**
 * Provider-neutral External OIDC / SAML Identity Provider (supports Keycloak,
 * Microsoft Entra ID / Azure AD, Okta, Auth0, AWS Cognito, and generic OIDC).
 */
export class ExternalOidcIdentityProvider extends LocalIdentityProvider {
  override readonly id: ConfiguredIdpType;

  constructor(providerId: ConfiguredIdpType = 'oidc') {
    super();
    this.id = providerId;
  }
}

export class KeycloakIdentityProvider extends ExternalOidcIdentityProvider {
  override readonly id = 'keycloak' as const;

  constructor() {
    super('keycloak');
  }

  initiateGoogleSso(redirectPath = '/dashboard'): void {
    const cfg = getAuthConfig();
    this.initiateFederatedLogin(cfg.ssoIdpHint, redirectPath);
  }
}

export function getIdentityProvider(): IdentityProvider {
  const cfg = getAuthConfig();
  let provider: IdentityProvider;
  if (cfg.idpProvider === 'keycloak' || cfg.keycloakEnabled) {
    provider = new KeycloakIdentityProvider();
  } else if (cfg.idpProvider === 'oidc' || cfg.idpProvider === 'saml') {
    provider = new ExternalOidcIdentityProvider(cfg.idpProvider);
  } else {
    provider = new LocalIdentityProvider();
  }
  emitAuthEvent('auth.provider_selected', { provider: provider.id });
  return provider;
}
