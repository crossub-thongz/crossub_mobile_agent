import type { components } from '@crossub-thongz/api-contract';

import { unwrapCrossubResult } from '@/lib/utils/unwrap-crossub-result';

import { crossub } from './client';

/** Self-Manage end of lease (Phase 2): `/agent/end-leasing/:caseId/*`. Each returns `{ id }`; re-read the case after. */
export type SelfManagedSettlementBreakdownInput = components['schemas']['EditVacatingSettlementDto'];
export type SelfManagedReportComparisonInput = components['schemas']['UpdateReportComparisonDto'];
export type SelfManagedReportComparisonItemInput = components['schemas']['ReportComparisonRepairItemDto'];
export type SelfManagedSettlementMethodInput = components['schemas']['SetVacatingSettlementMethodDto'];

const casePath = (caseId: string) => ({ path: { caseId } });

export async function updateSelfManagedReportComparison(
  caseId: string,
  body: SelfManagedReportComparisonInput,
) {
  const result = await crossub.PATCH('/agent/end-leasing/{caseId}/report-comparison', {
    params: casePath(caseId),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't save the report comparison");
}

/** The tenant's repair quotation and bond deductions; no CROSSUB proposal or landlord quotation first. */
export async function sendSelfManagedTenantBondAcknowledgement(
  caseId: string,
  tenantResponsibility: SelfManagedReportComparisonItemInput[],
) {
  const result = await crossub.POST('/agent/end-leasing/{caseId}/report-comparison/tenant-bond-acknowledgement', {
    params: casePath(caseId),
    body: { tenantResponsibility },
  });
  return unwrapCrossubResult(result, "Couldn't send the quotation to the tenant");
}

/** The landlord-responsibility quotation to the owner; a keyed-in quote and contractor per item, no CROSSUB job. */
export async function sendSelfManagedLandlordQuotation(caseId: string) {
  const result = await crossub.POST('/agent/end-leasing/{caseId}/report-comparison/landlord-quotation', {
    params: casePath(caseId),
  });
  return unwrapCrossubResult(result, "Couldn't send the quotation to the landlord");
}

export async function setSelfManagedSettlementMethod(
  caseId: string,
  body: SelfManagedSettlementMethodInput,
) {
  const result = await crossub.PATCH('/agent/end-leasing/{caseId}/settlement/method', {
    params: casePath(caseId),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't change the settlement method");
}

export async function editSelfManagedSettlement(
  caseId: string,
  body: SelfManagedSettlementBreakdownInput,
) {
  const result = await crossub.PATCH('/agent/end-leasing/{caseId}/settlement/breakdown', {
    params: casePath(caseId),
    body,
  });
  return unwrapCrossubResult(result, "Couldn't update the settlement");
}

export async function confirmSelfManagedSettlement(caseId: string) {
  const result = await crossub.POST('/agent/end-leasing/{caseId}/settlement/confirm', {
    params: casePath(caseId),
  });
  return unwrapCrossubResult(result, "Couldn't confirm the settlement");
}
