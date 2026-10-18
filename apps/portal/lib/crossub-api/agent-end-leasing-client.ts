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
