'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { AGENT_INBOX_COPY, AGENT_INBOX_REFRESH_MS } from '@/constants/conversations';
import { ROUTES } from '@/constants/routes';
import { fetchAgentConversationUnreadCount } from '@/lib/crossub-api/agent-conversation-client';
import { isSelfManagedAgent } from '@/lib/portal-service-level';

type AgentInbox = {
  /** Where every message icon goes: Conversations for a Self-Manage agent, else Messages. */
  href: string;
  label: string;
  /** Unread threads (Conversations) or unread messages (Messages): what the icons show. */
  unread: number;
  /** The agent's one inbox is Conversations; Messages forwards there. */
  conversationsOnly: boolean;
  /** False until the agencies have loaded and the inbox is known. */
  ready: boolean;
  refresh: () => void;
};

const AgentInboxContext = createContext<AgentInbox | null>(null);

/**
 * The agent's one inbox (decided 1 Nov 2026). A Self-Manage agent's mail is all in Conversations,
 * which Messages repeated with its own unread count, so every message icon opens Conversations and
 * shows its count. An agent with any CROSSUB-serviced agency keeps Messages, where that agency's
 * threads live. The CROSSUB team is reached in Cros either way.
 */
export function AgentInboxProvider({ children }: { children: ReactNode }) {
  const { agencies, messages, loading } = useAgentData();
  const pathname = usePathname();
  const conversationsOnly = isSelfManagedAgent(agencies);
  const [conversationUnread, setConversationUnread] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const refresh = useCallback(() => setReadCount((n) => n + 1), []);

  // Read again on every page change too: opening a thread in Conversations marks it read.
  useEffect(() => {
    if (!conversationsOnly) return;
    let live = true;
    fetchAgentConversationUnreadCount()
      .then((count) => {
        if (live) setConversationUnread(count);
      })
      .catch((err: unknown) => console.warn('[inbox] unread count could not be loaded', err));
    return () => {
      live = false;
    };
  }, [conversationsOnly, pathname, readCount]);

  useEffect(() => {
    if (!conversationsOnly) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(refresh, AGENT_INBOX_REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [conversationsOnly, refresh]);

  const messageUnread = useMemo(
    () => messages.reduce((sum, thread) => sum + (thread.unread > 0 ? thread.unread : 0), 0),
    [messages],
  );

  const value = useMemo<AgentInbox>(
    () =>
      conversationsOnly
        ? {
            href: ROUTES.CONVERSATIONS,
            label: AGENT_INBOX_COPY.CONVERSATIONS,
            unread: conversationUnread,
            conversationsOnly,
            ready: !loading,
            refresh,
          }
        : {
            href: ROUTES.MESSAGES,
            label: AGENT_INBOX_COPY.MESSAGES,
            unread: messageUnread,
            conversationsOnly,
            ready: !loading,
            refresh,
          },
    [conversationUnread, conversationsOnly, loading, messageUnread, refresh],
  );

  return <AgentInboxContext.Provider value={value}>{children}</AgentInboxContext.Provider>;
}

export function useAgentInbox(): AgentInbox {
  const value = useContext(AgentInboxContext);
  if (!value) throw new Error('useAgentInbox must be used inside AgentInboxProvider');
  return value;
}
