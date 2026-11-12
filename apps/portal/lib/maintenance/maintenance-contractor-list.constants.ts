import { contractorMatchesIssue } from '@/lib/maintenance/contractor-trade-match'

/** How many ranked contractor suggestions to show before "View more". */
export const MAINTENANCE_CONTRACTOR_PREVIEW_COUNT = 3

/** Default auto-selected contractors on landlord review (top ranked). Two, per the
 *  brief: RFQ the top two matched tradespeople, not three. */
export const MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT = 2

/**
 * The first `count` contractors whose trade matches the issue, in the ranked order given.
 * With no issue type, or no matching trade, nobody is auto-selected.
 */
export function topMaintenanceContractorIds(
  contractors: Array<{ id: string; serviceTypes?: readonly string[] }>,
  count = MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT,
  issueType?: string | null,
): string[] {
  if (!issueType?.trim()) return []
  return contractors
    .filter((contractor) => contractorMatchesIssue(contractor.serviceTypes, issueType))
    .slice(0, count)
    .map((contractor) => contractor.id)
}
