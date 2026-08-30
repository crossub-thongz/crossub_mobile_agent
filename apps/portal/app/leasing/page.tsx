'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

/**
 * Leasing list hub is retired. View and create leasing jobs on Tasks.
 * Previous table UI lived in this file (new leasing / transfer / rent review / end leasing).
 */
export default function LeasingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('filter', 'Leasing');
    const property = searchParams.get('property');
    if (property) next.set('property', property);
    router.replace(`${ROUTES.TASKS}?${next.toString()}`);
  }, [router, searchParams]);

  return null;
}
