'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AskCrosButton, CrosNameText, FromCrosMark } from '@/components/agent/cros-notification-parts';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { StatusBadge } from '@/components/agent/status-badge';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentNotificationDialog } from '@/components/providers/agent-notification-dialog-provider';
import { agentNotificationDisplay } from '@/lib/notification-activity';
import { cn, formatDateTime } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approval', label: 'Approval' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'unread', label: 'Unread' },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const router = useRouter();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAgentData();
  const { openNotification } = useAgentNotificationDialog();

  const handleOpen = (notification: (typeof notifications)[number]) => {
    markNotificationRead(notification.id);
    const opened = openNotification(notification);
    if (!opened) router.push(notification.href);
  };

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
        <div className="flex items-center justify-end gap-2">
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
            {list.map((n) => {
              const display = agentNotificationDisplay(n);
              return (
              <div
                key={n.id}
                className={cn(
                  'relative rounded-xl border bg-card p-4',
                  n.fromCros && 'border-primary/30',
                )}
              >
                {/* The whole card opens it; the Cros name and Ask button sit above and take their own taps. */}
                <button
                  type="button"
                  onClick={() => handleOpen(n)}
                  aria-label={display.title}
                  className="absolute inset-0 rounded-xl active:bg-secondary/50"
                />
                <div className="pointer-events-none relative flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.read && <span className="bg-primary size-2 rounded-full" />}
                      {n.fromCros && <FromCrosMark />}
                      {n.type === 'approval' && (
                        <StatusBadge label="Approval" variant="approval" />
                      )}
                      {n.type === 'urgent' && (
                        <StatusBadge label="Urgent" priority="urgent" />
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug">{display.title}</p>
                    {display.address && (
                      <p className="text-muted-foreground text-xs">{display.address}</p>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <CrosNameText text={display.body} />
                    </p>
                    {n.actionRequired && (
                      <p className="text-primary text-xs font-medium">{n.actionRequired}</p>
                    )}
                    <p className="text-muted-foreground text-[12px]">
                      {formatDateTime(n.at)}
                    </p>
                    {n.fromCros && (
                      <AskCrosButton
                        notification={n}
                        onAsk={() => markNotificationRead(n.id)}
                        className="mt-1"
                      />
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
