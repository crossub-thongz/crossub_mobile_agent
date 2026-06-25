'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, Monitor, Search, Send } from 'lucide-react';
import { toast } from 'sonner';

import { ContactDetails } from '@/components/agent/contact-details';
import { MessageBody } from '@/components/agent/message-body';
import { MessageCompose } from '@/components/agent/message-compose';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import {
  COMMUNICATIONS_LOG_MODULES,
  channelLabel,
  filterThreadsByModule,
  threadCategory,
} from '@/lib/communications-log';
import {
  buildThreadMentionCandidates,
  extractMentions,
} from '@/lib/message-mentions';
import type { MessageCategory, MessageThread } from '@/lib/types';
import { cn, formatDateTime, formatRelative } from '@/lib/utils';

function ThreadListItem({
  thread,
  active,
  onSelect,
}: {
  thread: MessageThread;
  active: boolean;
  onSelect: () => void;
}) {
  const category = threadCategory(thread);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition',
        active
          ? 'border-primary/40 bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-secondary/50',
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        {thread.channel === 'email' ? (
          <Mail className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <MessageSquare className="text-muted-foreground size-3.5 shrink-0" />
        )}
        <span className="truncate font-medium">{thread.subject}</span>
        {thread.unread > 0 && (
          <span className="bg-destructive ml-auto shrink-0 rounded-full px-1.5 text-[10px] font-bold text-white">
            {thread.unread}
          </span>
        )}
      </div>
      <p className="text-muted-foreground truncate text-xs">{thread.propertyAddress}</p>
      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{thread.lastMessage}</p>
      <div className="text-muted-foreground mt-1 flex items-center justify-between text-[10px]">
        <span>{category}</span>
        <span>{formatRelative(thread.lastAt)}</span>
      </div>
    </button>
  );
}

function ThreadDetailPanel({ thread }: { thread: MessageThread }) {
  const { sendMessage } = useAgentData();
  const [reply, setReply] = useState('');
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messageCount = thread.messages.length;
  const prevThreadIdRef = useRef(thread.id);
  const prevMessageCountRef = useRef(messageCount);

  const mentionCandidates = useMemo(
    () =>
      buildThreadMentionCandidates({
        homeOwnerName: thread.homeOwnerName,
        tenantName: thread.tenantName,
      }),
    [thread.homeOwnerName, thread.tenantName],
  );

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    const threadChanged = prevThreadIdRef.current !== thread.id;
    const newMessage = messageCount > prevMessageCountRef.current;

    prevThreadIdRef.current = thread.id;
    prevMessageCountRef.current = messageCount;

    if (threadChanged) {
      el.scrollTop = el.scrollHeight;
    } else if (newMessage) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [thread.id, messageCount]);

  const handleSend = () => {
    const text = reply.trim();
    if (!text) return;
    const mentions = extractMentions(text, mentionCandidates);
    sendMessage(thread.id, text, mentions);
    setReply('');
    toast.success('Message sent');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{thread.subject}</h2>
            <p className="text-muted-foreground text-xs">{thread.propertyAddress}</p>
          </div>
          <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
            {channelLabel(thread.channel)}
          </span>
        </div>
        <div className="mt-3 rounded-lg border bg-card p-3 text-xs">
          <ContactDetails
            homeOwnerName={thread.homeOwnerName}
            homeOwnerContact={thread.homeOwnerContact}
            tenantName={thread.tenantName}
            tenantContact={thread.tenantContact}
          />
        </div>
      </div>

      <div
        ref={messagesScrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {thread.messages.map((msg) => {
          const isAgent = msg.sentByAgent || !msg.from.includes('CROSSUB');
          return (
            <div
              key={msg.id}
              className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                  isAgent
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-card',
                )}
              >
                <div className="mb-1 flex items-center gap-2 text-[10px] opacity-80">
                  <span className="font-medium">{msg.from}</span>
                  {msg.channel && (
                    <span className="flex items-center gap-0.5">
                      {msg.channel === 'email' ? (
                        <Mail className="size-2.5" />
                      ) : (
                        <MessageSquare className="size-2.5" />
                      )}
                      {msg.channel}
                    </span>
                  )}
                  <span>{formatDateTime(msg.at)}</span>
                </div>
                <MessageBody body={msg.body} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t p-4">
        <MessageCompose
          value={reply}
          onChange={setReply}
          onSubmit={handleSend}
          homeOwnerName={thread.homeOwnerName}
          tenantName={thread.tenantName}
          placeholder="Reply to thread…"
          rows={3}
        />
        <Button className="mt-2 w-full" onClick={handleSend} disabled={!reply.trim()}>
          <Send className="mr-2 size-4" />
          Send
        </Button>
      </div>
    </div>
  );
}

export function CommunicationsLogClient() {
  const { messages } = useAgentData();
  const [module, setModule] = useState<MessageCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let items = filterThreadsByModule(messages, module);
    if (!search.trim()) return items.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    const q = search.toLowerCase();
    return items
      .filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.propertyAddress.toLowerCase().includes(q) ||
          t.tenantName.toLowerCase().includes(q) ||
          t.lastMessage.toLowerCase().includes(q),
      )
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [messages, module, search]);

  const selected =
    filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  useEffect(() => {
    if (selectedId && !filtered.some((t) => t.id === selectedId) && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: messages.length };
    for (const mod of COMMUNICATIONS_LOG_MODULES) {
      counts[mod.id] = filterThreadsByModule(messages, mod.id).length;
    }
    return counts;
  }, [messages]);

  return (
    <>
      <div className="lg:hidden">
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-10 text-center">
          <Monitor className="text-muted-foreground size-10" />
          <div>
            <h2 className="text-base font-semibold">Desktop Message Center</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Full email and message history across Leasing, Maintenance, Inspection,
              and Accounting is available on desktop. Use Messages for conversations on
              mobile.
            </p>
          </div>
          <Button asChild className="rounded-xl">
            <Link href={ROUTES.MESSAGES}>Open Messages</Link>
          </Button>
        </div>
      </div>

      <div className="hidden h-[calc(100dvh-3.5rem)] min-h-[480px] flex-col lg:flex lg:h-[100dvh]">
        <div className="shrink-0 border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Message Center</h1>
          <p className="text-muted-foreground text-xs">
            Connect email accounts, search, and manage all tenant correspondence in one place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => toast.info('Email account connection — configure in crossub_web settings')}>
              <Mail className="mr-1.5 size-3.5" />
              Connect email account
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="border-border w-[220px] shrink-0 overflow-y-auto border-r p-3">
            <p className="text-muted-foreground mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide">
              Modules
            </p>
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => setModule('all')}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
                    module === 'all'
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <span>All modules</span>
                  <span className="text-[10px]">{moduleCounts.all}</span>
                </button>
              </li>
              {COMMUNICATIONS_LOG_MODULES.map((mod) => (
                <li key={mod.id}>
                  <button
                    type="button"
                    onClick={() => setModule(mod.id)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left transition',
                      module === mod.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{mod.label}</span>
                      <span className="text-[10px]">{moduleCounts[mod.id] ?? 0}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug opacity-80">
                      {mod.description}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="border-border flex w-[300px] shrink-0 flex-col border-r">
            <div className="shrink-0 border-b p-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search threads…"
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                  No communications for this module.
                </p>
              ) : (
                filtered.map((thread) => (
                  <ThreadListItem
                    key={thread.id}
                    thread={thread}
                    active={selected?.id === thread.id}
                    onSelect={() => setSelectedId(thread.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="bg-background flex min-w-0 flex-1 flex-col">
            {selected ? (
              <ThreadDetailPanel key={selected.id} thread={selected} />
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                Select a thread to view the full history
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
