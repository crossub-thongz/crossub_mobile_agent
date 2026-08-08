'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { isPublicRoute, propertyNew, ROUTES } from '@/constants/routes';
import {
  needsPasswordChange,
  needsSystemAccessAgreement,
} from '@/lib/system-access-agreement';

const HIDDEN_ROUTES = [
  ROUTES.SYSTEM_ACCESS_AGREEMENT,
  ROUTES.CHANGE_PASSWORD,
  ROUTES.AGREEMENTS,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.BILLING_OVERDUE,
] as const;

function isHiddenRoute(pathname: string): boolean {
  if (isPublicRoute(pathname)) return true;
  if (pathname === propertyNew() || pathname.startsWith(`${propertyNew()}?`)) return true;
  return HIDDEN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Persistent nudge until the agent adds their first property to the portfolio. */
export function AddFirstPropertyBanner() {
  const pathname = usePathname();
  const { user, status } = useAuth();
  const { properties, loading, hasFullManagementAccess } = useAgentData();

  if (status !== 'authed' || !user) return null;
  if (needsSystemAccessAgreement(user) || needsPasswordChange(user)) return null;
  if (!pathname || isHiddenRoute(pathname)) return null;
  if (loading) return null;
  if (properties.length > 0) return null;

  const title = hasFullManagementAccess
    ? 'Add your first property'
    : 'Add a property to get started';
  const description = hasFullManagementAccess
    ? 'Your account is ready — add a property to start managing landlords, tenants, and workflows.'
    : 'Your account is ready — add a property address so you can order inspections and tribunal support.';

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm leading-relaxed"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{description}</p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href={propertyNew()}>
            <Plus className="size-3.5" />
            Add property
          </Link>
        </Button>
      </div>
    </div>
  );
}
