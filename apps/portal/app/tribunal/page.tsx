'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

/**
 * Tribunal list hub is retired. View and create tribunal jobs on Tasks.
 * Previous table UI lived in this file.
 */
export default function TribunalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('filter', 'Tribunal');
    const property = searchParams.get('property');
    if (property) next.set('property', property);
    router.replace(`${ROUTES.TASKS}?${next.toString()}`);
  }, [router, searchParams]);

  return null;
}
