'use client';

import { useLayoutEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { portalLocation, recordPortalPath } from '@/lib/portal-navigation';

/** Records the in-app path so Back can return to the page the user actually came from. */
export function PortalNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = portalLocation(pathname, searchParams.toString());

  useLayoutEffect(() => {
    recordPortalPath(currentPath);
  }, [currentPath]);

  return null;
}
