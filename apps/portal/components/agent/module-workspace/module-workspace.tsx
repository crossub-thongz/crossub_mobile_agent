'use client';

import Link from 'next/link';
import { ChevronRight, Search, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { SortableTableHeader } from '@/components/agent/sortable-table-header';
import { Input } from '@/components/ui/input';
import {
  MODULE_LANE_ALL,
  MODULE_LANE_TONE_CLASS,
  MODULE_WORKSPACE_LABELS,
  type ModuleLaneAll,
  type ModuleLaneDefinition,
  type ModuleWorkspaceCopy,
} from '@/constants/module-workspace';
import { useDesktopViewport } from '@/hooks/use-desktop-viewport';
import {
  applySortDirection,
  useClientTableSort,
  type SortDirection,
} from '@/lib/client-table-sort';
import { cn, formatDate } from '@/lib/utils';

export type ModuleWorkspaceColumn<Row, SortKey extends string> = {
  id: string;
  label: string;
  /** Omit for a static header. */
  sortKey?: SortKey;
  className?: string;
  cell: (row: Row) => ReactNode;
};

export function ModuleLanePill({
  lane,
  className,
}: {
  lane: ModuleLaneDefinition<string>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
        MODULE_LANE_TONE_CLASS[lane.tone],
        className,
      )}
    >
      {lane.label}
    </span>
  );
}

/**
 * Self-Manage desktop module page: lane chips and search across the top, a dense sortable table
 * on the left and the selected row's detail on the right. Below `lg` it is a list of cards that
 * open the existing full detail page, and the detail pane is never mounted.
 */
export function ModuleWorkspace<Row, Lane extends string, SortKey extends string>({
  copy,
  emptyIcon,
  rows,
  rowId,
  rowHref,
  rowLane,
  rowSearchText,
  lanes,
  columns,
  sortComparators,
  defaultSortKey,
  defaultSortDirection = 'desc',
  mobileRow,
  renderDetail,
}: {
  copy: ModuleWorkspaceCopy;
  emptyIcon: LucideIcon;
  rows: readonly Row[];
  rowId: (row: Row) => string;
  /** The existing full detail page — mobile taps and the detail pane's link go here. */
  rowHref: (row: Row) => string;
  rowLane: (row: Row) => Lane;
  /** Lowercased haystack for the search box. */
  rowSearchText: (row: Row) => string;
  lanes: readonly ModuleLaneDefinition<Lane>[];
  columns: readonly ModuleWorkspaceColumn<Row, SortKey>[];
  sortComparators: Record<SortKey, (a: Row, b: Row) => number>;
  defaultSortKey: SortKey;
  defaultSortDirection?: SortDirection;
  /** Card body on mobile. */
  mobileRow: (row: Row) => ReactNode;
  renderDetail: (row: Row) => ReactNode;
}) {
  const desktop = useDesktopViewport();
  const [lane, setLane] = useState<Lane | ModuleLaneAll>(MODULE_LANE_ALL);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { sortKey, sortDirection, onSort } = useClientTableSort<SortKey>(
    defaultSortKey,
    defaultSortDirection,
  );

  const laneById = useMemo(() => {
    const map = new Map<string, Lane>();
    for (const row of rows) map.set(rowId(row), rowLane(row));
    return map;
  }, [rows, rowId, rowLane]);

  const laneOptions = useMemo(() => {
    const counts = new Map<Lane, number>();
    for (const value of laneById.values()) counts.set(value, (counts.get(value) ?? 0) + 1);
    const options: { id: Lane | ModuleLaneAll; label: string }[] = [
      { id: MODULE_LANE_ALL, label: `${MODULE_WORKSPACE_LABELS.allLane} (${rows.length})` },
      ...lanes.map((l) => ({ id: l.id, label: `${l.label} (${counts.get(l.id) ?? 0})` })),
    ];
    return options;
  }, [laneById, lanes, rows.length]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const compare = sortComparators[sortKey];
    return rows
      .filter((row) => lane === MODULE_LANE_ALL || laneById.get(rowId(row)) === lane)
      .filter((row) => !q || rowSearchText(row).includes(q))
      .sort((a, b) => applySortDirection(compare(a, b), sortDirection));
  }, [lane, laneById, rowId, rowSearchText, rows, search, sortComparators, sortDirection, sortKey]);

  const selected = desktop
    ? (visible.find((row) => rowId(row) === selectedId) ?? visible[0] ?? null)
    : null;
  const selectedRowId = selected ? rowId(selected) : null;

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setSelectedId(id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:px-6 lg:py-4">
      <p className="text-muted-foreground hidden text-sm lg:block">{copy.description}</p>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative lg:w-72 lg:shrink-0">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder={copy.searchPlaceholder}
            className="h-9 rounded-lg pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <FilterChips options={laneOptions} value={lane} onChange={setLane} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className="flex min-h-0 flex-1 gap-4">
          <section className="scrollbar-subtle min-h-0 min-w-0 flex-1 overflow-y-auto lg:rounded-xl lg:border lg:bg-card">
            {visible.length === 0 ? (
              <p className="text-muted-foreground px-4 py-10 text-center text-sm">
                {copy.noMatchTitle}
              </p>
            ) : (
              <>
                <table className="hidden w-full table-fixed border-collapse text-sm lg:table">
                  <thead className="bg-card sticky top-0 z-10 border-b">
                    <tr>
                      {columns.map((column) =>
                        column.sortKey ? (
                          <SortableTableHeader
                            key={column.id}
                            label={column.label}
                            sortKey={column.sortKey}
                            activeKey={sortKey}
                            direction={sortDirection}
                            onSort={(key) => onSort(key)}
                            className={column.className}
                          />
                        ) : (
                          <th
                            key={column.id}
                            className={cn(
                              'text-muted-foreground px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide',
                              column.className,
                            )}
                          >
                            {column.label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => {
                      const id = rowId(row);
                      const isSelected = id === selectedRowId;
                      return (
                        <tr
                          key={id}
                          tabIndex={0}
                          aria-selected={isSelected}
                          onClick={() => setSelectedId(id)}
                          onKeyDown={(event) => onRowKeyDown(event, id)}
                          className={cn(
                            'border-border/60 cursor-pointer border-b outline-none transition-colors last:border-b-0',
                            'hover:bg-secondary/40 focus-visible:bg-secondary/50',
                            isSelected && 'bg-primary/[0.06] hover:bg-primary/[0.08]',
                          )}
                        >
                          {columns.map((column) => (
                            <td
                              key={column.id}
                              className={cn('min-w-0 overflow-hidden px-3 py-2 align-middle', column.className)}
                            >
                              {column.cell(row)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <ul className="space-y-2 lg:hidden">
                  {visible.map((row) => (
                    <li key={rowId(row)}>
                      <Link
                        href={rowHref(row)}
                        className="hover:bg-secondary/40 flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition active:bg-secondary/60"
                      >
                        <div className="min-w-0 flex-1">{mobileRow(row)}</div>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {desktop ? (
            <aside className="scrollbar-subtle min-h-0 w-[400px] shrink-0 overflow-y-auto rounded-xl border bg-card xl:w-[460px]">
              {selected ? (
                <div key={selectedRowId}>{renderDetail(selected)}</div>
              ) : (
                <p className="text-muted-foreground px-4 py-10 text-center text-sm">
                  {copy.detailPlaceholder}
                </p>
              )}
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}

/** One-line cell text with the full value on hover. */
export function ModuleCellText({
  children,
  muted,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn('block truncate', muted && 'text-muted-foreground', className)}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  );
}

/** Table / summary date: medium date, or a dash when the job has none. */
export function formatModuleDate(iso: string | null | undefined): string {
  return iso ? formatDate(iso) : MODULE_WORKSPACE_LABELS.noValue;
}
