/** Statuses where a tradie is already engaged or the job is finished. */
const LOCKED_STATUSES = new Set([
  'pending_schedule',
  'in_progress',
  'completed',
  'closed',
]);

/**
 * Who pays can still be changed until a visit is booked. After that the server
 * refuses, and a closed job has nothing left to reassign.
 */
export function canChangeMaintenanceResponsibility(input: {
  status: string;
  scheduledVisitAt?: string | null;
}): boolean {
  if (input.scheduledVisitAt) return false;
  return !LOCKED_STATUSES.has(input.status);
}
