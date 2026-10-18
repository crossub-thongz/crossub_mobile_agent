'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  CONVERSATION_PAGE_SIZE,
  CONVERSATION_SEARCH_MIN_CHARS,
  type ConversationAction,
} from '@/constants/conversations';
import { mergeConversationPages, replaceConversationRow } from '@/lib/agent-conversations';
import {
  fetchAgentConversation,
  fetchAgentConversationTemplates,
  fetchAgentConversations,
  type AgentConversationDetail,
  type AgentConversationListState,
  type AgentConversationSummary,
  type AgentConversationTemplate,
} from '@/lib/crossub-api/agent-conversation-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export type AgentConversationFilters = {
  state: AgentConversationListState;
  assignedToMe: boolean;
  propertyId: string | null;
  /** Already debounced; shorter than the server minimum means no search. */
  search: string;
};

/**
 * The agency inbox thread list: first page on every filter change, then "load more". A stale
 * response (filters changed while it was in flight) is dropped.
 */
export function useAgentConversations(filters: AgentConversationFilters) {
  const [items, setItems] = useState<AgentConversationSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const { state, assignedToMe, propertyId, search } = filters;

  const load = useCallback(
    async (nextPage: number) => {
      const request = ++requestRef.current;
      const term = search.trim();
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const result = await fetchAgentConversations({
          page: nextPage,
          pageSize: CONVERSATION_PAGE_SIZE,
          state,
          ...(assignedToMe ? { assignedToMe } : {}),
          ...(propertyId ? { propertyId } : {}),
          ...(term.length >= CONVERSATION_SEARCH_MIN_CHARS ? { search: term } : {}),
        });
        if (request !== requestRef.current) return;
        setItems((shown) => (nextPage === 1 ? result.items : mergeConversationPages(shown, result.items)));
        setPage(result.page);
        setHasMore(result.hasMore);
      } catch (err) {
        if (request !== requestRef.current) return;
        setError(apiErrorMessage(err));
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [assignedToMe, propertyId, search, state],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const reload = useCallback(() => load(1), [load]);
  const loadMore = useCallback(() => load(page + 1), [load, page]);

  /** Patch one row after an action on the open thread, without refetching the list. */
  const updateRow = useCallback((row: AgentConversationSummary) => {
    setItems((rows) => replaceConversationRow(rows, row));
  }, []);

  return { items, hasMore, loading, loadingMore, error, reload, loadMore, updateRow };
}

/** One thread with its messages. Opening it marks it read on the server. */
export function useAgentConversationDetail(id: string | null) {
  const [detail, setDetail] = useState<AgentConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchAgentConversation(id)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setError(apiErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { detail: detail?.id === id ? detail : null, loading, error, setDetail, reload };
}

/** CROSSUB's global message templates (read-only). A failed load toasts and leaves the picker empty. */
export function useAgentConversationTemplates() {
  const [templates, setTemplates] = useState<AgentConversationTemplate[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchAgentConversationTemplates()
      .then((items) => {
        if (!cancelled) setTemplates(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return templates;
}

/**
 * Runs one write on the open thread at a time and toasts a failure. `pending` names the running
 * action so its button can show progress while every button disables. Resolves to the action's
 * result, or null when it failed.
 */
export function useConversationAction() {
  const [pending, setPending] = useState<ConversationAction | null>(null);

  const run = useCallback(
    async <T,>(key: ConversationAction, action: () => Promise<T>): Promise<T | null> => {
      setPending(key);
      try {
        return await action();
      } catch (err) {
        toast.error(apiErrorMessage(err));
        return null;
      } finally {
        setPending(null);
      }
    },
    [],
  );

  return { pending, run };
}
