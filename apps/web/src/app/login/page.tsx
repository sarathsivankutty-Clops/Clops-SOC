'use client';

/**
 * Desktop console login.
 *
 * Email + password against ``POST /api/v1/auth/login`` and enterprise OIDC/SAML
 * SSO via ``/auth/oidc/login`` for the console. The mobile responder PWA at
 * ``/responder/login`` uses passkeys; this page is the desktop counterpart.
 *
 * Demo credentials live in `services/api/app/api/v1/dev_auth.py`:
 *   demo@example.com / aisoc-demo
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getAuthConfig } from '@/config/auth';
import { getOrgBrandingConfig } from '@/config/branding';
import { getAuthThemeCssVars } from '@/config/theme';
import {
  authApi,
  isMfaChallenge,
  mfaApi,
  onboardingApi,
  type MfaChallenge,
  type MfaEnrollment,
} from '@/lib/api';
import { getIdentityProvider } from '@/lib/auth/identity-provider';
import { isDemoMode } from '@/lib/demoMode';

type Phase = 'idle' | 'pending' | 'success' | 'error';
type AuthTab = 'signin' | 'signup';

export const dynamic = 'force-dynamic';

// Supplied by the build, never written here. Next inlines NEXT_PUBLIC_* into
// the client bundle wherever they are referenced, so a literal in this module
// would put a working login pair into every image the project ships —
// including one built with demo mode off for somebody's own deployment.
// Gating the *render* on isDemoMode() hides the panel; it does not remove the
// strings. Only the demo build passes these.
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_AUTOLOGIN_EMAIL?.trim() ?? '';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_AUTOLOGIN_PASSWORD?.trim() ?? '';
const HAS_DEMO_CREDENTIALS = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="g-ico" aria-hidden="true" style={{ strokeWidth: 0 }}>
    <path
      fill="#4285F4"
      d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
    />
    <path
      fill="#34A853"
      d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7A21.99 21.99 0 0 0 24 46z"
    />
    <path
      fill="#FBBC05"
      d="M11.69 28.18A13.2 13.2 0 0 1 11 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
    />
    <path
      fill="#EA4335"
      d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.94 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
    />
  </svg>
);

const MailIcon = () => (
  <svg className="ai-ico" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const LockIcon = () => (
  <svg className="ai-ico" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg className="ai-ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const EyeBtn = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button
    type="button"
    className="ai-eye"
    aria-label={on ? 'Hide password' : 'Show password'}
    onClick={onClick}
    style={on ? { color: 'var(--a-link)' } : undefined}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/**
 * Sanitize the ``?next=`` redirect target so a crafted link can't be used to
 * bounce an authenticated user to an attacker-controlled host.
 *
 * Only same-origin relative paths are allowed. Anything that looks like an
 * absolute URL (``http://``, ``//evil.com``), a JS scheme, or a path that
 * doesn't start with a single ``/`` is replaced with the dashboard default.
 */
function sanitizeNext(raw: string | null | undefined): string {
  const fallback = '/dashboard';
  if (!raw) return fallback;
  if (raw.startsWith('//') || raw.startsWith('\\\\')) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('/\\')) return fallback;
  return raw;
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = sanitizeNext(search?.get('next'));
  const branding = getOrgBrandingConfig();
  const authThemeVars = getAuthThemeCssVars();
  const authConfig = getAuthConfig();
  const identityProvider = getIdentityProvider();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sso, setSso] = useState<{
    sso_enabled: boolean;
    provider: string;
    login_label: string;
    local_login_enabled: boolean;
  } | null>(null);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  const [enrolment, setEnrolment] = useState<MfaEnrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  // An SSO round-trip lands here with the session in the fragment; consume
  // it before the stored-token redirect below can read a still-empty store.
  const [handoffPending] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('access_token='),
  );
  useEffect(() => {
    if (!handoffPending) return;
    identityProvider.completeSsoHandoff().then((ok) => {
      if (ok) router.replace(next);
      else
        setError(
          'The SSO sign-in could not be completed. Try again or sign in with your password.',
        );
    });
  }, [handoffPending, identityProvider, next, router]);

  useEffect(() => {
    if (authApi.isAuthenticated()) {
      router.replace(next);
    }
  }, [next, router]);

  useEffect(() => {
    let alive = true;
    authApi.ssoStatus().then((s) => {
      if (alive) setSso(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Where to send someone after they sign in.
   *
   * Never throws. Failing to work out where to land is not a reason to
   * fail a sign-in that already succeeded.
   */
  async function landingRoute(requested: string): Promise<string> {
    if (requested && requested !== '/dashboard') return requested;
    try {
      const status = await onboardingApi.status();
      return status.first_run ? '/onboarding' : requested || '/dashboard';
    } catch {
      return requested || '/dashboard';
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (phase === 'pending') return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    // Validate corporate email domain unless signing in with the seeded demo account
    const isDemoAccount = Boolean(DEMO_EMAIL && trimmedEmail === DEMO_EMAIL);
    if (!isDemoAccount) {
      const emailCheck = identityProvider.validateEmail(trimmedEmail);
      if (!emailCheck.valid) {
        setError(
          emailCheck.reason ??
            'Personal email accounts are prohibited. Please use your corporate email.',
        );
        return;
      }
    }

    setPhase('pending');
    setError(null);

    try {
      const result = isDemoAccount
        ? await authApi.login(trimmedEmail, password)
        : await identityProvider.loginWithPassword(trimmedEmail, password);
      if (isMfaChallenge(result)) {
        setChallenge(result);
        setPhase('idle');
        return;
      }
      setPhase('success');
      router.replace(await landingRoute(next));
    } catch (err) {
      console.error('[login] failed', err);
      setPhase('error');
      const message = err instanceof Error ? err.message : 'Login failed.';
      if (/401|incorrect/i.test(message)) {
        setError('Email or password incorrect.');
      } else {
        setError(message);
      }
    }
  };

  const submitSignUp = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedName = signUpName.trim();
    const trimmedEmail = signUpEmail.trim().toLowerCase();

    if (!trimmedName) {
      setError('Full name is required.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError('Enter a valid company email address.');
      return;
    }
    const emailCheck = identityProvider.validateEmail(trimmedEmail);
    if (!emailCheck.valid) {
      setError(
        emailCheck.reason ??
          'Personal email accounts are prohibited. Please use your corporate email.',
      );
      return;
    }

    // User provisioning is strictly backend-mediated via OIDC JIT provisioning
    // (/auth/oidc/callback -> complete_sso_login) so Identity Provider admin
    // credentials are never exposed to the browser.
    identityProvider.initiateFederatedLogin(authConfig.ssoIdpHint, next);
  };

  const beginEnrolment = async () => {
    if (!challenge || phase === 'pending') return;
    setPhase('pending');
    setError(null);
    try {
      setEnrolment(await mfaApi.enrollBegin(challenge.mfa_token));
      setPhase('idle');
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Could not start enrolment.');
    }
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!challenge || phase === 'pending') return;
    setPhase('pending');
    setError(null);
    try {
      if (enrolment) {
        const confirmed = await mfaApi.enrollConfirm(code.trim(), challenge.mfa_token);
        setRecoveryCodes(confirmed.recovery_codes);
        if (confirmed.access_token) {
          await authApi.adoptSession(confirmed.access_token, confirmed.refresh_token ?? '');
        }
        setPhase('success');
        return;
      }
      await authApi.completeMfa(challenge.mfa_token, code.trim());
      setPhase('success');
      router.replace(await landingRoute(next));
    } catch (err) {
      setPhase('error');
      const message = err instanceof Error ? err.message : 'Verification failed.';
      setError(
        /expired/i.test(message)
          ? 'That sign-in attempt expired. Enter your password again.'
          : 'That code is not valid. Check your authenticator, or use a recovery code.',
      );
    }
  };

  const useDemo = () => {
    setTab('signin');
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  const switchTab = (nextTab: AuthTab) => {
    setError(null);
    setTab(nextTab);
  };

  return (
    <div className="auth-body" style={authThemeVars}>
      <main className="auth-wrap">
        <div className="auth-card">
          {/* Organisation Brand Logo */}
          <div className="auth-logo-wrap">
            {branding.enabled ? (
              <Link href="/" aria-label="Back to home">
                <img
                  src={branding.logoDarkPath}
                  alt={branding.logoAlt}
                  className="auth-logo-img"
                  data-testid="org-login-logo"
                />
              </Link>
            ) : (
              <Link
                href="/"
                className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition"
                aria-label="Back to AiSOC home"
              >
                <svg
                  className="w-8 h-8 text-fg-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </Link>
            )}
          </div>

          {/* Demo banner — demo mode only, and only when the build supplied credentials */}
          {isDemoMode() && HAS_DEMO_CREDENTIALS && (
            <div className="mb-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-indigo-300">Public demo</p>
                  <p className="text-xs text-fg-secondary mt-0.5">
                    <code>{DEMO_EMAIL}</code> / <code>{DEMO_PASSWORD}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={useDemo}
                  className="shrink-0 rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/30 transition"
                >
                  Use demo
                </button>
              </div>
            </div>
          )}

          {/* Second factor challenge replaces the password form once accepted */}
          {challenge ? (
            <form
              onSubmit={submitCode}
              className="space-y-4"
              noValidate
              data-testid="mfa-challenge"
            >
              <div className="rounded-xl border border-surface-border bg-surface-card/60 px-4 py-3 text-sm text-fg-primary">
                {challenge.mfa_enrollment_required
                  ? 'Your organisation requires a second factor and this account has not set one up yet. Finish setting it up to sign in.'
                  : 'Enter the 6-digit code from your authenticator app, or one of your recovery codes.'}
              </div>

              {challenge.mfa_enrollment_required && !enrolment ? (
                <button
                  type="button"
                  onClick={beginEnrolment}
                  disabled={phase === 'pending'}
                  className="auth-submit"
                >
                  {phase === 'pending' ? 'Preparing…' : 'Set up two-factor authentication'}
                </button>
              ) : (
                <>
                  {enrolment ? (
                    <div className="rounded-xl border border-surface-border bg-surface-card/60 px-4 py-3 space-y-2">
                      <p className="text-xs text-fg-secondary">
                        Add this key to your authenticator app, then enter the code it shows.
                      </p>
                      <code className="block break-all rounded-lg bg-surface-base px-3 py-2 text-xs tracking-wider text-indigo-300">
                        {enrolment.secret}
                      </code>
                      <a
                        href={enrolment.otpauth_uri}
                        className="inline-block text-xs text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
                      >
                        Open in your authenticator app
                      </a>
                    </div>
                  ) : null}

                  {recoveryCodes ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-2">
                      <p className="text-xs font-medium text-amber-300">
                        Save these recovery codes. They are shown once.
                      </p>
                      <ul className="grid grid-cols-2 gap-1 font-mono text-[11px] text-fg-primary">
                        {recoveryCodes.map((rc) => (
                          <li key={rc}>{rc}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <label className="auth-field">
                    <span className="auth-label">Verification code</span>
                    <span className="auth-input">
                      <input
                        type="text"
                        autoComplete="one-time-code"
                        inputMode="text"
                        autoCapitalize="characters"
                        spellCheck={false}
                        autoFocus
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        disabled={phase === 'pending'}
                        required
                      />
                    </span>
                  </label>

                  {recoveryCodes ? (
                    <button
                      type="button"
                      onClick={async () => router.replace(await landingRoute(next))}
                      className="auth-submit"
                    >
                      I have saved my recovery codes — continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={phase === 'pending' || !code}
                      className="auth-submit"
                    >
                      {phase === 'pending' ? 'Verifying…' : enrolment ? 'Confirm' : 'Verify'}
                    </button>
                  )}
                </>
              )}

              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setChallenge(null);
                  setCode('');
                  setError(null);
                  setPassword('');
                  setEnrolment(null);
                  setRecoveryCodes(null);
                }}
                className="w-full text-xs text-fg-muted hover:text-fg-primary underline-offset-2 hover:underline"
              >
                Start over
              </button>
            </form>
          ) : (
            <>
              <div className="auth-tabs" role="tablist">
                <button
                  type="button"
                  className={`auth-tab${tab === 'signin' ? ' on' : ''}`}
                  role="tab"
                  aria-selected={tab === 'signin'}
                  onClick={() => switchTab('signin')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab${tab === 'signup' ? ' on' : ''}`}
                  role="tab"
                  aria-selected={tab === 'signup'}
                  onClick={() => switchTab('signup')}
                >
                  Sign Up
                </button>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-xs text-red-300 flex items-start gap-2"
                >
                  <span aria-hidden="true">⚠️</span>
                  <span className="flex-1">{error}</span>
                </div>
              ) : null}

              {sso?.sso_enabled && (
                <div className="mb-4">
                  <a
                    href={identityProvider.buildSsoLoginUrl({
                      redirectPath: next,
                      provider: sso.provider === 'saml' ? 'saml' : 'oidc',
                    })}
                    className="auth-google"
                    data-testid="sso-login-button"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 12.75v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                    {sso.login_label || 'Continue with SSO'}
                  </a>
                </div>
              )}

              {tab === 'signin' ? (
                <form onSubmit={submit} className="auth-form" noValidate>
                  <div className="auth-head">
                    <h1>Welcome Back</h1>
                    <p>Sign in to your account</p>
                  </div>

                  <label className="auth-field">
                    <span className="auth-label">Email</span>
                    <span className="auth-input">
                      <MailIcon />
                      <input
                        type="email"
                        name="email"
                        autoComplete="username"
                        inputMode="email"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={phase === 'pending'}
                        required
                      />
                    </span>
                  </label>

                  <label className="auth-field">
                    <span className="auth-label">Password</span>
                    <span className="auth-input">
                      <LockIcon />
                      <input
                        type={showPw ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={phase === 'pending'}
                        required
                      />
                      <EyeBtn on={showPw} onClick={() => setShowPw((prev) => !prev)} />
                    </span>
                  </label>

                  <div className="auth-row">
                    <label className="auth-check">
                      <input type="checkbox" name="remember" defaultChecked />
                      <span className="box" />
                      Remember me
                    </label>
                    <Link href="/responder/login" className="auth-link">
                      Use passkey / responder PWA
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={phase === 'pending' || !email || !password}
                    className="auth-submit"
                  >
                    <span>{phase === 'pending' ? 'Signing in…' : 'Sign in'}</span>
                    <ArrowIcon />
                  </button>

                  <div className="auth-or">
                    <span>OR</span>
                  </div>

                  <button
                    type="button"
                    className="auth-google"
                    data-testid="google-sso-button"
                    onClick={() =>
                      identityProvider.initiateFederatedLogin(authConfig.ssoIdpHint, next)
                    }
                  >
                    <GoogleIcon /> Sign in with Google
                  </button>

                  <p className="auth-switch">
                    Don&rsquo;t have an account?{' '}
                    <button type="button" onClick={() => switchTab('signup')}>
                      Sign up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={submitSignUp} className="auth-form" noValidate>
                  <div className="auth-head">
                    <h1>Create Your Account</h1>
                    <p>Sign up with your corporate identity</p>
                  </div>

                  <label className="auth-field">
                    <span className="auth-label">Full Name</span>
                    <span className="auth-input">
                      <UserIcon />
                      <input
                        type="text"
                        name="name"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="Jane Doe"
                        autoComplete="name"
                        required
                      />
                    </span>
                  </label>

                  <label className="auth-field">
                    <span className="auth-label">Company Email Address</span>
                    <span className="auth-input">
                      <MailIcon />
                      <input
                        type="email"
                        name="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="you@company.com"
                        autoComplete="email"
                        required
                      />
                    </span>
                    <span className="auth-note">
                      Use your company email. Personal email domains are prohibited.
                    </span>
                  </label>

                  <button type="submit" className="auth-submit">
                    <span>Continue with Corporate SSO</span>
                    <ArrowIcon />
                  </button>

                  <div className="auth-or">
                    <span>OR</span>
                  </div>

                  <button
                    type="button"
                    className="auth-google"
                    onClick={() =>
                      identityProvider.initiateFederatedLogin(authConfig.ssoIdpHint, next)
                    }
                  >
                    <GoogleIcon /> Sign up with Google
                  </button>

                  <p className="auth-switch">
                    Already have an account?{' '}
                    <button type="button" onClick={() => switchTab('signin')}>
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
