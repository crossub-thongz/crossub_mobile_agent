'use client';

import { Loader2, Paperclip, Search, UserRound } from 'lucide-react';

import { FilterChips } from '@/components/agent/filter-chips';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CONVERSATION_ALL_PROPERTIES_VALUE,
  CONVERSATION_MESSAGE_DIRECTION,
  CONVERSATION_STATE_FILTERS,
  CONVERSATIONS_COPY,
} from '@/constants/conversations';
import { conversationHeadline } from '@/lib/agent-conversations';
import type { AgentConversationListState, AgentConversationSummary } from '@/lib/crossub-api/agent-conversation-client';
import { toPlainTextBody } from '@/lib/message-body';
import { cn, formatRelative } from '@/lib/utils';

export type ConversationPropertyOption = { id: string; label: string };

/** Search, state chips, Assigned to me and the property filter above the thread list. */
export function ConversationListToolbar({
  search,
  onSearchChange,
  state,
  onStateChange,
  assignedToMe,
  onAssignedToMeChange,
  propertyId,
  onPropertyChange,
  propertyOptions,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  state: AgentConversationListState;
  onStateChange: (value: AgentConversationListState) => void;
  assignedToMe: boolean;
  onAssignedToMeChange: (value: boolean) => void;
  propertyId: string | null;
  onPropertyChange: (value: string | null) => void;
  propertyOptions: readonly ConversationPropertyOption[];
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder={CONVERSATIONS_COPY.searchPlaceholder}
          className="h-9 rounded-lg pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <FilterChips options={CONVERSATION_STATE_FILTERS} value={state} onChange={onStateChange} />
      <div className="flex items-center gap-2">
        <select
          aria-label={CONVERSATIONS_COPY.allProperties}
          className={cn(SELECT_CLASS, 'h-8 min-w-0 flex-1 text-xs')}
          value={propertyId ?? CONVERSATION_ALL_PROPERTIES_VALUE}
          onChange={(e) =>
            onPropertyChange(e.target.value === CONVERSATION_ALL_PROPERTIES_VALUE ? null : e.target.value)
          }
        >
          <option value={CONVERSATION_ALL_PROPERTIES_VALUE}>{CONVERSATIONS_COPY.allProperties}</option>
          {propertyOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <label className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs font-medium">
          <input
            type="checkbox"
            className="accent-primary size-3.5"
            checked={assignedToMe}
            onChange={(e) => onAssignedToMeChange(e.target.checked)}
          />
          {CONVERSATIONS_COPY.assignedToMe}
        </label>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: AgentConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const outbound = conversation.lastMessageDirection === CONVERSATION_MESSAGE_DIRECTION.OUTBOUND;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'hover:bg-secondary/50 w-full rounded-lg border px-3 py-2.5 text-left transition',
        active ? 'border-primary/50 bg-primary/[0.06]' : 'border-transparent',
        conversation.unread && !active && 'bg-primary/[0.03]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {conversation.unread ? (
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-label={CONVERSATIONS_COPY.unread} />
          ) : null}
          <p className={cn('truncate text-sm', conversation.unread ? 'font-semibold' : 'font-medium')}>
            {conversationHeadline(conversation)}
          </p>
        </div>
        {conversation.lastMessageAt ? (
          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
            {formatRelative(conversation.lastMessageAt)}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">
        {conversation.propertyAddress ?? CONVERSATIONS_COPY.noProperty}
      </p>
      {conversation.preview ? (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {outbound ? <span className="font-medium">{CONVERSATIONS_COPY.outbound}: </span> : null}
          {toPlainTextBody(conversation.preview)}
        </p>
      ) : null}
      <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-[11px]">
        <span className="flex min-w-0 items-center gap-1">
          <UserRound className="size-3 shrink-0" />
          <span className="truncate">{conversation.assignedToName ?? CONVERSATIONS_COPY.unassigned}</span>
        </span>
        {conversation.attachmentCount > 0 ? (
          <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
            <Paperclip className="size-3" />
            {conversation.attachmentCount}
          </span>
        ) : null}
        {conversation.resolved ? (
          <span className="bg-secondary shrink-0 rounded-full px-1.5 py-0.5 font-medium">
            {CONVERSATIONS_COPY.resolved}
          </span>
        ) : null}
      </div>
    </button>
  );
}

/** The thread rows, with loading, error and "load more" states. */
export function ConversationList({
  items,
  selectedId,
  onSelect,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
}: {
  items: readonly AgentConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  if (loading && items.length === 0) {
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        {CONVERSATIONS_COPY.loading}
      </p>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="space-y-2 px-2 py-8 text-center">
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={onRetry}>
          {CONVERSATIONS_COPY.retry}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-muted-foreground px-2 py-8 text-center text-xs">{CONVERSATIONS_COPY.noMatch}</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          active={conversation.id === selectedId}
          onSelect={() => onSelect(conversation.id)}
        />
      ))}
      {hasMore ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-full text-xs"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {loadingMore ? CONVERSATIONS_COPY.loading : CONVERSATIONS_COPY.loadMore}
        </Button>
      ) : null}
    </div>
  );
}
