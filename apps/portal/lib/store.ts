'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AgentStore {
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  setRentReviewDecision: (
    id: string,
    decision: { action: 'confirmed' | 'custom'; amount?: number },
  ) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      rentReviewDecisions: {},
      setRentReviewDecision: (id, decision) =>
        set((s) => ({
          rentReviewDecisions: { ...s.rentReviewDecisions, [id]: decision },
        })),
    }),
    {
      name: 'crossub-agent-store',
      skipHydration: true,
    },
  ),
);
