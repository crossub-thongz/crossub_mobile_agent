'use client';

import Link from 'next/link';
import { Bell, ChevronRight, UserRound } from 'lucide-react';

import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
import { messagesForProperty } from '@/constants/routes';
import {
  propertyPhoneBookInitials,
  propertyPhoneBookSubtitle,
} from '@/lib/property-phone-book';
import type { Property } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

const STATUS_STYLES: Record<Property['leaseStatus'], string> = {
  active: 'bg-primary/15 text-primary',
  periodic: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  vacating: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  vacant: 'bg-muted text-muted-foreground',
};

export function PropertyListCard({
  property,
  messageUnread = 0,
  needActionCount = 0,
  href,
}: {
  property: Property;
  messageUnread?: number;
  needActionCount?: number;
  href: string;
}) {
  const subtitle = propertyPhoneBookSubtitle(property);
  const initials = propertyPhoneBookInitials(property);
  const hasNeedAction = needActionCount > 0;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card transition-all',
        hasNeedAction
          ? 'border-primary/25 shadow-sm shadow-primary/5'
          : 'border-border hover:border-primary/20 hover:shadow-md hover:shadow-primary/5',
      )}
    >
      <Link
        href={messagesForProperty(property.id)}
        className={cn(
          'hover:bg-secondary/60 absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-lg transition-colors',
          messageUnread > 0
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label={
          messageUnread > 0
            ? `${messageUnread} unread message${messageUnread === 1 ? '' : 's'} for this property`
            : 'View messages for this property'
        }
        title="Messages"
      >
        <Bell className="size-5" strokeWidth={2} />
        {messageUnread > 0 ? (
          <span className="bg-[#fa5151] pointer-events-none absolute top-0 right-0 flex min-w-[1.125rem] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {messageUnread > 99 ? '99+' : messageUnread}
          </span>
        ) : null}
      </Link>

      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-3.5 pr-12 active:scale-[0.99]"
      >
        <div
          className="bg-primary/10 text-primary relative flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tabular-nums"
          aria-hidden
        >
          {initials}
          {hasNeedAction ? (
            <MessageUnreadBadge
              count={needActionCount}
              size="sm"
              className="absolute -top-1 -right-1 ring-2 ring-background"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 pr-6">
            <span
              className={cn(
                'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                STATUS_STYLES[property.leaseStatus],
              )}
            >
              {property.leaseStatus}
            </span>
          </div>
          <p
            className={cn(
              'mt-1 leading-snug',
              hasNeedAction ? 'font-bold' : 'font-semibold',
            )}
          >
            {property.address}
          </p>
          <p className="text-muted-foreground truncate text-xs">{property.suburb}</p>
          <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
            <UserRound className="size-3 shrink-0 opacity-70" aria-hidden />
            <span>{subtitle}</span>
            {property.rentWeekly > 0 ? (
              <>
                <span className="opacity-40">·</span>
                <span className="text-foreground/80 tabular-nums">
                  {formatCurrency(property.rentWeekly)}/wk
                </span>
              </>
            ) : null}
          </p>
        </div>

        <ChevronRight className="text-muted-foreground size-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    </div>
  );
}
