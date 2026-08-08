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

export function quoteStepComplete(rc: ReportComparisonStageState): boolean {
  return (
    quoteStepBondSentToAgent(rc) &&
    quoteStepLandlordQuoteSentToAgent(rc) &&
    quoteStepAgentApprovedLandlordQuote(rc) &&
    quoteStepTenantQuotationSent(rc)
  );
}
