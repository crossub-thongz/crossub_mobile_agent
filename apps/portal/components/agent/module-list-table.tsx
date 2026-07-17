'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Children, cloneElement, isValidElement, useCallback, type ReactNode, type SyntheticEvent } from 'react';

import { SortableTableHeader } from '@/components/agent/sortable-table-header';
import type { SortDirection } from '@/lib/client-table-sort';
import { cn } from '@/lib/utils';

export type ModuleTableColumn<T extends string> =
  | { kind: 'static'; label: string; align?: 'left' | 'right' }
  | {
      kind: 'sortable';
      label: string;
      sortKey: T;
      align?: 'left' | 'right';
      defaultDirection?: SortDirection;
    };

export function ModuleListTable({
  minWidth = 720,
  children,
}: {
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function ModuleTableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
        {columns.map((col) => (
          <th
            key={col}
            className={cn(
              'px-3 py-3 font-semibold',
              col === '' && 'w-10 text-right',
            )}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function ModuleSortableTableHead<T extends string>({
  columns,
  sortKey,
  sortDirection,
  onSort,
}: {
  columns: ModuleTableColumn<T>[];
  sortKey: T;
  sortDirection: SortDirection;
  onSort: (key: T, defaultDirection?: SortDirection) => void;
}) {
  return (
    <thead>
      <tr className="border-b bg-muted/30">
        {columns.map((col, index) => {
          if (col.kind === 'static') {
            return (
              <th
                key={`static-${index}`}
                className={cn(
                  'px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.label === '' && 'w-10',
                )}
              >
                {col.label}
              </th>
            );
          }
          return (
            <SortableTableHeader
              key={col.sortKey}
              label={col.label}
              sortKey={col.sortKey}
              activeKey={sortKey}
              direction={sortDirection}
              onSort={(key) => onSort(key, col.defaultDirection)}
              align={col.align}
            />
          );
        })}
      </tr>
    </thead>
  );
}

function shouldIgnoreRowActivate(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, a, input, select, textarea, [data-row-action]'));
}

function mergeRowActivateHandlers(
  activate: (event: SyntheticEvent) => void,
  existing?: (event: SyntheticEvent) => void,
) {
  return (event: SyntheticEvent) => {
    existing?.(event);
    activate(event);
  };
}

function enhanceInteractiveCells(
  children: ReactNode,
  activate: (event: SyntheticEvent) => void,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    if (child.type === 'td') {
      const cell = child as React.ReactElement<React.TdHTMLAttributes<HTMLTableCellElement>>;
      return cloneElement(cell, {
        onClick: mergeRowActivateHandlers(activate, cell.props.onClick),
        className: cn('touch-manipulation', cell.props.className),
      });
    }

    return child;
  });
}

/** Full-row activation for list tables (reliable on touch / tablet). */
export function ModuleInteractiveTableRow({
  onActivate,
  selected,
  className,
  children,
}: {
  onActivate?: () => void;
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const activate = useCallback(
    (event: SyntheticEvent) => {
      if (!onActivate) return;
      if (shouldIgnoreRowActivate(event.target)) return;
      onActivate();
    },
    [onActivate],
  );

  if (!onActivate) {
    return (
      <tr className={cn('transition-colors hover:bg-muted/20', className)}>{children}</tr>
    );
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      aria-selected={selected || undefined}
      className={cn(
        'cursor-pointer touch-manipulation transition-colors hover:bg-muted/20',
        selected && 'bg-primary/5',
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      {enhanceInteractiveCells(children, activate)}
    </tr>
  );
}

export function ModuleTableLinkCell({
  href,
  children,
  className,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <td className={cn('px-3 py-3', className)}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className="text-left font-medium leading-snug text-foreground hover:text-primary"
        >
          {children}
        </button>
      </td>
    );
  }

  return (
    <td className={cn('px-3 py-3', className)}>
      <Link href={href!} className="font-medium leading-snug text-foreground hover:text-primary">
        {children}
      </Link>
    </td>
  );
}

export function ModuleTableChevronCell({
  href,
  onClick,
}: {
  href?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className="text-muted-foreground inline-flex hover:text-primary"
          aria-label="Open case"
        >
          <ChevronRight className="size-4" />
        </button>
      </td>
    );
  }

  return (
    <td className="px-3 py-3 text-right">
      <Link href={href!} className="text-muted-foreground inline-flex hover:text-primary">
        <ChevronRight className="size-4" />
      </Link>
    </td>
  );
}
