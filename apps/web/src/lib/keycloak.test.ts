import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  KeycloakIdentityProvider,
  LocalIdentityProvider,
  buildOidcLoginUrl,
  formatDisplayName,
  getIdentityProvider,
  isPersonalEmail,
  isTokenExpired,
  keycloakLogout,
} from './keycloak';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('Enterprise IdentityProvider & Keycloak OIDC adapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('formats display names and collapses duplicate first/last names', () => {
    expect(formatDisplayName('Admin', 'Admin')).toBe('Admin');
    expect(formatDisplayName('Sarath', 'S')).toBe('Sarath S');
    expect(formatDisplayName('', '', 'ops@company.example')).toBe('ops@company.example');
    expect(formatDisplayName()).toBe('User');
  });

  it('blocks personal webmail domains and permits corporate domains via centralized config', () => {
    expect(isPersonalEmail('analyst@gmail.com')).toBe(true);
    expect(isPersonalEmail('user@yahoo.com')).toBe(true);
    expect(isPersonalEmail('user@outlook.com')).toBe(true);
    expect(isPersonalEmail('analyst@company.example')).toBe(false);
    expect(isPersonalEmail('secops@cyble.com')).toBe(false);
  });

  it('allows overriding disallowed email domains via NEXT_PUBLIC_DISALLOWED_EMAIL_DOMAINS', () => {
    vi.stubEnv('NEXT_PUBLIC_DISALLOWED_EMAIL_DOMAINS', 'blocked.example,other.example');
    expect(isPersonalEmail('user@blocked.example')).toBe(true);
    expect(isPersonalEmail('user@gmail.com')).toBe(false);
  });

  it('selects LocalIdentityProvider by default and KeycloakIdentityProvider when NEXT_PUBLIC_KEYCLOAK_ENABLED=true', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYCLOAK_ENABLED', 'false');
    expect(getIdentityProvider()).toBeInstanceOf(LocalIdentityProvider);
    expect(getIdentityProvider().id).toBe('local');

    vi.stubEnv('NEXT_PUBLIC_KEYCLOAK_ENABLED', 'true');
    expect(getIdentityProvider()).toBeInstanceOf(KeycloakIdentityProvider);
    expect(getIdentityProvider().id).toBe('keycloak');
  });

  it('constructs backend-mediated OIDC login URLs with optional kc_idp_hint', () => {
    expect(buildOidcLoginUrl({ redirectPath: '/alerts' })).toBe(
      '/auth/oidc/login?redirect=%2Falerts',
    );
    expect(buildOidcLoginUrl({ redirectPath: '/dashboard', idpHint: 'google' })).toBe(
      '/auth/oidc/login?redirect=%2Fdashboard&kc_idp_hint=google',
    );
    expect(buildOidcLoginUrl({ redirectPath: '/cases', provider: 'saml' })).toBe(
      '/auth/saml/login?redirect=%2Fcases',
    );
  });

  it('rejects personal emails in IdentityProvider.validateEmail before making network calls', async () => {
    const provider = getIdentityProvider();
    const check = provider.validateEmail('personal@gmail.com');
    expect(check.valid).toBe(false);
    expect(check.error).toMatch(/personal email/i);

    await expect(provider.loginWithPassword('personal@gmail.com', 'Secret123!')).rejects.toThrow(
      /personal email/i,
    );
  });

  it('detects expired tokens and clears session storage on keycloakLogout', async () => {
    const expired = makeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });
    const valid = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(expired)).toBe(true);
    expect(isTokenExpired(valid)).toBe(false);

    window.localStorage.setItem(AUTH_TOKEN_KEY, valid);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: 'u1', email: 'ops@company.example' }));
    await keycloakLogout();
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });
});
