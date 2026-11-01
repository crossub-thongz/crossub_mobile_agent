'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { CROS_TODAY_REFRESH_MS, type NeedsYouGroup } from '@/constants/gii-briefing';
import { usePortfolioTaskRows } from '@/hooks/use-portfolio-task-rows';
import { getGiiBriefing, type GiiServerBriefing, type GiiServerBriefingItem } from '@/lib/crossub-api/gii-client';
import {
  briefingExtraTasks,
  briefingNotOnTasks,
  needActionTaskRows,
  needsYouByGroup,
} from '@/lib/gii-server-briefing';
import type { TaskListV2Row } from '@/lib/task-list-v2';

type CrosToday = {
  /** Cros's list as the server has it now, or null until it loads or when it cannot be read. */
  briefing: GiiServerBriefing | null;
  /** The Tasks page's "Needs My Action" rows the briefing does not list. */
  extraTasks: TaskListV2Row[];
  /** Briefing rows the Tasks page does not list (money owed, messages, leases ending). */
  notOnTasks: GiiServerBriefingItem[];
  /** What needs the agent: the one number every badge shows. */
  total: number;
  /** `total` split into the dashboard's parts; they add up to it. */
  byGroup: Record<NeedsYouGroup, number>;
  refresh: () => void;
};

const CrosTodayContext = createContext<CrosToday | null>(null);

/**
 * What needs the agent today, read once for the whole app: the server briefing plus the Tasks
 * rows it does not cover. The Cros button, Cros's Today tab, the dashboard and the Tasks badge all
 * show `total`, so they never disagree. Read again when the agent comes back to the app, when the
 * task list changes, and every few minutes. Until the briefing loads, or when it cannot be read,
 * the count is the Tasks page's "Needs My Action".
 */
export function CrosTodayProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const signedIn = status === 'authed';
  const taskRows = usePortfolioTaskRows();
  const [briefing, setBriefing] = useState<GiiServerBriefing | null>(null);
  const [readCount, setReadCount] = useState(0);
  const refresh = useCallback(() => setReadCount((n) => n + 1), []);

  const needAction = useMemo(() => needActionTaskRows(taskRows), [taskRows]);
  // A task done or added anywhere in the app changes this, and the server list is read again.
  const needActionKey = useMemo(() => needAction.map((row) => row.id).join(','), [needAction]);

  useEffect(() => {
    if (!signedIn) {
      setBriefing(null);
      return;
    }
    let live = true;
    getGiiBriefing()
      .then((next) => {
        if (live) setBriefing(next);
      })
      .catch(() => {
        if (live) setBriefing(null);
      });
    return () => {
      live = false;
    };
  }, [needActionKey, readCount, signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(refresh, CROS_TODAY_REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refresh, signedIn]);

  const value = useMemo<CrosToday>(() => {
    if (!briefing) {
      return {
        briefing: null,
        extraTasks: [],
        notOnTasks: [],
        total: needAction.length,
        byGroup: needsYouByGroup(null, needAction),
        refresh,
      };
    }
    const extraTasks = briefingExtraTasks(briefing, taskRows);
    return {
      briefing,
      extraTasks,
      notOnTasks: briefingNotOnTasks(briefing, taskRows),
      total: briefing.total + extraTasks.length,
      byGroup: needsYouByGroup(briefing, extraTasks),
      refresh,
    };
  }, [briefing, needAction, refresh, taskRows]);

  return <CrosTodayContext.Provider value={value}>{children}</CrosTodayContext.Provider>;
}

export function useCrosToday(): CrosToday {
  const value = useContext(CrosTodayContext);
  if (!value) throw new Error('useCrosToday must be used inside CrosTodayProvider');
  return value;
}
