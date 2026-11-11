/**
 * Centralized Organisation Branding Configuration
 *
 * Contains ONLY identity & brand asset paths (organization name, logos,
 * favicon, and alt text). Visual design tokens (colors, gradients, spacing,
 * typography, shadows, and radii) live in `./theme.ts`.
 *
 * Uses relative public asset paths by default and allows environment-variable
 * overrides so deployments on local dev, Docker Compose, AWS EC2, or a CDN
 * require zero source code changes.
 */

import { isOrgTemplateEnabled } from './features';

export interface OrgBrandingConfig {
  enabled: boolean;
  orgName: string;
  platformSubtitle: string;
  logoDarkPath: string;
  logoLightPath: string;
  logoAlt: string;
  faviconPath: string;
}

export function getOrgBrandingConfig(): OrgBrandingConfig {
  const orgName = process.env.NEXT_PUBLIC_ORG_NAME?.trim() || 'CLOPS-SOC';
  return {
    enabled: isOrgTemplateEnabled(),
    orgName,
    platformSubtitle:
      process.env.NEXT_PUBLIC_ORG_SUBTITLE?.trim() ||
      'Sign in to CLOPS-SOC Platform',
    logoDarkPath: process.env.NEXT_PUBLIC_ORG_LOGO_DARK?.trim() || '/assets/logo-dark.png',
    logoLightPath: process.env.NEXT_PUBLIC_ORG_LOGO_LIGHT?.trim() || '/assets/logo-light.png',
    logoAlt: process.env.NEXT_PUBLIC_ORG_LOGO_ALT?.trim() || `${orgName} Logo`,
    faviconPath: process.env.NEXT_PUBLIC_ORG_FAVICON?.trim() || '/favicon.ico',
  };
}
