import { api } from '@/lib/api';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import type {
  CancelReviewInput,
  ConfirmReviewInput,
  CreateRentReviewInput,
  RentReviewListResult,
  ResolveNegotiationInput,
  SendTenantNoticeInput,
  ServerRentReviewWorkflowView,
  SetProposedRentInput,
  TenantResponseInput,
} from '@/lib/rent-review-workflow-types';

const BASE = '/leasing/rent-reviews';

const dateOnly = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null);

export function mapRentReviewWorkflowDetail(
  d: ServerRentReviewWorkflowView,
  leaseEndDate: string | null = null,
): RentReviewWorkflowDetail {
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
    leaseEndDate,
    leaseType: d.leaseType,
    createdAt: d.createdAt,
    agentConfirmedDate: d.agentConfirmedDate,
    completedDate: dateOnly(d.completedDate),
    ai: {
      suggestedWeekly: d.ai.suggestedWeekly,
      increasePercent: d.ai.increasePercent,
      rationale: d.ai.rationale,
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

  cancel: (id: string, input: CancelReviewInput, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/cancel`, input)), leaseEndDate),

  postpone: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/postpone`, {})), leaseEndDate),

  runAiAnalysis: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.post<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/ai-analysis`)), leaseEndDate),

  approveAi: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/approve-ai`, {})), leaseEndDate),

  setProposedRent: (
    id: string,
    input: SetProposedRentInput,
    leaseEndDate?: string | null,
  ): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/proposed-rent`, input)), leaseEndDate),

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

  submitAccounting: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.post<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/submit-accounting`)), leaseEndDate),

  complete: (id: string, leaseEndDate?: string | null): Promise<RentReviewWorkflowDetail> =>
    map(unwrap(api.patch<{ review: ServerRentReviewWorkflowView }>(`${BASE}/${id}/complete`, {})), leaseEndDate),
};
