'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useMemo } from 'react';

import { CrossubLogo } from '@/components/brand/crossub-logo';
import { ROUTES } from '@/constants/routes';
import { resolveBackNavigation } from '@/lib/detail-navigation';
import { cn } from '@/lib/utils';

/** App home — no back control (shows logo on mobile instead). */
export function isShellHomePath(pathname: string): boolean {
  return pathname === ROUTES.DASHBOARD;
}

function parentRouteFallback(pathname: string): { href: string; label: string } | null {
  if (pathname === ROUTES.PROPERTIES) {
    return { href: ROUTES.DASHBOARD, label: 'Dashboard' };
  }

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const target = useMemo(() => {
    if (backHref) {
      return { kind: 'link' as const, href: backHref, label: backLabel };
    }

    const contextual = resolveBackNavigation(searchParams, { href: '', label: '' });
    if (contextual.href) {
      return { kind: 'link' as const, href: contextual.href, label: contextual.label };
    }

    const parent = parentRouteFallback(pathname);
    if (parent) {
      return { kind: 'link' as const, href: parent.href, label: parent.label };
    }

    return { kind: 'history' as const, label: backLabel };
  }, [backHref, backLabel, pathname, searchParams]);

  if (isShellHomePath(pathname)) {
    return showLogoOnHome ? <CrossubLogo size="sm" /> : null;
  }

  const styles = cn(
    'text-primary flex shrink-0 items-center gap-0.5 text-sm font-medium',
    className,
  );

  if (target.kind === 'link') {
    return (
      <Link href={target.href} className={styles}>
        <ChevronLeft className="size-4" />
        {target.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={styles}>
      <ChevronLeft className="size-4" />
      {target.label}
    </button>
  );
}
