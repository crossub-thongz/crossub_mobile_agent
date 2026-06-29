'use client';

import { create } from 'zustand';

import { VACATING_LIFECYCLE_STEP, type VacatingLifecycleStep } from '@/lib/vacating/constants';
import { vacatingCaseToDetail } from '@/lib/vacating/seed';
import type { VacatingPropertyDetail } from '@/lib/vacating/types';
import type { Inspection, VacatingCase } from '@/lib/types';

type VacatingWorkflowStore = {
  details: Record<string, VacatingPropertyDetail>;
  activeStepByVacating: Record<string, VacatingLifecycleStep>;
  ensureDetail: (vacatingCase: VacatingCase, outgoingInspection?: Inspection) => VacatingPropertyDetail;
  getDetail: (vacatingId: string) => VacatingPropertyDetail | undefined;
  getActiveStep: (vacatingId: string) => VacatingLifecycleStep;
  setActiveStep: (vacatingId: string, step: VacatingLifecycleStep) => void;
  resetActiveStepToHint: (vacatingId: string, hint?: VacatingLifecycleStep) => void;
};

export const useVacatingWorkflowStore = create<VacatingWorkflowStore>((set, get) => ({
  details: {},
  activeStepByVacating: {},

  ensureDetail(vacatingCase, outgoingInspection) {
    const detail = vacatingCaseToDetail(vacatingCase, outgoingInspection);
    set((s) => ({
      details: { ...s.details, [vacatingCase.id]: detail },
      activeStepByVacating: {
        ...s.activeStepByVacating,
        [vacatingCase.id]:
          s.activeStepByVacating[vacatingCase.id] ?? detail.activeStepHint,
      },
    }));
    return detail;
  },

  getDetail(vacatingId) {
    return get().details[vacatingId];
  },

  getActiveStep(vacatingId) {
    return (
      get().activeStepByVacating[vacatingId] ??
      get().details[vacatingId]?.activeStepHint ??
      VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION
    );
  },

  setActiveStep(vacatingId, step) {
    set((s) => ({
      activeStepByVacating: { ...s.activeStepByVacating, [vacatingId]: step },
    }));
  },

  resetActiveStepToHint(vacatingId, hint) {
    const step = hint ?? get().details[vacatingId]?.activeStepHint;
    if (!step) return;
    set((s) => ({
      activeStepByVacating: { ...s.activeStepByVacating, [vacatingId]: step },
    }));
  },
}));
