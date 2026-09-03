'use client';

import { useLayoutEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { resolveBackNavigation } from '@/lib/detail-navigation';
import {
  peekPortalPreviousPath,
  portalLocation,
  recordPortalPath,
  resolvePortalBackTarget,
} from '@/lib/portal-navigation';

export function usePortalBackNavigation(
  fallbackHref?: string,
  fallbackLabel = 'Back',
): { href: string; label: string } | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = portalLocation(pathname, searchParams.toString());
  const [previousPath, setPreviousPath] = useState<string | null>(() =>
    peekPortalPreviousPath(currentPath),
  );

  useLayoutEffect(() => {
    recordPortalPath(currentPath);
    setPreviousPath(peekPortalPreviousPath(currentPath));
  }, [currentPath]);

  return useMemo(() => {
    const contextual = resolveBackNavigation(searchParams, { href: '', label: '' });
    return resolvePortalBackTarget({
      pathname,
      searchParams,
      previousPath,
      fallbackHref,
      fallbackLabel,
      fromHref: contextual.href || null,
      fromLabel: contextual.label || null,
    });
  }, [fallbackHref, fallbackLabel, pathname, previousPath, searchParams]);
}
