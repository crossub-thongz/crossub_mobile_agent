'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { resolveBackNavigation } from '@/lib/detail-navigation';
import { resolvePortalBackTarget } from '@/lib/portal-navigation';

export function usePortalBackNavigation(
  fallbackHref?: string,
  fallbackLabel = 'Back',
): { href: string; label: string } | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(() => {
    const contextual = resolveBackNavigation(searchParams, { href: '', label: '' });
    return resolvePortalBackTarget({
      pathname,
      searchParams,
      fallbackHref,
      fallbackLabel,
      fromHref: contextual.href || null,
      fromLabel: contextual.label || null,
    });
  }, [fallbackHref, fallbackLabel, pathname, searchParams]);
}
