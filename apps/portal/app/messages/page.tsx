'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Search } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { PageIntro } from '@/components/agent/page-intro';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { messageDetail, messagesNew } from '@/constants/routes';
import { formatRelative } from '@/lib/utils';

export default function MessagesPage() {
  const { messages } = useAgentData();
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');

  const list = useMemo(() => {
    let items = [...messages];
    if (propertyFilter !== 'all') {
      items = items.filter((t) => t.propertyId === propertyFilter);
    }
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.propertyAddress.toLowerCase().includes(q) ||
        t.tenantName.toLowerCase().includes(q) ||
        t.homeOwnerName.toLowerCase().includes(q),
    );
  }, [messages, search, propertyFilter]);

  const propertyOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of messages) {
      if (t.propertyId) seen.set(t.propertyId, t.propertyAddress);
    }
    return [...seen.entries()];
  }, [messages]);

  return (
    <AgentShell title="Messages">
      <div className="space-y-4">
        <PageIntro description="Conversations by property — start a new message with a category." />

        <Button className="w-full rounded-xl" size="lg" asChild>
          <Link href={messagesNew()}>
            <Plus className="size-4" />
            New message
          </Link>
        </Button>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search address or contact…"
            className="rounded-xl pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {propertyOptions.length > 1 && (
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30"
          >
            <option value="all">All properties</option>
            {propertyOptions.map(([id, address]) => (
              <option key={id} value={id}>
                {address}
              </option>
            ))}
          </select>
        )}

        {list.length === 0 ? (
          <EmptyState
            title={search || propertyFilter !== 'all' ? 'No matching threads' : 'No messages yet'}
            description="Choose a property below to start a conversation with the landlord or tenant."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={messagesNew()}>New message</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {list.map((thread) => (
              <Link
                key={thread.id}
                href={messageDetail(thread.id)}
                className="block rounded-2xl border bg-card p-4 transition hover:border-primary/20 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold">{thread.propertyAddress}</p>
                    <p className="text-muted-foreground truncate text-xs">{thread.subject}</p>
                    <p className="text-muted-foreground line-clamp-1 text-xs">
                      {thread.lastMessage}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatRelative(thread.lastAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {thread.unread > 0 && (
                      <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
                        {thread.unread}
                      </span>
                    )}
                    <ChevronRight className="text-muted-foreground size-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </AgentShell>
  );
}
