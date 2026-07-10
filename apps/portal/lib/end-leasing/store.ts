'use client';

import { create } from 'zustand';
import { toast } from 'sonner';

import { TERMINATION_STAGE, type TerminationStage } from '@/constants/end-leasing';
import { activeStageForCase } from '@/lib/end-leasing/lifecycle';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { terminationApi } from '@/lib/termination-case-api';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface EndLeasingStoreState {
  cases: Record<string, TerminationCaseDetail>;
  status: Record<string, LoadStatus>;
  error: Record<string, string | null>;
  activeStageByCase: Record<string, TerminationStage>;
  settlementDialogOpen: boolean;

  loadCase: (id: string) => Promise<TerminationCaseDetail | null>;
  applyCase: (detail: TerminationCaseDetail) => void;
  getCase: (id: string) => TerminationCaseDetail | undefined;
  setActiveStage: (id: string, stage: TerminationStage) => void;
  getActiveStage: (id: string, detail?: TerminationCaseDetail) => TerminationStage;
  setSettlementDialogOpen: (open: boolean) => void;

  agentApprove: (id: string) => Promise<void>;
  agentReject: (id: string, proposedDeductions: number) => Promise<void>;
  scheduleInspection: (id: string, inspector: string, date: string) => Promise<void>;
}

export const useEndLeasingStore = create<EndLeasingStoreState>((set, get) => {
  const apply = (updated: TerminationCaseDetail) =>
    set((s) => ({
      cases: { ...s.cases, [updated.id]: updated },
      activeStageByCase: {
        ...s.activeStageByCase,
        [updated.id]: activeStageForCase(updated),
      },
    }));

  const run = async (id: string, op: Promise<TerminationCaseDetail>): Promise<void> => {
    try {
      apply(await op);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  };

  return {
    cases: {},
    status: {},
    error: {},
    activeStageByCase: {},
    settlementDialogOpen: false,

    async loadCase(id) {
      set((s) => ({
        status: { ...s.status, [id]: 'loading' },
        error: { ...s.error, [id]: null },
      }));
      try {
        const detail = await terminationApi.get(id);
        apply(detail);
        set((s) => ({
          status: { ...s.status, [id]: 'ready' },
          activeStageByCase: {
            ...s.activeStageByCase,
            [id]: s.activeStageByCase[id] ?? activeStageForCase(detail),
          },
        }));
        return detail;
      } catch (err) {
        const message = apiErrorMessage(err);
        set((s) => ({
          status: { ...s.status, [id]: 'error' },
          error: { ...s.error, [id]: message },
        }));
        return null;
      }
    },

    getCase(id) {
      return get().cases[id];
    },

    applyCase(detail) {
      apply(detail);
    },

    setActiveStage(id, stage) {
      set((s) => ({
        activeStageByCase: { ...s.activeStageByCase, [id]: stage },
      }));
    },

    getActiveStage(id, detail) {
      const stored = get().activeStageByCase[id];
      if (stored) return stored;
      if (detail) return activeStageForCase(detail);
      return TERMINATION_STAGE.KEY_RETURN;
    },

    setSettlementDialogOpen(open) {
      set({ settlementDialogOpen: open });
    },

    agentApprove: (id) => run(id, terminationApi.agentApprove(id)),
    agentReject: (id, proposedDeductions) =>
      run(id, terminationApi.agentReject(id, proposedDeductions)),
    scheduleInspection: (id, inspector, date) =>
      run(id, terminationApi.scheduleInspection(id, { inspector, date })),
  };
});
