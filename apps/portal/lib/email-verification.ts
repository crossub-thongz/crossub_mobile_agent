import { ROUTES } from '@/constants/routes';
import type { AuthUser } from '@/lib/auth-types';
import { api } from '@/lib/api';

/** Routes that create records or start workflows — blocked until email is verified. */
export const EMAIL_VERIFICATION_BLOCKED_ROUTE_PATTERNS = [
  /^\/properties\/new(\/|$)/,
  /^\/inspections\/new(\/|$)/,
  /^\/messages\/new(\/|$)/,
  /^\/tenants\/new(\/|$)/,
  /^\/leasing\/transfer(\/|$)/,
] as const;

export const EMAIL_VERIFICATION_GATE_EXEMPT = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.PROFILE,
  ROUTES.SETTINGS,
  ROUTES.BILL,
  ROUTES.PRICING,
  ROUTES.DASHBOARD,
] as const;

export const EMAIL_VERIFICATION_BLOCK_MESSAGE =
  'Verify your email address before using this feature.';

/** Staging QA login used to exercise create flows without an inbox. */
const EMAIL_VERIFICATION_SKIP = new Set(['qa.cros.arrange.20261030@crossub.com.au']);

export function needsEmailVerification(
  user: Pick<AuthUser, 'emailVerified' | 'email'> | null | undefined,
): boolean {
  if (!user || user.emailVerified !== false) return false;
  return !EMAIL_VERIFICATION_SKIP.has(user.email.toLowerCase());
}

export function isEmailVerificationBlockedRoute(pathname: string): boolean {
  return EMAIL_VERIFICATION_BLOCKED_ROUTE_PATTERNS.some((rx) => rx.test(pathname));
}

export function isEmailVerificationBlockedHref(href: string): boolean {
  const path = href.split('?')[0]?.split('#')[0] ?? href;
  return isEmailVerificationBlockedRoute(path);
}

export function isEmailVerificationGateExempt(pathname: string): boolean {
  if (pathname.startsWith('/verify-email')) return true;
  return EMAIL_VERIFICATION_GATE_EXEMPT.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function resendVerificationEmail(): Promise<void> {
  await api.post('/auth/resend-verification-email');
}
