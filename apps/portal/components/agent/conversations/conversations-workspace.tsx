'use client';

import Link from 'next/link';
import { ChevronRight, ExternalLink, Mail, MessageSquare, MessagesSquare, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  ThreadDetailPanel,
  ThreadListItem,
} from '@/components/agent/communications-log-client';
import { OwnerDecisionTimeline } from '@/components/agent/decision-with-owner-email';
import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { ModuleLanePill } from '@/components/agent/module-workspace/module-workspace';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CONVERSATIONS_COPY,
  CONVERSATION_READ_FILTER,
  CONVERSATION_READ_FILTERS,
  type ConversationReadFilter,
} from '@/constants/conversations';
import { MODULE_WORKSPACE_LABELS } from '@/constants/module-workspace';
import { OWNER_DECISION_MODULE_CASE_TYPE } from '@/constants/owner-decision';
import { messageDetail, propertyDetail } from '@/constants/routes';
import { useDesktopViewport } from '@/hooks/use-desktop-viewport';
import { resolveConversationJob } from '@/lib/conversation-job-context';
import type { MessageThread } from '@/lib/types';
import { cn, formatPropertyFullAddress, formatRelative } from '@/lib/utils';

function ContextSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border/60 border-t px-4 py-4 first:border-t-0">
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Right pane: the property, the job the thread is linked to, and its owner decisions. */
function JobContextPane({ thread }: { thread: MessageThread }) {
  const isV2 = useIsAgentUiV2();
  const { properties, archivedProperties, maintenanceAll, inspections, leasingCycles } =
    useAgentData();

  const property = useMemo(() => {
    if (!thread.propertyId) return null;
    return (
      properties.find((p) => p.id === thread.propertyId) ??
      archivedProperties.find((p) => p.id === thread.propertyId) ??
      null
    );
  }, [archivedProperties, properties, thread.propertyId]);

  const job = useMemo(
    () => resolveConversationJob(thread, { maintenance: maintenanceAll, inspections, leasingCycles }, isV2),
    [inspections, isV2, leasingCycles, maintenanceAll, thread],
  );

  if (!property) {
    return (
      <div className="p-4">
        <EmptyState
          icon={MessagesSquare}
          title={CONVERSATIONS_COPY.noPropertyTitle}
          description={CONVERSATIONS_COPY.noPropertyDescription}
        />
      </div>
    );
  }

  return (
    <div>
      <ContextSection title={CONVERSATIONS_COPY.propertyHeading}>
        <p className="text-sm font-medium leading-snug">{formatPropertyFullAddress(property)}</p>
        <dl className="mt-2 grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-xs">
          <dt className="text-muted-foreground">{CONVERSATIONS_COPY.ownerLabel}</dt>
          <dd className="min-w-0 truncate">
            {property.homeOwnerName || MODULE_WORKSPACE_LABELS.noValue}
            {property.homeOwnerContact.email ? (
              <span className="text-muted-foreground"> · {property.homeOwnerContact.email}</span>
            ) : null}
          </dd>
          <dt className="text-muted-foreground">{CONVERSATIONS_COPY.tenantLabel}</dt>
          <dd className="min-w-0 truncate">{property.tenantName || MODULE_WORKSPACE_LABELS.noValue}</dd>
        </dl>
        <Button asChild size="sm" variant="outline" className="mt-3 h-8 gap-1.5">
          <Link href={propertyDetail(property.id)}>
            <ExternalLink className="size-3.5" />
            {CONVERSATIONS_COPY.openProperty}
          </Link>
        </Button>
      </ContextSection>

      <ContextSection title={CONVERSATIONS_COPY.linkedJobHeading}>
        {job ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-mono text-[11px]">{job.reference}</span>
              <ModuleLanePill lane={job.lane} />
            </div>
            <p className="text-sm font-medium">{job.title}</p>
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
              <Link href={job.href}>
                <ExternalLink className="size-3.5" />
                {CONVERSATIONS_COPY.openJob}
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">{CONVERSATIONS_COPY.noLinkedJob}</p>
        )}
      </ContextSection>

      <ContextSection title={CONVERSATIONS_COPY.decisionsHeading}>
        <OwnerDecisionTimeline
          propertyId={property.id}
          caseType={job ? OWNER_DECISION_MODULE_CASE_TYPE[job.module] : undefined}
          caseId={job?.caseId}
        />
      </ContextSection>
    </div>
  );
}

function MobileThreadRow({ thread }: { thread: MessageThread }) {
  return (
    <Link
      href={messageDetail(thread.id)}
      className={cn(
        'hover:bg-secondary/40 flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition active:bg-secondary/60',
        thread.unread > 0 && 'bg-primary/[0.03]',
      )}
    >
      <span className="text-muted-foreground shrink-0">
        {thread.channel === 'email' ? <Mail className="size-4" /> : <MessageSquare className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', thread.unread > 0 ? 'font-semibold' : 'font-medium')}>
            {thread.subject}
          </p>
          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
            {formatRelative(thread.lastAt)}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">{thread.propertyAddress}</p>
      </div>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </Link>
  );
}

/**
 * Self-Manage Conversations (Phase 0 shell): threads, the conversation and its job context side
 * by side on desktop. Below `lg` it is the thread list, and a tap opens the existing thread page.
 * Reads the agent's threads already loaded by the data provider; the agency inbox is Phase 2.
 */
export function ConversationsWorkspace() {
  const desktop = useDesktopViewport();
  const { messages, sendMessage, markThreadRead } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<ConversationReadFilter>(CONVERSATION_READ_FILTER.ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages
      // Only Self-Manage properties' threads; a thread with no property stays in the Message Center.
      .filter((t) => Boolean(t.propertyId && scope.has(t.propertyId)))
      .filter((t) => readFilter === CONVERSATION_READ_FILTER.ALL || t.unread > 0)
      .filter(
        (t) =>
          !q ||
          [t.subject, t.propertyAddress, t.tenantName, t.homeOwnerName, t.lastMessage]
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [messages, readFilter, scope, search]);

  const selected = desktop
    ? (filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null)
    : null;

  useEffect(() => {
    if (selected && selected.unread > 0) markThreadRead(selected.id);
  }, [markThreadRead, selected]);

  const toolbar = (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={CONVERSATIONS_COPY.searchPlaceholder}
          className="h-9 rounded-lg pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <FilterChips options={CONVERSATION_READ_FILTERS} value={readFilter} onChange={setReadFilter} />
    </div>
  );

  if (messages.length === 0) {
    return (
      <div className="lg:px-6 lg:py-4">
        <EmptyState
          icon={MessagesSquare}
          title={CONVERSATIONS_COPY.emptyTitle}
          description={CONVERSATIONS_COPY.emptyDescription}
        />
      </div>
    );
  }

  if (!desktop) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {toolbar}
        <ul className="scrollbar-subtle min-h-0 flex-1 space-y-2 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="text-muted-foreground py-10 text-center text-sm">{CONVERSATIONS_COPY.noMatch}</li>
          ) : (
            filtered.map((thread) => (
              <li key={thread.id}>
                <MobileThreadRow thread={thread} />
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
      <aside className="flex min-h-0 w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
        <div className="shrink-0 border-b p-3">{toolbar}</div>
        <div className="scrollbar-subtle min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-xs">{CONVERSATIONS_COPY.noMatch}</p>
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
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        {selected ? (
          <ThreadDetailPanel
            key={selected.id}
            thread={selected}
            canReply
            onReply={(body, mentions) => sendMessage(selected.id, body, mentions)}
          />
        ) : (
          <p className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
            {CONVERSATIONS_COPY.selectThread}
          </p>
        )}
      </section>

      <aside className="scrollbar-subtle min-h-0 w-[340px] shrink-0 overflow-y-auto rounded-xl border bg-card">
        <p className="text-muted-foreground border-b px-4 py-3 text-xs font-semibold">
          {CONVERSATIONS_COPY.contextHeading}
        </p>
        {selected ? (
          <JobContextPane key={selected.id} thread={selected} />
        ) : (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            {CONVERSATIONS_COPY.selectThread}
          </p>
        )}
      </aside>
    </div>
  );
}
