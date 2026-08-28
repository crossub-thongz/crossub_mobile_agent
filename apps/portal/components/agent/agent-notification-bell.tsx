'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { StatusBadge } from '@/components/agent/status-badge';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentNotificationDialog } from '@/components/providers/agent-notification-dialog-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ROUTES } from '@/constants/routes';
import { agentNotificationDisplay } from '@/lib/notification-activity';
import { notificationMatchesPrefs } from '@/lib/notification-prefs';
import { useAgentStore } from '@/lib/store';
import type { AgentNotification } from '@/lib/types';
import { cn, formatRelative } from '@/lib/utils';

import '@/components/agent/agent-notification-popover.css';

const PANEL_LIMIT = 12;

export function AgentNotificationBell({
  unreadCount: unreadCountProp,
  className,
  iconClassName,
  badgeClassName,
}: {
  unreadCount?: number;
  className?: string;
  iconClassName?: string;
  badgeClassName?: string;
}) {
  const router = useRouter();
  const isV2 = useIsAgentUiV2();
  const [open, setOpen] = useState(false);
  const prefs = useAgentStore((s) => s.notificationPrefs);
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } =
    useAgentData();
  const { openNotification } = useAgentNotificationDialog();

  const unreadCount = unreadCountProp ?? unreadNotificationCount;

  const panelItems = useMemo(() => {
    const visible = notifications.filter((n) => notificationMatchesPrefs(n, prefs));
    return [...visible]
      .sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return b.at.localeCompare(a.at);
      })
      .slice(0, PANEL_LIMIT);
  }, [notifications, prefs]);

  const handleOpenNotification = (notification: AgentNotification) => {
    markNotificationRead(notification.id);
    setOpen(false);
    const opened = openNotification(notification);
    if (!opened) router.push(notification.href);
  };

  const handleDismissAll = () => {
    markAllNotificationsRead();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-muted-foreground hover:bg-secondary relative flex size-9 items-center justify-center rounded-lg transition',
            className,
          )}
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
        >
          <Bell className={cn('size-5', iconClassName)} />
          {unreadCount > 0 ? (
            <span
              className={cn(
                'bg-primary absolute top-1 right-1 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-background',
                badgeClassName,
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          'agent-notification-popover relative w-[min(calc(100vw-1.5rem),22rem)] overflow-hidden rounded-2xl border p-0 shadow-xl',
          isV2 ? 'v2-frosted-surface' : 'bg-card/95 backdrop-blur-xl',
        )}
      >
        <div className="agent-notification-popover__header flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Notifications</p>
            {unreadCount > 0 ? (
              <p className="text-muted-foreground text-xs">{unreadCount} unread</p>
            ) : (
              <p className="text-muted-foreground text-xs">You&apos;re all caught up</p>
            )}
          </div>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleDismissAll}
              className="text-primary hover:bg-primary/10 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
            >
              Dismiss all
            </button>
          ) : null}
        </div>

        <div className="agent-notification-popover__list scrollbar-subtle max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain">
          {panelItems.length === 0 ? (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {panelItems.map((notification) => {
                const display = agentNotificationDisplay(notification);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className={cn(
                        'agent-notification-popover__item hover:bg-muted/40 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                        !notification.read && 'agent-notification-popover__item--unread',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          notification.read ? 'bg-transparent' : 'bg-primary',
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 flex flex-wrap items-center gap-1.5">
                          {notification.type === 'approval' ? (
                            <StatusBadge label="Approval" variant="approval" />
                          ) : null}
                          {notification.type === 'urgent' ? (
                            <StatusBadge label="Urgent" priority="urgent" />
                          ) : null}
                        </span>
                        <span className="block text-sm font-semibold leading-snug">
                          {display.title}
                        </span>
                        <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs leading-relaxed">
                          {display.body}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-[10px]">
                          {formatRelative(notification.at)}
                        </span>
                      </span>
                      <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0 opacity-50" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="agent-notification-popover__footer border-t px-4 py-2.5">
          <Link
            href={ROUTES.NOTIFICATIONS}
            onClick={() => setOpen(false)}
            className="text-primary flex items-center justify-center gap-1 text-xs font-semibold hover:underline"
          >
            View all notifications
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
