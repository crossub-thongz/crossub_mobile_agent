'use client';

import Link from 'next/link';
import { ChevronRight, UserRound } from 'lucide-react';

import { MessageUnreadBadge } from '@/components/agent/message-unread-badge';
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
  href,
}: {
  property: Property;
  messageUnread?: number;
  href: string;
}) {
  const subtitle = propertyPhoneBookSubtitle(property);
  const initials = propertyPhoneBookInitials(property);

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-2xl border bg-card px-3 py-3.5 transition-all active:scale-[0.99]',
        messageUnread > 0
          ? 'border-primary/25 shadow-sm shadow-primary/5'
          : 'border-border hover:border-primary/20 hover:shadow-md hover:shadow-primary/5',
      )}
    >
      <div
        className="bg-primary/10 text-primary relative flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tabular-nums"
        aria-hidden
      >
        {initials}
        {messageUnread > 0 ? (
          <MessageUnreadBadge
            count={messageUnread}
            size="sm"
            className="absolute -top-1 -right-1 ring-2 ring-background"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
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
            messageUnread > 0 ? 'font-bold' : 'font-semibold',
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

      <div className="flex shrink-0 items-center gap-2">
        <ChevronRight className="text-muted-foreground size-4 transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}
