'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ROUTES } from '@/constants/routes';
import { usePortalBackNavigation } from '@/hooks/use-portal-back-navigation';
import { cn } from '@/lib/utils';

/** App home — no back control (shows logo on mobile instead). */
export function isShellHomePath(pathname: string): boolean {
  return pathname === ROUTES.DASHBOARD;
}

function parentRouteFallback(pathname: string): { href: string; label: string } | null {
  if (pathname.startsWith('/properties/')) {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 2) {
      return { href: ROUTES.PROPERTIES, label: 'Properties' };
    }
    if (segments.length >= 3) {
      return { href: `/properties/${segments[1]}`, label: 'Property' };
    }
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return pathname === ROUTES.DASHBOARD ? null : { href: ROUTES.DASHBOARD, label: 'Dashboard' };
  }

  return { href: `/${segments.slice(0, -1).join('/')}`, label: 'Back' };
}

export function ShellBackButton({
  backHref,
  backLabel = 'Back',
  className,
  showLogoOnHome = true,
}: {
  backHref?: string;
  backLabel?: string;
  className?: string;
  /** Mobile header: show logo on dashboard instead of an empty slot. */
  showLogoOnHome?: boolean;
}) {
  const pathname = usePathname();
  const parent = parentRouteFallback(pathname);
  const target = usePortalBackNavigation(
    backHref || parent?.href,
    backHref ? backLabel : parent?.label ?? backLabel,
  );

  if (isShellHomePath(pathname)) {
    return showLogoOnHome ? <CrossubLogo size="sm" /> : null;
  }

  if (!target) return null;

  return (
    <Link
      href={target.href}
      className={cn(
        'text-primary flex shrink-0 items-center gap-0.5 text-sm font-medium',
        className,
      )}
    >
      <ChevronLeft className="size-4" />
      {target.label}
    </Link>
  );
}
