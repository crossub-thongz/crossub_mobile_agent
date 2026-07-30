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
  clearCachedPageGuides,
  markCachedPageGuide,
  mergePageGuideSeenMaps,
  readCachedPageGuides,
  writeCachedPageGuides,
} from '@/lib/agent-page-guide-cache';
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
  const { user, status } = useAuth();
  const userId = user?.id ?? null;
  const [seen, setSeen] = useState<Record<string, AgentPageGuideStatus>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status !== 'authed' || !userId) {
      setSeen({});
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    const cached = readCachedPageGuides(userId);
    if (Object.keys(cached).length > 0) {
      setSeen(cached);
    }

    void fetchPageGuidesStatus()
      .then((result) => {
        if (!cancelled) {
          const merged = mergePageGuideSeenMaps(cached, result.seen);
          setSeen(merged);
          writeCachedPageGuides(userId, merged);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSeen(cached);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  const isSeen = useCallback(
    (guideId: AgentPageGuideId) => {
      const value = seen[guideId];
      return value === 'completed' || value === 'skipped';
    },
    [seen],
  );

  const markSeen = useCallback(
    async (guideId: AgentPageGuideId, guideStatus: AgentPageGuideStatus) => {
      if (!userId) return;

      const optimistic = markCachedPageGuide(userId, guideId, guideStatus);
      setSeen(optimistic);

      try {
        const result = await markPageGuideSeenApi(guideId, guideStatus);
        const merged = mergePageGuideSeenMaps(optimistic, result.seen);
        setSeen(merged);
        writeCachedPageGuides(userId, merged);
      } catch {
        // Keep optimistic + cached state — do not re-show the guide when the API is unavailable.
      }
    },
    [userId],
  );

  const resetGuides = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await resetPageGuidesApi();
      setSeen(result.seen);
      writeCachedPageGuides(userId, result.seen);
    } catch {
      clearCachedPageGuides(userId);
      setSeen({});
      throw new Error('Failed to reset page guides');
    }
  }, [userId]);

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
