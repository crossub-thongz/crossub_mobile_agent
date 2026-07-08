import { api } from '@/lib/api';

const BASE = '/leasing/cycles';

const unwrap = async <T>(p: Promise<{ cycle: T }>): Promise<T> => (await p).cycle;

export type ArrangeOpenInspectionInput = {
  scheduledTime: string;
  inspectorName?: string;
};

export type ScheduleIngoingInput = {
  scheduledTime: string;
  assignee?: string;
};

/**
 * Leasing-cycle inspection transitions — same `/leasing/cycles` API as crossub_web.
 * Account managers with MODIFY_CUSTOMER_INFO can call these for assigned agencies.
 */
export const leasingOpsApi = {
  arrangeOpenInspection: async (cycleId: string, input: ArrangeOpenInspectionInput) => {
    try {
      return await unwrap(
        api.patch<{ cycle: unknown }>(`${BASE}/${cycleId}/open-inspection/arrange`, input),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('inspectorname')) throw err;
      return unwrap(
        api.patch<{ cycle: unknown }>(`${BASE}/${cycleId}/open-inspection/arrange`, {
          ...input,
          inspectorName: 'Pending assignment',
        }),
      );
    }
  },

  pushInspectionToAgentApp: (cycleId: string) =>
    unwrap(api.patch<{ cycle: unknown }>(`${BASE}/${cycleId}/open-inspection/push-app`, {})),

  notifyAgentToAdvertise: (cycleId: string) =>
    unwrap(
      api.patch<{ cycle: unknown }>(`${BASE}/${cycleId}/open-inspection/notify-advertise`, {}),
    ),

  skipOpenInspection: (cycleId: string) =>
    unwrap(api.patch<{ cycle: unknown }>(`${BASE}/${cycleId}/open-inspection/skip`, {})),

  scheduleIngoingInspection: (cycleId: string, input: ScheduleIngoingInput) =>
    unwrap(
      api.patch<{ cycle: unknown }>(`${BASE}/${cycleId}/onboarding/ingoing/schedule`, input),
    ),
};
