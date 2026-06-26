'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import { resolveBackNavigation } from '@/lib/detail-navigation';

export function useBackNavigation(fallbackHref: string, fallbackLabel: string) {
  const searchParams = useSearchParams();
  return useMemo(
    () =>
      resolveBackNavigation(searchParams, {
        href: fallbackHref,
        label: fallbackLabel,
      }),
    [searchParams, fallbackHref, fallbackLabel],
  );
}
