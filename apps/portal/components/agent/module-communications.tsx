'use client';

import Link from 'next/link';
import { Mail, MessageSquare, Plus } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, messagesNew } from '@/constants/routes';
import type { MessageCategory } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

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

  const items = messages.filter((m) => {
    const cat = m.messageCategory ?? m.taskType;
    const categoryMatch =
      categories.includes(cat as MessageCategory) ||
      categories.some((c) => cat?.toLowerCase().includes(c.toLowerCase()));
    if (!categoryMatch) return false;
    if (propertyId) return m.propertyId === propertyId;
    return true;
  });

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
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={startThread}
          className="text-primary flex items-center gap-1 text-xs font-medium"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>
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
    </section>
  );
}
