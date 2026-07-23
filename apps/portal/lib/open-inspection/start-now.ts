/** ISO end time from now + duration (hours). */
export function openInspectionEndIsoFromDurationHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
