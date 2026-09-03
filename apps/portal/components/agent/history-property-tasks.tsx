'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import { TaskListV2Table } from '@/components/agent/tasks/task-list-v2-table';
import type { ArchivedPropertyTaskGroup } from '@/lib/task-list-v2';
import { cn } from '@/lib/utils';

function PropertyTaskGroupCard({ group }: { group: ArchivedPropertyTaskGroup }) {
  const [open, setOpen] = useState(false);
  const taskCount = group.rows.length;

  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm" data-tour="history-task-group">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-full px-4 py-3.5 text-left transition hover:bg-muted/40 md:px-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{group.propertyAddress}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {taskCount} closed task{taskCount === 1 ? '' : 's'}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </button>
      {open ? (
        taskCount === 0 ? (
          <p className="text-muted-foreground border-t px-4 py-3 text-sm md:px-5">
            No tasks were stored for this property.
          </p>
        ) : (
          <div className="border-t">
            <div className="space-y-2 p-3 md:hidden">
              {group.rows.map((row) => (
                <Link
                  key={row.id}
                  href={row.href}
                  className="block rounded-xl border bg-muted/10 p-3"
                >
                  <p className="truncate text-sm font-medium">{row.task.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {row.typeLabel} · {row.statusLabel}
                  </p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <TaskListV2Table rows={group.rows} hideProperty framed={false} />
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}

export function HistoryPropertyTasksList({ groups }: { groups: ArchivedPropertyTaskGroup[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <PropertyTaskGroupCard key={group.property.id} group={group} />
      ))}
    </div>
  );
}
