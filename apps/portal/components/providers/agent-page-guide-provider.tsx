'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import type { AgentPageGuideId } from '@/constants/agent-page-guides';
import {
  fetchPageGuidesStatus,
  markPageGuideSeen as markPageGuideSeenApi,
  resetPageGuides as resetPageGuidesApi,
  type AgentPageGuideStatus,
} from '@/lib/crossub-api/agent-client';

type AgentPageGuideContextValue = {
  ready: boolean;
  isSeen: (guideId: AgentPageGuideId) => boolean;
  markSeen: (guideId: AgentPageGuideId, status: AgentPageGuideStatus) => Promise<void>;
  resetGuides: () => Promise<void>;
};

const AgentPageGuideContext = createContext<AgentPageGuideContextValue | null>(null);

export function AgentPageGuideProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [seen, setSeen] = useState<Record<string, AgentPageGuideStatus>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status !== 'authed') {
      setSeen({});
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    void fetchPageGuidesStatus()
      .then((result) => {
        if (!cancelled) {
          setSeen(result.seen);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSeen({});
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const isSeen = useCallback(
    (guideId: AgentPageGuideId) => {
      const value = seen[guideId];
      return value === 'completed' || value === 'skipped';
    },
    [seen],
  );

  const markSeen = useCallback(
    async (guideId: AgentPageGuideId, guideStatus: AgentPageGuideStatus) => {
      setSeen((current) => ({ ...current, [guideId]: guideStatus }));
      try {
        const result = await markPageGuideSeenApi(guideId, guideStatus);
        setSeen(result.seen);
      } catch {
        setSeen((current) => {
          const next = { ...current };
          delete next[guideId];
          return next;
        });
      }
    },
    [],
  );

  const resetGuides = useCallback(async () => {
    const result = await resetPageGuidesApi();
    setSeen(result.seen);
  }, []);

  const value = useMemo(
    () => ({ ready, isSeen, markSeen, resetGuides }),
    [ready, isSeen, markSeen, resetGuides],
  );

  return (
    <AgentPageGuideContext.Provider value={value}>{children}</AgentPageGuideContext.Provider>
  );
}

export function useAgentPageGuides(): AgentPageGuideContextValue {
  const context = useContext(AgentPageGuideContext);
  if (!context) {
    throw new Error('useAgentPageGuides must be used within AgentPageGuideProvider');
  }
  return context;
}
