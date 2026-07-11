/**
 * Server-side shapes for the rent-review live-ops workflow (`/api/leasing/rent-reviews`).
 * Mirrors `crossub_web/apps/web/lib/rent-review-workflow-types.ts`.
 */

export type ServerRentReviewLegacyStatus = 'OPEN' | 'COMPLETED';

export type ServerRentReviewWorkflowState =
  | 'pending_confirmation'
  | 'agent_review'
  | 'tenant_notified'
  | 'negotiation'
  | 'tenant_accepted'
  | 'tenant_rejected'
  | 'accounting'
  | 'completed'
  | 'cancelled'
  | 'postponed';

export type ServerRentReviewAgentDecision =
  | 'rent_review'
  | 'maintain_current_rent'
  | 'lease_termination'
  | 'other';

export type ServerRentReviewMilestoneSource = 'system' | 'ai' | 'agent' | 'tenant' | 'finance';

export interface ServerRentReviewListRow {
  id: string;
  status: ServerRentReviewLegacyStatus;
  propertyId: string | null;
  propertyAddress: string | null;
  orderNumber: string | null;
  currentRent: number | null;
  rentAfterReview: number | null;
  newRent: number | null;
  bond: number | null;
  rentReviewDate: string | null;
  agentConfirmedDate: string | null;
  completedDate: string | null;
  renewalDate: string | null;
  newRentStartsFrom: string | null;
  leaseEndDate: string | null;
  createdAt: string;
}

export interface RentReviewListResult {
  rentReviews: ServerRentReviewListRow[];
  total: number;
}

export interface ServerRentReviewPricingMilestone {
  id: string;
  source: ServerRentReviewMilestoneSource;
  headline: string;
  note: string | null;
  weeklyRent: number;
  workflowPhase: number;
  recordedAt: string;
}

export interface ServerRentReviewAuditEntry {
  id: string;
  actor: string;
  kind: string;
  message: string;
  detail: string | null;
  at: string;
}

export interface ServerRentReviewWorkflowView {
  id: string;
  propertyId: string | null;
  propertyAddress: string | null;
  orderNumber: string | null;
  status: ServerRentReviewLegacyStatus;
  workflowState: ServerRentReviewWorkflowState;
  agentDecision: ServerRentReviewAgentDecision | null;
  tenantName: string | null;
  currentWeeklyRent: number | null;
  proposedWeeklyRent: number | null;
  newRent: number | null;
  effectiveDate: string | null;
  rentReviewDate: string | null;
  leaseType: 'fixed' | 'periodic' | null;
  fixedTermWeeks: number | null;
  initialLeaseStartDate: string | null;
  tenantRef: string | null;
  managingAgentLabel: string | null;
  createdAt: string;
  updatedAt: string;
  agentConfirmedDate: string | null;
  completedDate: string | null;
  ai: {
    suggestedWeekly: number | null;
    increasePercent: number | null;
    rationale: string | null;
  };
  tenantCounterWeekly: number | null;
  tenantMoveOutDate: string | null;
  negotiationNote: string | null;
  cancellationReason: string | null;
  decisionReason: string | null;
  completeLedgerEntryId: string | null;
  pricingMilestones: ServerRentReviewPricingMilestone[];
  auditLog: ServerRentReviewAuditEntry[];
}

export interface CreateRentReviewInput {
  propertyId: string;
  currentWeeklyRent: number;
  tenantName?: string;
  orderNumber?: string;
  rentReviewDate?: string;
  leaseType?: 'fixed' | 'periodic';
  fixedTermWeeks?: number;
  initialLeaseStartDate?: string;
  tenantRef?: string;
  managingAgentLabel?: string;
}

export interface ConfirmReviewInput {
  type: ServerRentReviewAgentDecision;
  reason?: string;
}

export interface CancelReviewInput {
  reason?: string;
}

export interface SetProposedRentInput {
  weekly: number;
  effectiveDate: string;
}

export interface SendTenantNoticeInput {
  weekly?: number;
  effectiveDate?: string;
}

export interface TenantResponseInput {
  decision: 'accept' | 'reject' | 'counter';
  moveOutDate?: string;
  counterWeekly?: number;
}

export interface ResolveNegotiationInput {
  action: 'accept_counter' | 'repropose';
  resolvedWeekly?: number;
  effectiveDate?: string;
}
