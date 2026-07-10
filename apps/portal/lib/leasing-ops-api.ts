import { api } from '@/lib/api';
import type {
  CreateManualApplicantInput,
  SendViewerInvitesInput,
  ServerLeasingCycleView,
  SetApplicantDecisionInput,
  UploadApplicantDocumentInput,
} from '@/lib/leasing-cycle-types';

const BASE = '/leasing/cycles';

const unwrap = async (
  p: Promise<{ cycle: ServerLeasingCycleView }>,
): Promise<ServerLeasingCycleView> => (await p).cycle;

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
  get: (cycleId: string) => unwrap(api.get<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}`)),

  arrangeOpenInspection: async (cycleId: string, input: ArrangeOpenInspectionInput) => {
    try {
      return await unwrap(
        api.patch<{ cycle: ServerLeasingCycleView }>(
          `${BASE}/${cycleId}/open-inspection/arrange`,
          input,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes('inspectorname')) throw err;
      return unwrap(
        api.patch<{ cycle: ServerLeasingCycleView }>(
          `${BASE}/${cycleId}/open-inspection/arrange`,
          {
            ...input,
            inspectorName: 'Pending assignment',
          },
        ),
      );
    }
  },

  pushInspectionToAgentApp: (cycleId: string) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/open-inspection/push-app`, {}),
    ),

  notifyAgentToAdvertise: (cycleId: string) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/open-inspection/notify-advertise`,
        {},
      ),
    ),

  skipOpenInspection: (cycleId: string) =>
    unwrap(api.patch<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/open-inspection/skip`, {})),

  cancelCycle: (cycleId: string) =>
    unwrap(api.patch<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/cancel`, {})),

  scheduleIngoingInspection: (cycleId: string, input: ScheduleIngoingInput) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/onboarding/ingoing/schedule`,
        input,
      ),
    ),

  recordSigning: (cycleId: string) =>
    unwrap(api.patch<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/contract/sign`, {})),

  downloadAgreementPdf: (cycleId: string): Promise<Blob> =>
    api.getBlob(`${BASE}/${cycleId}/contract/agreement.pdf`),

  // Step 2
  sendReportToAgent: (cycleId: string) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/open-report/send-agent`, {}),
    ),

  sendViewerInvites: (cycleId: string, input: SendViewerInvitesInput) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/open-report/send-invites`,
        input,
      ),
    ),

  // Step 3
  toggleApplicantSelected: (cycleId: string, applicationId: string) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/applications/${applicationId}/select`,
        {},
      ),
    ),

  sendSelectedToAgent: (cycleId: string) =>
    unwrap(
      api.post<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/applications/send-to-agent`),
    ),

  createManualApplicant: (cycleId: string, input: CreateManualApplicantInput) =>
    unwrap(
      api.post<{ cycle: ServerLeasingCycleView }>(`${BASE}/${cycleId}/applications/manual`, input),
    ),

  uploadApplicantDocument: (
    cycleId: string,
    applicationId: string,
    input: UploadApplicantDocumentInput,
  ) =>
    unwrap(
      api.post<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/applications/${applicationId}/documents`,
        input,
      ),
    ),

  setApplicantDecision: (
    cycleId: string,
    applicationId: string,
    input: SetApplicantDecisionInput,
  ) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/applications/${applicationId}/decision`,
        input,
      ),
    ),

  setBondLink: (cycleId: string, input: { link: string }) =>
    unwrap(
      api.patch<{ cycle: ServerLeasingCycleView }>(
        `${BASE}/${cycleId}/onboarding/bond-link`,
        input,
      ),
    ),
};
