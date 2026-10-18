import { TENANT_REPAIR_RESPONSE } from '@/constants/end-leasing';

import type { ReportComparisonStageState } from './types';

export type AgentLandlordQuoteResponse = 'none' | 'pending' | 'approved' | 'declined';

export function quoteStepHasLandlordItems(
  rc: Pick<ReportComparisonStageState, 'landlordResponsibility'> | null | undefined,
): boolean {
  return (rc?.landlordResponsibility ?? []).length > 0;
}

export function deriveAgentLandlordQuoteResponse(
  rc: ReportComparisonStageState | null | undefined,
): AgentLandlordQuoteResponse {
  const raw = rc?.agentLandlordQuoteResponse;
  if (raw === 'approved' || raw === 'declined' || raw === 'pending') return raw;
  if (!quoteStepHasLandlordItems(rc)) return 'none';
  if (rc?.agentRepairQuoteEmail?.sentAt) return 'pending';
  return 'none';
}

export function quoteStepBondSentToAgent(rc: ReportComparisonStageState): boolean {
  return Boolean(rc.agentBondDeductionProposalEmail?.sentAt);
}

export function quoteStepLandlordQuoteSentToAgent(rc: ReportComparisonStageState): boolean {
  if (!quoteStepHasLandlordItems(rc)) return true;
  return Boolean(rc.agentRepairQuoteEmail?.sentAt);
}

export function quoteStepAgentApprovedLandlordQuote(rc: ReportComparisonStageState): boolean {
  if (!quoteStepHasLandlordItems(rc)) return true;
  return deriveAgentLandlordQuoteResponse(rc) === 'approved';
}

export function quoteStepTenantQuotationSent(rc: ReportComparisonStageState): boolean {
  return Boolean(rc.tenantBondDeductionAckEmail?.sentAt);
}

export function canAgentSendTenantQuotation(rc: ReportComparisonStageState): boolean {
  return (
    quoteStepBondSentToAgent(rc) &&
    quoteStepLandlordQuoteSentToAgent(rc) &&
    quoteStepAgentApprovedLandlordQuote(rc)
  );
}

/**
 * The API's lock on the tenant list (`updateReportComparison`): once the tenant has the repair
 * quotation or the bond acknowledgement, the list can't change while their answer is pending or
 * yes — unless they disagreed with the responsibility list.
 */
export function tenantRepairItemsLocked(rc: ReportComparisonStageState): boolean {
  const quotationSent = Boolean(rc.tenantRepairQuoteEmail?.sentAt || rc.tenantBondDeductionAckEmail?.sentAt);
  return (
    quotationSent &&
    rc.tenantResponsibilityReviewStatus !== TENANT_REPAIR_RESPONSE.DECLINED &&
    (rc.tenantQuoteResponse === TENANT_REPAIR_RESPONSE.PENDING ||
      rc.tenantQuoteResponse === TENANT_REPAIR_RESPONSE.ACCEPTED)
  );
}

export function quoteStepComplete(rc: ReportComparisonStageState): boolean {
  return (
    quoteStepBondSentToAgent(rc) &&
    quoteStepLandlordQuoteSentToAgent(rc) &&
    quoteStepAgentApprovedLandlordQuote(rc) &&
    quoteStepTenantQuotationSent(rc)
  );
}
