import type { AuthUser } from '@/lib/auth-types';
import { hasLocalAccessCookie } from '@/lib/local-auth';

const PROVISION_ROLES = new Set(['ACCOUNT_MANAGER', 'ACCOUNT_MANAGER_FULL']);

export function canProvisionTenant(user: AuthUser | null): boolean {
  if (!user) return false;
  if (hasLocalAccessCookie()) return false;
  return PROVISION_ROLES.has(user.role);
}

export function provisionTenantBlockReason(user: AuthUser | null): string | null {
  if (!user) {
    return 'Sign in with a CROSSUB Account Manager account to create tenant logins.';
  }
  if (hasLocalAccessCookie()) {
    return 'Local-only registration cannot provision tenants. Sign out, then sign in with an Account Manager account from the shared API (not Register).';
  }
  if (!PROVISION_ROLES.has(user.role)) {
    return `Your account role is ${user.role}. Only Account Manager (ACCOUNT_MANAGER) can create tenant logins — sign in as manager1@crossub.local or another Account Manager user.`;
  }
  return null;
}
