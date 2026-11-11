import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOrgBrandingConfig } from '@/config/branding';
import { getAuthThemeCssVars, getOrgThemeConfig } from '@/config/theme';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, isTokenExpired } from '@/lib/api';
import {
  ExternalOidcIdentityProvider,
  KeycloakIdentityProvider,
  LocalIdentityProvider,
  buildOidcLoginUrl,
  formatDisplayName,
  getIdentityProvider,
  isPersonalEmail,
} from './identity-provider';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('Provider-Agnostic IdentityProvider & Theme/Branding Separation', () => {
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

  it('selects LocalIdentityProvider, ExternalOidcIdentityProvider, or KeycloakIdentityProvider via config', () => {
    vi.stubEnv('NEXT_PUBLIC_KEYCLOAK_ENABLED', 'false');
    vi.stubEnv('NEXT_PUBLIC_IDP_PROVIDER', '');
    expect(getIdentityProvider()).toBeInstanceOf(LocalIdentityProvider);
    expect(getIdentityProvider().id).toBe('local');

    vi.stubEnv('NEXT_PUBLIC_IDP_PROVIDER', 'oidc');
    expect(getIdentityProvider()).toBeInstanceOf(ExternalOidcIdentityProvider);
    expect(getIdentityProvider().id).toBe('oidc');

    vi.stubEnv('NEXT_PUBLIC_IDP_PROVIDER', 'saml');
    expect(getIdentityProvider()).toBeInstanceOf(ExternalOidcIdentityProvider);
    expect(getIdentityProvider().id).toBe('saml');

    vi.stubEnv('NEXT_PUBLIC_IDP_PROVIDER', '');
    vi.stubEnv('NEXT_PUBLIC_KEYCLOAK_ENABLED', 'true');
    expect(getIdentityProvider()).toBeInstanceOf(KeycloakIdentityProvider);
    expect(getIdentityProvider().id).toBe('keycloak');
  });

  it('constructs backend-mediated OIDC and SAML login URLs with optional IdP hint', () => {
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

  it('separates branding assets from visual theme tokens', () => {
    const branding = getOrgBrandingConfig();
    expect(branding.logoDarkPath).toBe('/assets/logo-dark.png');
    expect(branding.logoLightPath).toBe('/assets/logo-light.png');
    expect(branding.faviconPath).toBe('/favicon.ico');
    expect(branding.logoAlt).toContain('Logo');

    const theme = getOrgThemeConfig();
    expect(theme.colors.dark.bg).toBe('#08101f');
    expect(theme.colors.light.bg).toBe('#f2f5fb');
    expect(theme.colors.auth.cardBg).toBe('#0c1627');
    expect(theme.gradients.authBackdrop).toContain('linear-gradient');

    const cssVars = getAuthThemeCssVars() as Record<string, string>;
    expect(cssVars['--a-card']).toBe('#0c1627');
    expect(cssVars['--a-blue']).toBe('#2563eb');
  });

  it('emits structured secret-free auth telemetry events and clears storage on logout', () => {
    const events: Array<{ event: string }> = [];
    const handler = (e: Event) => {
      events.push((e as CustomEvent).detail);
    };
    window.addEventListener('aisoc:auth-telemetry', handler);

    const valid = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(valid)).toBe(false);
    window.localStorage.setItem(AUTH_TOKEN_KEY, valid);
    window.localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify({ id: 'u1', email: 'ops@company.example' }),
    );

    const provider = getIdentityProvider();
    provider.logout();

    window.removeEventListener('aisoc:auth-telemetry', handler);
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_USER_KEY)).toBeNull();
    expect(events.some((ev) => ev.event === 'auth.logout')).toBe(true);
  });
});
