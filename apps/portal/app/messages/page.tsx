'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Mail, MessageSquare, Plus, Search } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search…"
              className="h-9 rounded-lg pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-9 shrink-0 gap-1.5 rounded-lg px-3" asChild>
            <Link href={messagesNew()}>
              <Plus className="size-4" />
              New
            </Link>
          </Button>
        </div>

        {propertyOptions.length > 1 && (
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-xs outline-none dark:bg-input/30"
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
            description="Start a conversation with a landlord or tenant."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={messagesNew()}>New message</Link>
              </Button>
            }
          />
        ) : (
          <div className="divide-border overflow-hidden rounded-xl border bg-card divide-y">
            {list.map((thread) => (
              <Link
                key={thread.id}
                href={messageDetail(thread.id)}
                className="hover:bg-secondary/40 flex items-center gap-3 px-3 py-2.5 transition active:bg-secondary/60"
              >
                <div className="text-muted-foreground shrink-0">
                  {thread.channel === 'email' ? (
                    <Mail className="size-4" />
                  ) : (
                    <MessageSquare className="size-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">{thread.subject}</p>
                    <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                      {formatRelative(thread.lastAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">{thread.propertyAddress}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {thread.unread > 0 && (
                    <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
                      {thread.unread}
                    </span>
                  )}
                  <ChevronRight className="text-muted-foreground size-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
