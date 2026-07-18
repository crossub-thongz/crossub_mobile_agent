'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Mail, MessageSquare, Plus, Search } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { messageDetail, messagesNew } from '@/constants/routes';
import { groupThreadsByProperty } from '@/lib/communications-log';
import { cn, formatRelative } from '@/lib/utils';

const READ_FILTERS = [
  { id: 'unread', label: 'Unread' },
  { id: 'all', label: 'All' },
];

export default function MessagesPage() {
  const { messages } = useAgentData();
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState('unread');

  const filtered = useMemo(() => {
    let items = [...messages];
    if (readFilter === 'unread') {
      items = items.filter((t) => t.unread > 0);
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
  }, [messages, search, readFilter]);

  const groups = useMemo(() => groupThreadsByProperty(filtered), [filtered]);
  const unreadCount = useMemo(
    () => messages.reduce((sum, t) => sum + (t.unread > 0 ? t.unread : 0), 0),
    [messages],
  );

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

        <div className="flex items-center justify-between gap-2">
          <FilterChips options={READ_FILTERS} value={readFilter} onChange={setReadFilter} />
          {unreadCount > 0 ? (
            <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
              {unreadCount} unread
            </span>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <EmptyState
            title={
              search
                ? 'No matching threads'
                : readFilter === 'unread'
                  ? 'No unread messages'
                  : 'No messages yet'
            }
            description={
              readFilter === 'unread' && !search
                ? 'You’re all caught up. Switch to All to browse by property.'
                : 'Start a conversation with a landlord or tenant.'
            }
            action={
              readFilter === 'unread' && !search ? (
                <Button variant="outline" size="sm" onClick={() => setReadFilter('all')}>
                  Show all
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href={messagesNew()}>New message</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.propertyId ?? group.propertyAddress} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <h2 className="min-w-0 truncate text-xs font-semibold tracking-wide text-foreground/80 uppercase">
                    {group.propertyAddress}
                  </h2>
                  {group.unreadTotal > 0 ? (
                    <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                      {group.unreadTotal}
                    </span>
                  ) : null}
                </div>

                <div className="divide-border overflow-hidden rounded-xl border bg-card divide-y">
                  {group.threads.map((thread) => (
                    <Link
                      key={thread.id}
                      href={messageDetail(thread.id)}
                      className={cn(
                        'hover:bg-secondary/40 flex items-center gap-3 px-3 py-2.5 transition active:bg-secondary/60',
                        thread.unread > 0 && 'bg-primary/[0.03]',
                      )}
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
                          <p
                            className={cn(
                              'truncate text-sm',
                              thread.unread > 0 ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            {thread.subject}
                          </p>
                          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                            {formatRelative(thread.lastAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {thread.lastMessage || thread.tenantName || thread.homeOwnerName}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {thread.unread > 0 ? (
                          <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
                            {thread.unread}
                          </span>
                        ) : null}
                        <ChevronRight className="text-muted-foreground size-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AgentShell>
  );
}
