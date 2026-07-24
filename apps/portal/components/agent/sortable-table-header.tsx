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
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className={cn(
        'px-2 py-2.5 font-semibold lg:px-3 lg:py-3',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded text-[11px] uppercase tracking-wide transition-colors hover:text-foreground focus:outline-none',
          align === 'center' && 'mx-auto',
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
