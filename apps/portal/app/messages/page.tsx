'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Search } from 'lucide-react';

import { ChatCrossubBar } from '@/components/agent/chat-crossub-bar';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import { messageDetail } from '@/constants/routes';
import { formatRelative } from '@/lib/utils';

export default function MessagesPage() {
  const { messages, sectionStatus } = useAgentData();
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    if (!search.trim()) return messages;
    const q = search.toLowerCase();
    return messages.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.propertyAddress.toLowerCase().includes(q),
    );
  }, [messages, search]);

  const msgStatus = sectionStatus.find((s) => s.id === 'messages');

  return (
    <AgentShell title="Messages">
      <div className="space-y-4">
        <ChatCrossubBar
          taskLabel={msgStatus?.statusLabel ?? 'Chat with CROSSUB'}
          threadId={messages[0]?.id}
        />

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search conversations…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {list.map((thread) => (
            <Link
              key={thread.id}
              href={messageDetail(thread.id)}
              className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {thread.taskType}
                    </span>
                    {thread.unread > 0 && (
                      <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-semibold">{thread.subject}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {thread.propertyAddress}
                  </p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {thread.lastMessage}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {formatRelative(thread.lastAt)}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link href={messageDetail('msg-1')}>
            <Plus className="size-4" />
            New message to CROSSUB
          </Link>
        </Button>
      </div>
    </AgentShell>
  );
}
