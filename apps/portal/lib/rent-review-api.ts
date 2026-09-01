import { api, apiV1 } from '@/lib/api';
import type {
  RentPlatformResearch,
  RentPlatformResearchStatus,
  RentReviewWorkflowDetail,
} from '@/lib/rent-review/types';
import {
  toDateOnly,
} from '@/lib/rent-review/scheduling';
import type {
  CancelReviewInput,
  ConfirmReviewInput,
  CreateRentReviewInput,
  RentReviewListResult,
  ResolveNegotiationInput,
  SendTenantNoticeInput,
  SendRentReviewEmailInput,
  ServerRentReviewWorkflowView,
  SetProposedRentInput,
  SetRecommendedRentInput,
  TenantResponseInput,
} from '@/lib/rent-review-workflow-types';

const BASE = '/leasing/rent-reviews';

const agentRentReviewWorkflowPath = (propertyId: string, id: string) =>
  `/agent/properties/${encodeURIComponent(propertyId)}/workflows/rent-review/${encodeURIComponent(id)}`;

const dateOnly = (iso: string | null): string | null => toDateOnly(iso);

function resolveLeaseEndDate(
  d: ServerRentReviewWorkflowView,
  leaseEndDate: string | null,
): string | null {
  if (leaseEndDate) return leaseEndDate;
  if (d.leaseEndDate) return dateOnly(d.leaseEndDate);
  return null;
}

export function mapRentReviewWorkflowDetail(
  d: ServerRentReviewWorkflowView,
  leaseEndDate: string | null = null,
): RentReviewWorkflowDetail {
  const resolvedLeaseEnd = resolveLeaseEndDate(d, leaseEndDate);
  return {
    id: d.id,
    propertyId: d.propertyId,
    propertyAddress: d.propertyAddress ?? '—',
    tenantName: d.tenantName ?? '—',
    workflowState: d.workflowState,
    legacyStatus: d.status,
    currentWeeklyRent: d.currentWeeklyRent ?? 0,
    proposedWeeklyRent: d.proposedWeeklyRent,
    effectiveDate: dateOnly(d.effectiveDate),
    rentReviewDate: dateOnly(d.rentReviewDate),
    leaseEndDate: resolvedLeaseEnd,
    leaseType: d.leaseType,
    fixedTermWeeks: d.fixedTermWeeks,
    initialLeaseStartDate: dateOnly(d.initialLeaseStartDate),
    rentNegotiable: d.rentNegotiable,
    preferredLeaseType: d.preferredLeaseType,
    newAgreementStart: dateOnly(d.newAgreementStart),
    newAgreementEnd: dateOnly(d.newAgreementEnd),
    leaseAdditionalTerms: d.leaseAdditionalTerms,
    leaseAdditionalTermsPets: d.leaseAdditionalTermsPets,
    createdAt: d.createdAt,
    agentConfirmedDate: d.agentConfirmedDate,
    completedDate: dateOnly(d.completedDate),
    ai: {
      suggestedWeekly: d.ai.suggestedWeekly,
      increasePercent: d.ai.increasePercent,
      rationale: d.ai.rationale,
      // The wire types `id` and `status` as bare strings while this app mirrors the API's
      // own platform ids and status set as unions. Narrowing only those two fields keeps
      // the rest of the snapshot type-checked, and carries an unrecognised value through
      // rather than dropping the row — the panel already renders unknown statuses as a
      // plain pending row.
      research: d.ai.research
        ? {
            ...d.ai.research,
            platforms: d.ai.research.platforms.map((platform) => ({
              ...platform,
              id: platform.id as RentPlatformResearch['id'],
              status: platform.status as RentPlatformResearchStatus,
            })),
          }
        : null,
    },
    tenantCounterWeekly: d.tenantCounterWeekly,
    tenantMoveOutDate: dateOnly(d.tenantMoveOutDate),
    negotiationNote: d.negotiationNote,
    decisionReason: d.decisionReason,
    cancellationReason: d.cancellationReason,
    auditLog: d.auditLog.map((a) => ({
      id: a.id,
      at: a.at,
      actor: a.actor,
      kind: a.kind,
      message: a.message,
      detail: a.detail ?? undefined,
    })),
    pricingMilestones: d.pricingMilestones.map((m) => ({
      id: m.id,
      source: m.source,
      headline: m.headline,
      note: m.note ?? undefined,
      weeklyRent: m.weeklyRent,
      workflowPhase: m.workflowPhase,
      recordedAt: m.recordedAt,
    })),
  };
}

const unwrap = async (
  p: Promise<{ review: ServerRentReviewWorkflowView }>,
): Promise<ServerRentReviewWorkflowView> => (await p).review;

const map = (
  p: Promise<ServerRentReviewWorkflowView>,
  leaseEndDate?: string | null,
): Promise<RentReviewWorkflowDetail> =>
  p.then((d) => mapRentReviewWorkflowDetail(d, leaseEndDate ?? null));

export const rentReviewApi = {
  async list(params?: {
    status?: 'OPEN' | 'COMPLETED';
    active?: boolean;
    pageSize?: number;
    search?: string;
  }): Promise<RentReviewListResult> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.active) q.set('active', 'true');
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return api.get<RentReviewListResult>(`${BASE}${qs ? `?${qs}` : ''}`);
  },

  get: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.get<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/workflow`)), leaseEndDate),

  create: (input: CreateRentReviewInput, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.post<{ review: ServerRentReviewWorkflowView }>(BASE, input)), leaseEndDate),

  confirm: (id: string, input: ConfirmReviewInput, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/confirm`, input)), leaseEndDate),

  /** Staff-opened reviews stay pending until this runs; sending the owner pack does not. */
  confirmPathwayIfPending: (
    detail: RentReviewWorkflowDetail,
  ): Promise<RentReviewWorkflowDetail> => {
    if (detail.workflowState !== 'pending_confirmation') {
      return Promise.resolve(detail);
    }
    return rentReviewApi.confirm(detail.id, { type: 'rent_review' }, detail.leaseEndDate);
  },

  cancel: (id: string, input: CancelReviewInput, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/cancel`, input)), leaseEndDate),

  postpone: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/postpone`, {})), leaseEndDate),

  runAiAnalysis: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.post<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/ai-analysis`)), leaseEndDate),

  approveAi: (
    id: string,
    propertyId?: string | null,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> => {
    if (propertyId) {
      return map(
        unwrap(
          apiV1.patch<{ review: ServerRentReviewWorkflowView }>(
            `${agentRentReviewWorkflowPath(propertyId, id)}/approve-ai`,
            {},
          ),
        ),
        leaseEndDate,
      );
    }
    return map(
      unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/approve-ai`, {})),
      leaseEndDate,
    );
  },

  /**
   * Adjust the recommended rent, or clear the adjustment (`weekly: null`).
   *
   * The response is the whole review, so the caller's `onUpdated` refreshes the rate
   * everywhere it is quoted — including the landlord email draft, which reads the same
   * `ai.suggestedWeekly` this writes.
   */
  setRecommendedRent: (
    id: string,
    input: SetRecommendedRentInput,
    propertyId?: string | null,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> => {
    if (propertyId) {
      return map(
        unwrap(
          apiV1.patch<{ review: ServerRentReviewWorkflowView }>(
            `${agentRentReviewWorkflowPath(propertyId, id)}/recommended-rent`,
            input,
          ),
        ),
        leaseEndDate,
      );
    }
    return map(
      unwrap(
        api.patch<{ review: ServerRentReviewWorkflowView }>(
          `${BASE}/${id}/recommended-rent`,
          input,
        ),
      ),
      leaseEndDate,
    );
  },

  setProposedRent: (
    id: string,
    input: SetProposedRentInput,
    propertyId?: string | null,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> => {
    if (propertyId) {
      return map(
        unwrap(
          apiV1.patch<{ review: ServerRentReviewWorkflowView }>(
            `${agentRentReviewWorkflowPath(propertyId, id)}/proposed-rent`,
            input,
          ),
        ),
        leaseEndDate,
      );
    }
    return map(
      unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/proposed-rent`, input)),
      leaseEndDate,
    );
  },

  updateNoticePayableFrom: (
    id: string,
    payableFrom: string,
    propertyId?: string | null,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> => {
    const body = { payableFrom };
    if (propertyId) {
      return map(
        unwrap(
          apiV1.patch<{ review: ServerRentReviewWorkflowView }>(
            `${agentRentReviewWorkflowPath(propertyId, id)}/notice-payable-from`,
            body,
          ),
        ),
        leaseEndDate,
      );
    }
    return map(
      unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/notice-payable-from`, body)),
      leaseEndDate,
    );
  },

  updateLeaseAgreementTerms: (
    id: string,
    input: { additionalTerms?: string | null; additionalTermsPets?: string | null },
    propertyId?: string | null,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> => {
    if (propertyId) {
      return map(
        unwrap(
          apiV1.patch<{ review: ServerRentReviewWorkflowView }>(
            `${agentRentReviewWorkflowPath(propertyId, id)}/lease-agreement-terms`,
            input,
          ),
        ),
        leaseEndDate,
      );
    }
    return map(
      unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/lease-agreement-terms`, input)),
      leaseEndDate,
    );
  },

  sendTenantNotice: (
    id: string,
    input: SendTenantNoticeInput,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.post<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/tenant-notice`, input)), leaseEndDate),

  downloadNoticeOfRentIncrease: (
    id: string,
    params?: { weekly?: number; effectiveDate?: string },
  ): Promise<Blob> => {
    const q = new URLSearchParams();
    if (params?.weekly != null && Number.isFinite(params.weekly)) {
      q.set('weekly', String(params.weekly));
    }
    if (params?.effectiveDate?.trim()) q.set('effectiveDate', params.effectiveDate.trim());
    const qs = q.toString();
    return api.getBlob(`${BASE}/${id}/notice-of-rent-increase.pdf${qs ? `?${qs}` : ''}`);
  },

  downloadLeaseExtensionAgreement: (
    id: string,
    params?: { weekly?: number; draft?: boolean; propertyId?: string },
  ): Promise<Blob> => {
    const q = new URLSearchParams();
    if (params?.weekly != null && Number.isFinite(params.weekly)) {
      q.set('weekly', String(params.weekly));
    }
    if (params?.draft) q.set('draft', '1');
    const qs = q.toString();
    if (params?.propertyId) {
      return apiV1.getBlob(
        `${agentRentReviewWorkflowPath(params.propertyId, id)}/lease-extension-agreement.pdf${qs ? `?${qs}` : ''}`,
      );
    }
    return api.getBlob(`${BASE}/${id}/lease-extension-agreement.pdf${qs ? `?${qs}` : ''}`);
  },

  tenantResponse: (
    id: string,
    input: TenantResponseInput,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/tenant-response`, input)), leaseEndDate),

  resolveNegotiation: (
    id: string,
    input: ResolveNegotiationInput,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/resolve-negotiation`, input)),
      leaseEndDate,
    ),

  submitAccounting: (
    id: string,
    propertyId: string,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(
        apiV1.post<{ review: ServerRentReviewWorkflowView }>(
          `${agentRentReviewWorkflowPath(propertyId, id)}/submit-accounting`,
        ),
      ),
      leaseEndDate,
    ),

  sendLeaseAgreement: (
    id: string,
    propertyId: string,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(
        apiV1.post<{ review: ServerRentReviewWorkflowView }>(
          `${agentRentReviewWorkflowPath(propertyId, id)}/send-lease-agreement`,
        ),
      ),
      leaseEndDate,
    ),

  recordLeaseAgreementSigned: (
    id: string,
    propertyId: string,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(
        apiV1.post<{ review: ServerRentReviewWorkflowView }>(
          `${agentRentReviewWorkflowPath(propertyId, id)}/lease-agreement-signed`,
        ),
      ),
      leaseEndDate,
    ),

  complete: (
    id: string,
    propertyId: string,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(
        apiV1.patch<{ review: ServerRentReviewWorkflowView }>(
          `${agentRentReviewWorkflowPath(propertyId, id)}/complete`,
          {},
        ),
      ),
      leaseEndDate,
    ),

  getCommunications: (
    id: string,
    propertyId: string,
  ): Promise<{ communications: Array<{
    id: string;
    subject: string;
    body: string;
    from: string;
    to: string;
    toEmail?: string;
    at: string;
    kind: string;
    channel?: 'email' | 'message';
    attachments?: Array<{ name: string; sizeLabel?: string }>;
  }> }> =>
    apiV1.get(`${agentRentReviewWorkflowPath(propertyId, id)}/communications`),

  sendEmail: (
    id: string,
    input: SendRentReviewEmailInput,
    propertyId: string,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(
        apiV1.post<{ review: ServerRentReviewWorkflowView }>(
          `${agentRentReviewWorkflowPath(propertyId, id)}/emails`,
          input,
        ),
      ),
      leaseEndDate,
    ),

  requestMarketResearch: (
    id: string,
    propertyId: string,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(
      unwrap(
        apiV1.post<{ review: ServerRentReviewWorkflowView }>(
          `${agentRentReviewWorkflowPath(propertyId, id)}/request-research`,
          {},
        ),
      ),
      leaseEndDate,
    ),
};
