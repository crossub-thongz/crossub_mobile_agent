'use client';

import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export function toggleSortKey<T extends string>(
  currentKey: T | null,
  currentDirection: SortDirection,
  nextKey: T,
  defaultDirection: SortDirection = 'asc',
): { key: T; direction: SortDirection } {
  if (currentKey === nextKey) {
    return { key: nextKey, direction: currentDirection === 'asc' ? 'desc' : 'asc' };
  }
  return { key: nextKey, direction: defaultDirection };
}

export function parseSortTime(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function compareSortTime(a?: string | null, b?: string | null): number {
  return parseSortTime(a) - parseSortTime(b);
}

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}

export function applySortDirection(value: number, direction: SortDirection): number {
  return direction === 'asc' ? value : -value;
}

export function useClientTableSort<T extends string>(
  defaultKey: T,
  defaultDirection: SortDirection = 'desc',
) {
  const [sortKey, setSortKey] = useState<T>(defaultKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const onSort = useCallback(
    (key: T, defaultDir: SortDirection = key === defaultKey ? defaultDirection : 'asc') => {
      const next = toggleSortKey(sortKey, sortDirection, key, defaultDir);
      setSortKey(next.key);
      setSortDirection(next.direction);
    },
    [defaultDirection, defaultKey, sortDirection, sortKey],
  );

  return useMemo(
    () => ({ sortKey, sortDirection, onSort }),
    [onSort, sortDirection, sortKey],
  );
}
