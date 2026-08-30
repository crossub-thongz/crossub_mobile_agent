'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

/**
 * Maintenance list hub is retired. View and create maintenance jobs on Tasks.
 * Previous filter/table UI lived in this file.
 */
export default function MaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('filter', 'Maintenance');
    const property = searchParams.get('property');
    if (property) next.set('property', property);
    router.replace(`${ROUTES.TASKS}?${next.toString()}`);
  }, [router, searchParams]);

  return null;
}
