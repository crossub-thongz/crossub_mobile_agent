'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { DataSourceBadge } from '@/components/agent/data-source-badge';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { formatDateTime } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approval', label: 'Approval' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'unread', label: 'Unread' },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const { notifications, markNotificationRead, markAllNotificationsRead, apiConnected } =
    useAgentData();

  const list = useMemo(() => {
    let items = [...notifications];
    if (filter === 'approval') items = items.filter((n) => n.type === 'approval');
    if (filter === 'urgent') items = items.filter((n) => n.type === 'urgent');
    if (filter === 'unread') items = items.filter((n) => !n.read);
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [filter, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AgentShell title="Notifications">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <DataSourceBadge source={apiConnected ? 'api' : 'demo'} />
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={markAllNotificationsRead}
            >
              Mark all read ({unreadCount})
            </Button>
          )}
        </div>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        {list.length === 0 ? (
          <EmptyState
            title="No notifications"
            description={
              filter === 'unread'
                ? "You're all caught up."
                : 'Alerts for approvals and urgent items will appear here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {list.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => markNotificationRead(n.id)}
                className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.read && <span className="bg-primary size-2 rounded-full" />}
                      <DataSourceBadge source={n.source} />
                      {n.type === 'approval' && (
                        <StatusBadge label="Approval" variant="approval" />
                      )}
                      {n.type === 'urgent' && (
                        <StatusBadge label="Urgent" priority="urgent" />
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {n.propertyAddress}
                    </p>
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-muted-foreground text-xs">{n.body}</p>
                    <p className="text-primary text-xs font-medium">{n.status}</p>
                    {n.actionRequired && (
                      <p className="text-primary text-xs font-medium">{n.actionRequired}</p>
                    )}
                    <p className="text-muted-foreground text-[11px]">
                      {formatDateTime(n.at)}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
