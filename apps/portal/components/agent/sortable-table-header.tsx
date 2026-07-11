'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import type { SortDirection } from '@/lib/client-table-sort';
import { cn } from '@/lib/utils';

export function SortableTableHeader<T extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
  className,
}: {
  label: string;
  sortKey: T;
  activeKey: T | null;
  direction: SortDirection;
  onSort: (key: T) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className={cn(
        'px-3 py-3 font-semibold',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded text-[11px] uppercase tracking-wide transition-colors hover:text-foreground focus:outline-none',
          align === 'right' && 'ml-auto',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span>{label}</span>
        <Icon
          className={cn(
            'size-3 transition-opacity',
            isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-80',
          )}
        />
      </button>
    </th>
  );
}
