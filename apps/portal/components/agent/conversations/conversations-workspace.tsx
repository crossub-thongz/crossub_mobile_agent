'use client';

import { Loader2, MessagesSquare, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ConversationContextPane } from '@/components/agent/conversations/conversation-context-pane';
import {
  ConversationList,
  ConversationListToolbar,
  type ConversationPropertyOption,
} from '@/components/agent/conversations/conversation-list';
import { ConversationThread } from '@/components/agent/conversations/conversation-thread';
import { NewConversationDialog } from '@/components/agent/conversations/new-conversation-dialog';
import { EmptyState } from '@/components/agent/empty-state';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  CONVERSATION_MOBILE_VIEW,
  CONVERSATION_SEARCH_DEBOUNCE_MS,
  CONVERSATION_STATE_FILTER,
  CONVERSATIONS_COPY,
  type ConversationMobileView,
} from '@/constants/conversations';
import { useAgencyTeamMembers } from '@/hooks/use-agency-team-members';
import {
  useAgentConversationDetail,
  useAgentConversations,
  useAgentConversationTemplates,
} from '@/hooks/use-agent-conversations';
import { useDesktopViewport } from '@/hooks/use-desktop-viewport';
import { useSelfManagedPropertyIds } from '@/hooks/use-self-managed-access';
import { summaryFromDetail } from '@/lib/agent-conversations';
import type {
  AgentConversationDetail,
  AgentConversationListState,
} from '@/lib/crossub-api/agent-conversation-client';
import { formatPropertyFullAddress } from '@/lib/utils';

/**
 * Self-Manage Conversations (Phase 2 agency inbox): mail to the agency's address and its
 * Self-Manage property threads, from `/agent/conversations`. Desktop shows the thread list, the
 * conversation and its job context side by side; below `lg` it is one pane at a time
 * (list, then thread, with the job context a tap away).
 */
export function ConversationsWorkspace() {
  const desktop = useDesktopViewport();
  const { properties } = useAgentData();
  const scope = useSelfManagedPropertyIds();
  const templates = useAgentConversationTemplates();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState<AgentConversationListState>(CONVERSATION_STATE_FILTER.OPEN);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<ConversationMobileView>(CONVERSATION_MOBILE_VIEW.LIST);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), CONVERSATION_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const list = useAgentConversations({ state, assignedToMe, propertyId, search });
  const { updateRow } = list;

  // Desktop always shows a thread: the chosen one, else the first in the list.
  const activeId = desktop ? (selectedId ?? list.items[0]?.id ?? null) : selectedId;
  const thread = useAgentConversationDetail(activeId);
  const { detail, setDetail } = thread;
  const team = useAgencyTeamMembers(detail?.agencyId, Boolean(detail?.agencyId));

  // Opening a thread marks it read; reflect that (and any fresher fields) in its list row.
  useEffect(() => {
    if (detail) updateRow(summaryFromDetail(detail));
  }, [detail, updateRow]);

  const selfManagedProperties = useMemo(
    () => properties.filter((p) => scope.has(p.id)),
    [properties, scope],
  );

  const propertyOptions = useMemo<ConversationPropertyOption[]>(
    () =>
      selfManagedProperties
        .map((p) => ({ id: p.id, label: formatPropertyFullAddress(p) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [selfManagedProperties],
  );

  // "File under property" offers only the thread's own agency's properties (the server rejects others).
  const fileUnderOptions = useMemo<ConversationPropertyOption[]>(() => {
    const agencyId = detail?.agencyId;
    if (!agencyId) return propertyOptions;
    const ofAgency = new Set(selfManagedProperties.filter((p) => p.agencyId === agencyId).map((p) => p.id));
    return propertyOptions.filter((o) => ofAgency.has(o.id));
  }, [detail?.agencyId, propertyOptions, selfManagedProperties]);

  const handleChange = useCallback(
    (next: AgentConversationDetail) => {
      setDetail(next);
      updateRow(summaryFromDetail(next));
    },
    [setDetail, updateRow],
  );

  const select = (id: string) => {
    setSelectedId(id);
    setMobileView(CONVERSATION_MOBILE_VIEW.THREAD);
  };

  const handleCreated = (created: AgentConversationDetail) => {
    setComposeOpen(false);
    setSelectedId(created.id);
    setDetail(created);
    setMobileView(CONVERSATION_MOBILE_VIEW.THREAD);
    void list.reload();
  };

  const toolbar = (
    <ConversationListToolbar
      search={searchInput}
      onSearchChange={setSearchInput}
      state={state}
      onStateChange={setState}
      assignedToMe={assignedToMe}
      onAssignedToMeChange={setAssignedToMe}
      propertyId={propertyId}
      onPropertyChange={setPropertyId}
      propertyOptions={propertyOptions}
    />
  );

  const newButton = (
    <Button type="button" size="sm" className="h-8 w-full gap-1.5" onClick={() => setComposeOpen(true)}>
      <Plus className="size-3.5" />
      {CONVERSATIONS_COPY.newConversation}
    </Button>
  );

  const listBody = (
    <ConversationList
      items={list.items}
      selectedId={activeId}
      onSelect={select}
      loading={list.loading}
      loadingMore={list.loadingMore}
      error={list.error}
      hasMore={list.hasMore}
      onLoadMore={() => void list.loadMore()}
      onRetry={() => void list.reload()}
    />
  );

  const threadPlaceholder = (message: string) => (
    <p className="text-muted-foreground flex flex-1 items-center justify-center px-4 text-center text-sm">
      {message}
    </p>
  );

  const threadPane = (mobile: boolean) => {
    if (detail) {
      return (
        <ConversationThread
          key={detail.id}
          detail={detail}
          team={team.members}
          templates={templates}
          onChange={handleChange}
          onBack={mobile ? () => setMobileView(CONVERSATION_MOBILE_VIEW.LIST) : undefined}
          onShowContext={mobile ? () => setMobileView(CONVERSATION_MOBILE_VIEW.CONTEXT) : undefined}
        />
      );
    }
    if (thread.loading) {
      return (
        <p className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {CONVERSATIONS_COPY.loading}
        </p>
      );
    }
    if (thread.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-muted-foreground text-sm">{thread.error}</p>
          <Button type="button" size="sm" variant="outline" onClick={thread.reload}>
            {CONVERSATIONS_COPY.retry}
          </Button>
        </div>
      );
    }
    if (!list.loading && list.items.length === 0) {
      return (
        <div className="p-4">
          <EmptyState
            icon={MessagesSquare}
            title={CONVERSATIONS_COPY.emptyTitle}
            description={CONVERSATIONS_COPY.emptyDescription}
          />
        </div>
      );
    }
    return threadPlaceholder(CONVERSATIONS_COPY.selectThread);
  };

  const composeDialog = composeOpen ? (
    <NewConversationDialog
      open
      onOpenChange={setComposeOpen}
      propertyOptions={propertyOptions}
      templates={templates}
      defaultPropertyId={propertyId}
      onCreated={handleCreated}
    />
  ) : null;

  if (!desktop) {
    const mobileThread = mobileView !== CONVERSATION_MOBILE_VIEW.LIST && selectedId;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {!mobileThread ? (
          <>
            {newButton}
            {toolbar}
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">{listBody}</div>
          </>
        ) : mobileView === CONVERSATION_MOBILE_VIEW.CONTEXT && detail ? (
          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card">
            <ConversationContextPane
              key={detail.id}
              detail={detail}
              propertyOptions={fileUnderOptions}
              onChange={handleChange}
              onBack={() => setMobileView(CONVERSATION_MOBILE_VIEW.THREAD)}
            />
          </div>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
            {threadPane(true)}
          </section>
        )}
        {composeDialog}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 px-6 py-4">
      <aside className="flex min-h-0 w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
        <div className="shrink-0 space-y-2 border-b p-3">
          {newButton}
          {toolbar}
        </div>
        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-2">{listBody}</div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        {threadPane(false)}
      </section>

      <aside className="scrollbar-subtle min-h-0 w-[340px] shrink-0 overflow-y-auto rounded-xl border bg-card">
        <p className="text-muted-foreground border-b px-4 py-3 text-xs font-semibold">
          {CONVERSATIONS_COPY.contextHeading}
        </p>
        {detail ? (
          <ConversationContextPane
            key={detail.id}
            detail={detail}
            propertyOptions={fileUnderOptions}
            onChange={handleChange}
          />
        ) : (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            {CONVERSATIONS_COPY.selectThread}
          </p>
        )}
      </aside>

      {composeDialog}
    </div>
  );
}
