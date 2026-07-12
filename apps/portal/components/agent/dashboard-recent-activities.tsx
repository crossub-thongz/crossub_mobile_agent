'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Activity, ChevronRight } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { notificationActivityFields } from '@/lib/notification-activity';
import { cn } from '@/lib/utils';

const MAX_ITEMS = 6;

export function DashboardRecentActivities({
  showTitle = true,
  className,
}: {
  showTitle?: boolean;
  className?: string;
}) {
  const { notifications, markNotificationRead } = useAgentData();

  const items = useMemo(
    () => [...notifications].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_ITEMS),
    [notifications],
  );

  return (
    <section className={cn('flex h-full min-h-0 flex-col', className)}>
      {showTitle ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold lg:text-base">
            <Activity className="text-primary size-4 shrink-0" />
            Recent activities
          </h2>
          <Link
            href={ROUTES.NOTIFICATIONS}
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
          >
            View all
          </Link>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center">
          <p className="text-muted-foreground text-xs">
            Portfolio updates and approvals will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-auto rounded-xl border bg-card shadow-sm min-h-0 flex-1">
          {items.map((item) => {
            const { propertyName, task, status } = notificationActivityFields(item);

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => markNotificationRead(item.id)}
                  className="flex items-center gap-3 px-3 py-3 text-sm transition hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {!item.read ? (
                        <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                      ) : null}
                      <p className="truncate font-medium">{propertyName}</p>
                    </div>
                    <p className="text-muted-foreground truncate text-xs">{task}</p>
                    <p className="text-foreground/80 truncate text-xs">{status}</p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
