import type { PreferredContractor } from '@/lib/crossub-api/agent-client';
import type { SelfManagedReportComparisonItemInput } from '@/lib/crossub-api/agent-end-leasing-client';
import type { ReportComparisonRepairItem } from './types';

/** A draft row the agent typed something into; blank rows are dropped on save. */
export function hasRepairContent(item: ReportComparisonRepairItem): boolean {
  return Boolean(
    item.area.trim() ||
      item.description.trim() ||
      item.quote?.trim() ||
      item.handymanName?.trim() ||
      item.handymanId,
  );
}

/**
 * Body items for `PATCH /agent/end-leasing/:caseId/report-comparison` (Self-Manage). The API
 * replaces the whole list, so every stored field is carried through: the bond deduction marks,
 * the linked maintenance job, the issue status and fair wear and tear.
 */
export function toReportComparisonItemsInput(
  items: ReportComparisonRepairItem[],
  contractors: Pick<PreferredContractor, 'id' | 'name'>[],
): SelfManagedReportComparisonItemInput[] {
  return items.filter(hasRepairContent).map((item) => {
    const handymanId = item.handymanId || undefined;
    const handymanName =
      item.handymanName?.trim() ||
      (handymanId ? contractors.find((c) => c.id === handymanId)?.name.trim() : undefined) ||
      undefined;
    return {
      area: item.area.trim(),
      description: item.description.trim(),
      quote: item.quote?.trim() || undefined,
      handymanId,
      handymanName,
      bondDeductible: item.bondDeductible,
      landlordWaivable: item.landlordWaivable,
      bondDeductionStaffComment: item.bondDeductionStaffComment,
      bondDeductionAgentComment: item.bondDeductionAgentComment,
      maintenanceRequestId: item.maintenanceRequestId,
      resolutionStatus: item.resolutionStatus,
      fairWearAndTear: item.fairWearAndTear,
    };
  });
}

/** True when the draft rows would save differently from the stored list. */
export function repairItemsChanged(
  draft: ReportComparisonRepairItem[],
  saved: ReportComparisonRepairItem[],
  contractors: Pick<PreferredContractor, 'id' | 'name'>[],
): boolean {
  return (
    JSON.stringify(toReportComparisonItemsInput(draft, contractors)) !==
    JSON.stringify(toReportComparisonItemsInput(saved, contractors))
  );
}
