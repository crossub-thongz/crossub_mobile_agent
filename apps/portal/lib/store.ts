'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { MessageMention, ThreadMessage } from '@/lib/types';

interface AgentStore {
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  setRentReviewDecision: (
    id: string,
    decision: { action: 'confirmed' | 'custom'; amount?: number },
  ) => void;
  sentThreadMessages: Record<string, ThreadMessage[]>;
  sendThreadMessage: (
    threadId: string,
    body: string,
    from: string,
    mentions?: MessageMention[],
  ) => ThreadMessage;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      rentReviewDecisions: {},
      setRentReviewDecision: (id, decision) =>
        set((s) => ({
          rentReviewDecisions: { ...s.rentReviewDecisions, [id]: decision },
        })),
      sentThreadMessages: {},
      sendThreadMessage: (threadId, body, from, mentions) => {
        const message: ThreadMessage = {
          id: `agent-${Date.now()}`,
          at: new Date().toISOString(),
          from,
          body: body.trim(),
          channel: 'app',
          sentByAgent: true,
          mentions,
        };
        set((s) => ({
          sentThreadMessages: {
            ...s.sentThreadMessages,
            [threadId]: [...(s.sentThreadMessages[threadId] ?? []), message],
          },
        }));
        return message;
      },
    }),
    {
      name: 'crossub-agent-store',
      skipHydration: true,
    },
  ),
);
