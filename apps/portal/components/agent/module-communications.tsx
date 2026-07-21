'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, Mail, MessageSquare, Plus } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, messagesNew } from '@/constants/routes';
import type { MessageCategory } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

function channelLabel(channel: 'app' | 'email' | 'mixed'): string {
  if (channel === 'mixed') return 'App & email';
  return channel === 'email' ? 'Email' : 'App message';
}

export function ModuleCommunications({
  propertyId,
  categories,
  title = 'Emails & messages',
  emptyHint,
}: {
  propertyId?: string;
  categories: MessageCategory[];
  title?: string;
  emptyHint?: string;
}) {
  const { messages, ensureMessageThread } = useAgentData();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () =>
      messages.filter((m) => {
        const cat = m.messageCategory ?? m.taskType;
        const categoryMatch =
          categories.includes(cat as MessageCategory) ||
          categories.some((c) => cat?.toLowerCase().includes(c.toLowerCase()));
        if (!categoryMatch) return false;
        if (propertyId) return m.propertyId === propertyId;
        return true;
      }),
    [categories, messages, propertyId],
  );

  const unreadTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.unread > 0 ? item.unread : 0), 0),
    [items],
  );

  const latestItem = items[0];

  const startThread = () => {
    if (!propertyId) {
      window.location.href = messagesNew();
      return;
    }
    const threadId = ensureMessageThread(propertyId, {
      category: categories[0],
      subject: `${categories[0]} — ${propertyId}`,
    });
    if (threadId) window.location.href = messageDetail(threadId);
  };

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="hover:bg-secondary/30 -mx-1 flex min-w-0 flex-1 items-start gap-2 rounded-lg px-1 py-0.5 text-left transition md:pointer-events-none md:cursor-default md:hover:bg-transparent"
        >
          <ChevronDown
            className={cn(
              'text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform md:hidden',
              open && 'rotate-180',
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px] md:hidden">
              {open
                ? `${items.length} message${items.length === 1 ? '' : 's'}`
                : latestItem
                  ? latestItem.subject
                  : emptyHint ?? 'No emails or messages yet'}
            </p>
            <p className="text-muted-foreground mt-0.5 hidden text-[11px] md:block">
              {items.length} message{items.length === 1 ? '' : 's'}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {unreadTotal > 0 ? (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {unreadTotal}
            </span>
          ) : null}
          <button
            type="button"
            onClick={startThread}
            className="text-primary flex items-center gap-1 text-xs font-medium"
          >
            <Plus className="size-3.5" />
            New
          </button>
        </div>
      </div>

      <div className={cn('px-4 pb-4', !open && 'hidden md:block')}>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {emptyHint ?? 'No emails or messages for this module yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((m) => (
              <Link
                key={m.id}
                href={messageDetail(m.id)}
                className="block rounded-lg border bg-secondary/20 px-3 py-2.5 text-xs transition hover:border-primary/30"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  {m.channel === 'email' ? (
                    <Mail className="text-muted-foreground size-3" />
                  ) : (
                    <MessageSquare className="text-muted-foreground size-3" />
                  )}
                  <span className="font-medium">{channelLabel(m.channel)}</span>
                  {m.unread > 0 && (
                    <span className="bg-destructive ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {m.unread}
                    </span>
                  )}
                </div>
                <p className="font-medium">{m.subject}</p>
                <p className="text-muted-foreground line-clamp-2">{m.lastMessage}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">{formatDateTime(m.lastAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
