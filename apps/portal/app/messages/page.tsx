'use client';

import Link from 'next/link';
import { ChevronRight, Mail, MessageSquare } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { MESSAGE_THREADS } from '@/lib/mock-data';
import { messageDetail } from '@/constants/routes';
import { formatRelative } from '@/lib/utils';

export default function MessagesPage() {
  return (
    <AgentShell title="Messages">
      <div className="space-y-2">
        {MESSAGE_THREADS.map((thread) => (
          <Link
            key={thread.id}
            href={messageDetail(thread.id)}
            className="block rounded-xl border bg-card p-4 active:bg-secondary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {thread.channel === 'email' ? (
                    <Mail className="text-muted-foreground size-3.5" />
                  ) : thread.channel === 'mixed' ? (
                    <>
                      <MessageSquare className="text-muted-foreground size-3.5" />
                      <Mail className="text-muted-foreground size-3.5" />
                    </>
                  ) : (
                    <MessageSquare className="text-primary size-3.5" />
                  )}
                  <span className="text-muted-foreground text-xs">
                    {thread.taskType}
                  </span>
                  {thread.unread > 0 && (
                    <span className="bg-primary flex size-4 items-center justify-center rounded-full text-[9px] text-primary-foreground">
                      {thread.unread}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm font-semibold">{thread.subject}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {thread.propertyAddress}
                </p>
                <p className="text-muted-foreground line-clamp-2 text-xs">
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
    </AgentShell>
  );
}
