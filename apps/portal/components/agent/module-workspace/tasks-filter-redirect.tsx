'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import type { NeedActionCategory } from '@/lib/types';

/**
 * The retired job hubs (`/maintenance`, `/inspections`, `/leasing`) send every tier except
 * Self-Manage to Tasks, filtered to the module and keeping a `property` filter.
 */
export function TasksFilterRedirect({ filter }: { filter: NeedActionCategory }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('filter', filter);
    const property = searchParams.get('property');
    if (property) next.set('property', property);
    router.replace(`${ROUTES.TASKS}?${next.toString()}`);
  }, [filter, router, searchParams]);

  return null;
}
