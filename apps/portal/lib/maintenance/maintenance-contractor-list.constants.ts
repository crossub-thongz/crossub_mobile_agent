/** How many ranked contractor suggestions to show before "View more". */
export const MAINTENANCE_CONTRACTOR_PREVIEW_COUNT = 3

/** Default auto-selected contractors on landlord review (top ranked). Two, per the
 *  brief: RFQ the top two matched tradespeople, not three. */
export const MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT = 2

export function topMaintenanceContractorIds(
  contractors: Array<{ id: string }>,
  count = MAINTENANCE_CONTRACTOR_AUTO_PICK_COUNT,
): string[] {
  return contractors.slice(0, count).map((c) => c.id)
}
