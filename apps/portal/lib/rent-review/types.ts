import type { ServerRentReviewWorkflowState } from '@/lib/rent-review-workflow-types';

export type RentReviewWorkflowState = ServerRentReviewWorkflowState;

export type RentReviewAuditKind =
  | 'statutory_notice_alert'
  | 'agent_confirmation_reminder'
  | 'tenant_response_reminder'
  | 'tenant_notices_dispatched'
  | 'ai_report_ready'
  | 'pricing_snapshot'
  | 'tenant_accepted_response'
  | 'tenant_rejected_response'
  | 'tenant_counter_submitted'
  | 'agent_accepted_tenant_counter'
  | 'agent_reproposed_after_counter'
  | 'lease_agreement_preparing'
  | 'lease_agreement_sent'
  | 'lease_agreement_signed'
  | 'accounting_handoff'
  | 'ledger_complete'
  | 'review_confirmed'
  | 'review_cancelled'
  | 'review_postponed'
  | string;

export interface RentReviewAuditEntry {
  id: string;
  at: string;
  actor: string;
  kind: RentReviewAuditKind;
  message: string;
  detail?: string;
}

export interface RentReviewPricingMilestone {
  id: string;
  source: string;
  headline: string;
  note?: string;
  weeklyRent: number;
  workflowPhase: number;
  recordedAt: string;
}

/** Rich workflow detail for the agent portal 5-stage rent review flow. */
export interface RentReviewWorkflowDetail {
  id: string;
  propertyId: string | null;
  propertyAddress: string;
  tenantName: string;
  workflowState: RentReviewWorkflowState;
  legacyStatus: 'OPEN' | 'COMPLETED';
  currentWeeklyRent: number;
  proposedWeeklyRent: number | null;
  effectiveDate: string | null;
  rentReviewDate: string | null;
  leaseEndDate: string | null;
  leaseType: 'fixed' | 'periodic' | null;
  fixedTermWeeks: number | null;
  initialLeaseStartDate: string | null;
  rentNegotiable: boolean | null;
  preferredLeaseType: 'fixed' | 'periodic' | null;
  newAgreementStart: string | null;
  newAgreementEnd: string | null;
  createdAt: string;
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
  decisionReason: string | null;
  cancellationReason: string | null;
  auditLog: RentReviewAuditEntry[];
  pricingMilestones: RentReviewPricingMilestone[];
}
