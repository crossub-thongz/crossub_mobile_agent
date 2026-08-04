'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Loader2,
  Mail,
  MessageSquare,
  Monitor,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';

import { ContactDetails } from '@/components/agent/contact-details';
import { MessageThreadWorkspace } from '@/components/agent/message-thread-workspace';
import { MessageThreadBubble } from '@/components/agent/message-thread-bubble';
import { PhonePanel } from '@/components/agent/phone-panel';
import { useAuth } from '@/components/providers/auth-provider';
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
  connectGmail,
  connectYahoo,
  disconnectMailbox,
  fetchMailboxLinkConfig,
  fetchMessageCenter,
  replyInMessageCenter,
  syncMailbox,
  type AgentLinkedMailbox,
  type AgentMailboxLinkConfig,
} from '@/lib/crossub-api/agent-client';
import { mapAgentMessages } from '@/lib/crossub-api/agent-mappers';
import { resolveAgentPortfolioId } from '@/lib/agent-scope';
import { placePhoneCall } from '@/lib/phone';
import {
  buildThreadMentionCandidates,
  extractMentions,
} from '@/lib/message-mentions';
import type { MessageCategory, MessageThread } from '@/lib/types';
import { cn, displayName, formatDateTime, formatRelative } from '@/lib/utils';

function providerLabel(provider: AgentLinkedMailbox['provider']): string {
  return provider === 'GMAIL' ? 'Gmail' : 'Yahoo';
}

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
        ) : thread.channel === 'mixed' ? (
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
      <p className="text-muted-foreground line-clamp-2 text-xs">{thread.propertyAddress}</p>
      <div className="text-muted-foreground mt-1 flex items-center justify-between text-[10px]">
        <span>{category}</span>
        <span>{formatRelative(thread.lastAt)}</span>
      </div>
    </button>
  );
}

function ThreadDetailPanel({
  thread,
  onReply,
  canReply,
}: {
  thread: MessageThread;
  onReply: (body: string, mentions?: ReturnType<typeof extractMentions>) => void;
  canReply: boolean;
}) {
  const [reply, setReply] = useState('');
  const mentionCandidates = useMemo(
    () =>
      buildThreadMentionCandidates({
        homeOwnerName: thread.homeOwnerName,
        tenantName: thread.tenantName,
      }),
    [thread.homeOwnerName, thread.tenantName],
  );

  const handleSend = () => {
    const text = reply.trim();
    if (!text) return;
    const mentions = extractMentions(text, mentionCandidates);
    onReply(text, mentions);
    setReply('');
    toast.success('Message sent');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{thread.subject}</h2>
            <p className="text-muted-foreground text-xs">{thread.propertyAddress}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {thread.tenantContact.phone &&
              thread.tenantName.toLowerCase() !== 'vacant' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    placePhoneCall(thread.tenantContact.phone!);
                    toast.success(`Calling ${thread.tenantName}…`);
                  }}
                >
                  <PhoneCall className="size-3" />
                  Tenant
                </Button>
              )}
            {thread.homeOwnerContact.phone && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => {
                  placePhoneCall(thread.homeOwnerContact.phone!);
                  toast.success(`Calling ${thread.homeOwnerName}…`);
                }}
              >
                <PhoneCall className="size-3" />
                Landlord
              </Button>
            )}
            <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
              {channelLabel(thread.channel)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <MessageThreadWorkspace
          thread={thread}
          reply={reply}
          onReplyChange={setReply}
          onReplySend={handleSend}
          replyPlaceholder={canReply ? 'Reply to thread…' : 'Read-only thread'}
          dockLayout="panel"
          replyEnabled={canReply}
        >
          <div className="space-y-4 px-4 pt-4">
            <div className="rounded-lg border bg-card p-3 text-xs">
              <ContactDetails
                homeOwnerName={thread.homeOwnerName}
                homeOwnerContact={thread.homeOwnerContact}
                tenantName={thread.tenantName}
                tenantContact={thread.tenantContact}
              />
            </div>
            <div className="space-y-3">
              {thread.messages.map((msg) => (
                <MessageThreadBubble key={msg.id} msg={msg} rounded="2xl" />
              ))}
            </div>
          </div>
        </MessageThreadWorkspace>
      </div>
    </div>
  );
}

function LinkedMailboxRow({
  mailbox,
  syncing,
  onSync,
  onDisconnect,
}: {
  mailbox: AgentLinkedMailbox;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const hasError = mailbox.status === 'ERROR' || Boolean(mailbox.lastError);
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        hasError ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card',
      )}
    >
      <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{mailbox.email}</p>
        <p className="text-muted-foreground text-[10px]">
          {providerLabel(mailbox.provider)}
          {mailbox.lastSyncAt
            ? ` · synced ${formatRelative(mailbox.lastSyncAt)}`
            : ' · not synced yet'}
        </p>
        {mailbox.lastError && (
          <p className="text-destructive mt-0.5 flex items-center gap-1 text-[10px]">
            <AlertCircle className="size-3 shrink-0" />
            {mailbox.lastError}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          disabled={syncing}
          onClick={onSync}
          title="Sync now"
        >
          {syncing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive size-7"
          onClick={onDisconnect}
          title="Disconnect"
        >
          <Unlink className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function CommunicationsLogClient() {
  const { user, status } = useAuth();
  const searchParams = useSearchParams();
  const { messages: fallbackMessages, properties, apiConnected, refresh } = useAgentData();
  const agentPortfolioId = resolveAgentPortfolioId(user);

  const [module, setModule] = useState<MessageCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkedMailboxes, setLinkedMailboxes] = useState<AgentLinkedMailbox[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  const [centerThreads, setCenterThreads] = useState<MessageThread[] | null>(null);
  const [loadingCenter, setLoadingCenter] = useState(false);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<'GMAIL' | 'YAHOO' | null>(null);
  const [syncingMailboxId, setSyncingMailboxId] = useState<string | null>(null);
  const [hubView, setHubView] = useState<'inbox' | 'calls'>('inbox');
  const [mailboxLinkConfig, setMailboxLinkConfig] =
    useState<AgentMailboxLinkConfig | null>(null);

  const loadMessageCenter = useCallback(
    async (mailboxId?: string | null) => {
      const data = await fetchMessageCenter(mailboxId ?? undefined);
      setLinkedMailboxes(data.linkedMailboxes);
      setSelectedMailboxId(data.selectedMailboxId);
      setCenterThreads(mapAgentMessages(data.threads, properties, agentPortfolioId));
      return data;
    },
    [properties, agentPortfolioId],
  );

  useEffect(() => {
    if (status !== 'authed' || !apiConnected) return;
    void fetchMailboxLinkConfig()
      .then(setMailboxLinkConfig)
      .catch(() => setMailboxLinkConfig(null));
  }, [status, apiConnected]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCenter(true);
    setCenterError(null);
    void loadMessageCenter(selectedMailboxId)
      .catch((err) => {
        if (cancelled) return;
        setCenterThreads(null);
        setCenterError(
          err instanceof Error ? err.message : 'Unable to load Message Center',
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingCenter(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, apiConnected, loadMessageCenter, selectedMailboxId]);

  useEffect(() => {
    const connected = searchParams.get('mailboxConnected');
    if (connected !== 'gmail' && connected !== 'yahoo') return;
    const label = connected === 'gmail' ? 'Gmail' : 'Yahoo';
    toast.success(`${label} mailbox connected`);
    window.history.replaceState({}, '', ROUTES.COMMUNICATIONS);
    void loadMessageCenter(selectedMailboxId).catch(() => {
      toast.error('Failed to refresh Message Center');
    });
  }, [searchParams, loadMessageCenter, selectedMailboxId]);

  const messages = centerThreads ?? fallbackMessages;

  useEffect(() => {
    const threadId = searchParams.get('threadId');
    if (!threadId || messages.length === 0) return;
    if (messages.some((t) => t.id === threadId)) {
      setSelectedId(threadId);
    }
  }, [searchParams, messages]);

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

  const handleConnect = (provider: 'GMAIL' | 'YAHOO') => {
    if (!apiConnected) {
      toast.info('Sign in to the live API to connect a mailbox');
      return;
    }
    const ready =
      provider === 'GMAIL'
        ? mailboxLinkConfig?.gmail && mailboxLinkConfig?.encryptionKey
        : mailboxLinkConfig?.yahoo && mailboxLinkConfig?.encryptionKey;
    if (mailboxLinkConfig && !ready) {
      toast.error(
        `${providerLabel(provider)} is not configured on the API server. Add OAuth credentials to crossub_web/apps/api/.env and restart the API.`,
        { duration: 8000 },
      );
      return;
    }
    setConnecting(provider);
    const connect = provider === 'GMAIL' ? connectGmail : connectYahoo;
    void connect()
      .then(({ authorizationUrl }) => {
        window.location.href = authorizationUrl;
      })
      .catch((err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to start ${providerLabel(provider)} connect`,
          { duration: 8000 },
        ),
      )
      .finally(() => setConnecting(null));
  };

  const handleSync = (mailboxId: string) => {
    setSyncingMailboxId(mailboxId);
    void syncMailbox(mailboxId)
      .then(() => loadMessageCenter(selectedMailboxId))
      .then(() => toast.success('Mailbox synced'))
      .catch(() => toast.error('Sync failed'))
      .finally(() => setSyncingMailboxId(null));
  };

  const handleDisconnect = (mailboxId: string) => {
    void disconnectMailbox(mailboxId)
      .then(() => {
        if (selectedMailboxId === mailboxId) setSelectedMailboxId(null);
        return loadMessageCenter(
          selectedMailboxId === mailboxId ? null : selectedMailboxId,
        );
      })
      .then(() => toast.success('Mailbox disconnected'))
      .catch(() => toast.error('Failed to disconnect mailbox'));
  };

  const handleReply = (threadId: string, body: string) => {
    const thread = messages.find((m) => m.id === threadId);
    if (!thread || thread.id.startsWith('email-archive:')) return;

    if (apiConnected && centerThreads) {
      void replyInMessageCenter(threadId, body)
        .then(() => loadMessageCenter(selectedMailboxId))
        .then(() => refresh())
        .catch(() => toast.error('Failed to send message'));
      return;
    }

    toast.info('Sign in to the live API to send replies');
  };

  const canReplyToThread = (threadId: string) => !threadId.startsWith('email-archive:');

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Message Center</h1>
              <p className="text-muted-foreground text-xs">
                Email, app messages, and calls — your communication hub for managed
                properties.
              </p>
            </div>
            <div className="bg-secondary/60 flex shrink-0 rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setHubView('inbox')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition',
                  hubView === 'inbox'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Inbox
              </button>
              <button
                type="button"
                onClick={() => setHubView('calls')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  hubView === 'calls'
                    ? 'bg-emerald-500/15 text-emerald-700 shadow-sm dark:text-emerald-300'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Phone className="size-3" />
                Calls
              </button>
            </div>
          </div>

          {hubView === 'inbox' && (
          <div className="mt-3 space-y-2">
            {apiConnected &&
              mailboxLinkConfig &&
              (!mailboxLinkConfig.gmail ||
                !mailboxLinkConfig.yahoo ||
                !mailboxLinkConfig.encryptionKey) && (
                <div className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 rounded-lg border px-3 py-2 text-xs leading-relaxed">
                  <p className="font-semibold">Email account connection — configure on the API server</p>
                  <p className="mt-1 opacity-90">
                    Gmail/Yahoo OAuth is not fully set up in{' '}
                    <code className="text-[10px]">crossub_web/apps/api/.env</code>. Add{' '}
                    <code className="text-[10px]">GOOGLE_MAIL_CLIENT_ID</code>,{' '}
                    <code className="text-[10px]">GOOGLE_MAIL_CLIENT_SECRET</code>, and{' '}
                    <code className="text-[10px]">MAILBOX_TOKEN_ENCRYPTION_KEY</code>, then
                    restart the API. Register redirect URI:{' '}
                    <code className="text-[10px]">
                      http://localhost:3001/api/v1/agent/mailboxes/oauth/google/callback
                    </code>
                  </p>
                </div>
              )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={connecting === 'GMAIL'}
                onClick={() => handleConnect('GMAIL')}
              >
                {connecting === 'GMAIL' ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 size-3.5" />
                )}
                Connect Gmail
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={connecting === 'YAHOO'}
                onClick={() => handleConnect('YAHOO')}
              >
                {connecting === 'YAHOO' ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 size-3.5" />
                )}
                Connect Yahoo
              </Button>
              {loadingCenter && (
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading…
                </span>
              )}
              {centerError && !loadingCenter && (
                <span className="text-destructive text-xs">{centerError}</span>
              )}
            </div>

            {linkedMailboxes.length > 0 && (
              <div className="space-y-1.5">
                {linkedMailboxes.map((mb) => (
                  <LinkedMailboxRow
                    key={mb.id}
                    mailbox={mb}
                    syncing={syncingMailboxId === mb.id}
                    onSync={() => handleSync(mb.id)}
                    onDisconnect={() => handleDisconnect(mb.id)}
                  />
                ))}
              </div>
            )}

            {linkedMailboxes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  Inbox filter
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMailboxId(null)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs transition',
                      selectedMailboxId === null
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
                    )}
                  >
                    All
                  </button>
                  {linkedMailboxes.map((mb) => (
                    <button
                      key={mb.id}
                      type="button"
                      onClick={() => setSelectedMailboxId(mb.id)}
                      className={cn(
                        'max-w-[200px] truncate rounded-full px-2.5 py-1 text-xs transition',
                        selectedMailboxId === mb.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
                      )}
                      title={mb.email}
                    >
                      {providerLabel(mb.provider)}: {mb.email}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {user && hubView === 'inbox' && (
            <p className="text-muted-foreground mt-2 text-[11px]">
              Signed in as {displayName(user)} — CROSSUB threads plus linked inbox mail
              for your managed properties.
            </p>
          )}
        </div>

        {hubView === 'calls' ? (
          <div className="flex min-h-0 flex-1 justify-center overflow-hidden p-6">
            <div className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
              <PhonePanel variant="embedded" className="h-full" />
            </div>
          </div>
        ) : (
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
                  {loadingCenter
                    ? 'Loading correspondence…'
                    : 'No communications for this module.'}
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

          <div className="bg-background flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
            {selected ? (
              <ThreadDetailPanel
                key={selected.id}
                thread={selected}
                canReply={canReplyToThread(selected.id)}
                onReply={(body) => handleReply(selected.id, body)}
              />
            ) : (
              <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                Select a thread to view the full history
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </>
  );
}
