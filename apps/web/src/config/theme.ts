/**
 * Centralized Visual Theme & Design Token Configuration
 *
 * Separates visual styling (colors, gradients, spacing, typography, shadows,
 * border radius, and CSS custom property maps) from organisation identity
 * assets in `./branding.ts`.
 */

import type { CSSProperties } from 'react';
import { isOrgTemplateEnabled } from './features';

export interface ThemePalette {
  bg: string;
  bg2: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  border2: string;
  text: string;
  text2: string;
  muted: string;
  primary: string;
  primary2: string;
  cyan: string;
  purple: string;
  green: string;
  amber: string;
  red: string;
}

export interface AuthCardTokens {
  cardBg: string;
  surfaceBg: string;
  borderColor: string;
  primaryBlue: string;
  linkColor: string;
  textColor: string;
  mutedColor: string;
  placeholderColor: string;
}

export interface ThemeGradients {
  authBackdrop: string;
  authPrimaryButton: string;
  avatarBadge: string;
}

export interface ThemeSpacing {
  sidebarWidth: string;
  sidebarCollapsedWidth: string;
  topBarHeight: string;
  authCardPadding: string;
  authCardMaxWidth: string;
}

export interface ThemeTypography {
  fontSans: string;
  fontMono: string;
  authHeadingSize: string;
  authBodySize: string;
}

export interface ThemeShadows {
  card: string;
  authCard: string;
  authPrimaryButton: string;
}

export interface ThemeRadii {
  card: string;
  authCard: string;
  input: string;
  button: string;
  pill: string;
}

export interface OrgThemeConfig {
  enabled: boolean;
  colors: {
    dark: ThemePalette;
    light: ThemePalette;
    auth: AuthCardTokens;
  };
  gradients: ThemeGradients;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  shadows: ThemeShadows;
  radii: ThemeRadii;
}

export const ORG_THEME_TOKENS: Omit<OrgThemeConfig, 'enabled'> = {
  colors: {
    dark: {
      bg: '#08101f',
      bg2: '#0c1629',
      surface: '#101d35',
      surface2: '#152442',
      surface3: '#1c2f54',
      border: '#1f3158',
      border2: '#2a4173',
      text: '#e6eefc',
      text2: '#9fb0cf',
      muted: '#6c7fa3',
      primary: '#2f7bff',
      primary2: '#1b5fd9',
      cyan: '#06b6d4',
      purple: '#8b5cf6',
      green: '#10b981',
      amber: '#f59e0b',
      red: '#ef4444',
    },
    light: {
      bg: '#f2f5fb',
      bg2: '#eaf0fa',
      surface: '#ffffff',
      surface2: '#f6f8fd',
      surface3: '#edf2fb',
      border: '#dfe6f4',
      border2: '#c9d5ec',
      text: '#0d1b33',
      text2: '#42526e',
      muted: '#7483a3',
      primary: '#2563eb',
      primary2: '#1d4ed8',
      cyan: '#0891b2',
      purple: '#7c3aed',
      green: '#059669',
      amber: '#d97706',
      red: '#dc2626',
    },
    auth: {
      cardBg: '#0c1627',
      surfaceBg: '#101d33',
      borderColor: '#1e2d47',
      primaryBlue: '#2563eb',
      linkColor: '#3b82f6',
      textColor: '#f1f5f9',
      mutedColor: '#8b9bb4',
      placeholderColor: '#64748b',
    },
  },
  gradients: {
    authBackdrop:
      'linear-gradient(135deg, #0e7490 0%, #0f766e 35%, #15803d 70%, #16a34a 100%)',
    authPrimaryButton:
      'linear-gradient(90deg, #1e6fb8 0%, #1aa5a0 50%, #22c55e 100%)',
    avatarBadge: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  },
  spacing: {
    sidebarWidth: '15rem',
    sidebarCollapsedWidth: '4rem',
    topBarHeight: '3.5rem',
    authCardPadding: '30px 30px 28px',
    authCardMaxWidth: '460px',
  },
  typography: {
    fontSans:
      "var(--font-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    fontMono:
      "var(--font-mono, 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)",
    authHeadingSize: '20px',
    authBodySize: '13px',
  },
  shadows: {
    card: '0 10px 30px -12px rgba(0, 0, 0, 0.55)',
    authCard: '0 24px 60px -18px rgba(0, 0, 0, 0.6)',
    authPrimaryButton: '0 8px 20px -8px rgba(34, 197, 94, 0.5)',
  },
  radii: {
    card: '12px',
    authCard: '24px',
    input: '12px',
    button: '12px',
    pill: '9999px',
  },
};

export function getOrgThemeConfig(): OrgThemeConfig {
  return {
    enabled: isOrgTemplateEnabled(),
    ...ORG_THEME_TOKENS,
  };
}

/**
 * Returns CSS custom properties for the authentication shell from centralized
 * theme tokens so components do not hardcode colour literals inline.
 */
export function getAuthThemeCssVars(): CSSProperties {
  const { colors } = getOrgThemeConfig();
  return {
    '--a-card': colors.auth.cardBg,
    '--a-surf': colors.auth.surfaceBg,
    '--a-bd': colors.auth.borderColor,
    '--a-blue': colors.auth.primaryBlue,
    '--a-link': colors.auth.linkColor,
    '--a-text': colors.auth.textColor,
    '--a-muted': colors.auth.mutedColor,
    '--a-mute2': colors.auth.placeholderColor,
  } as CSSProperties;
}
