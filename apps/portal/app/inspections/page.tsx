'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';

/**
 * Inspections list hub is retired. View and create inspection jobs on Tasks.
 * Previous InspectionsHub UI lived in this file.
 */
export default function InspectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('filter', 'Inspection');
    const property = searchParams.get('property');
    if (property) next.set('property', property);
    router.replace(`${ROUTES.TASKS}?${next.toString()}`);
  }, [router, searchParams]);

  return null;
}
