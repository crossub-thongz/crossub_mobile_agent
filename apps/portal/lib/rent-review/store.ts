import { create } from 'zustand';

import { rentReviewApi } from '@/lib/rent-review-api';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';

type LoadStatus = 'idle' | 'loading' | 'error';

interface RentReviewStore {
  cases: Record<string, RentReviewWorkflowDetail>;
  status: Record<string, LoadStatus>;
  error: Record<string, string | undefined>;
  leaseEndDates: Record<string, string | null>;

  loadCase: (id: string, leaseEndDate?: string | null) => Promise<RentReviewWorkflowDetail | null>;
  applyCase: (detail: RentReviewWorkflowDetail) => void;
  getCase: (id: string) => RentReviewWorkflowDetail | undefined;
  runMutation: (
    id: string,
    op: Promise<RentReviewWorkflowDetail>,
  ) => Promise<RentReviewWorkflowDetail>;
}

export const useRentReviewStore = create<RentReviewStore>((set, get) => {
  const apply = (updated: RentReviewWorkflowDetail) =>
    set((s) => ({
      cases: { ...s.cases, [updated.id]: updated },
      status: { ...s.status, [updated.id]: 'idle' as const },
      error: { ...s.error, [updated.id]: undefined },
    }));

  return {
    cases: {},
    status: {},
    error: {},
    leaseEndDates: {},

    applyCase: apply,

    getCase: (id) => get().cases[id],

    loadCase: async (id, leaseEndDate) => {
      const cached = get().cases[id];
      const storedLeaseEnd = leaseEndDate ?? get().leaseEndDates[id] ?? null;
      if (leaseEndDate !== undefined) {
        set((s) => ({
          leaseEndDates: { ...s.leaseEndDates, [id]: leaseEndDate ?? null },
        }));
      }
      set((s) => ({
        status: { ...s.status, [id]: cached ? s.status[id] : 'loading' },
      }));
      try {
        const detail = await rentReviewApi.get(id, storedLeaseEnd);
        apply(detail);
        return detail;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load rent review';
        set((s) => ({
          status: { ...s.status, [id]: 'error' },
          error: { ...s.error, [id]: message },
        }));
        return null;
      }
    },

    runMutation: async (id, op) => {
      const updated = await op;
      apply(updated);
      return updated;
    },
  };
});
