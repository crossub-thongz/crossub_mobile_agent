'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function AgentNotificationBell({
  unreadCount,
  className,
  iconClassName,
}: {
  unreadCount: number;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Link
      href={ROUTES.NOTIFICATIONS}
      className={cn(
        'text-muted-foreground hover:bg-secondary relative flex size-9 items-center justify-center rounded-lg transition',
        className,
      )}
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
    >
      <Bell className={cn('size-5', iconClassName)} />
      {unreadCount > 0 && (
        <span className="bg-primary absolute top-1 right-1 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-background">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
