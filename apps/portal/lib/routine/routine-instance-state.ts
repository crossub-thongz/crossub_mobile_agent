/** Mirrors backend ACTIVE_INSTANCE_STATES — inspection still in flight. */
const ACTIVE_ROUTINE_INSPECTION_STATUSES = new Set([
  'DRAFT',
  'IN_PROGRESS',
  'FIRST_REVIEW',
  'SECOND_REVIEW',
]);

export function isActiveRoutineInspectionStatus(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return ACTIVE_ROUTINE_INSPECTION_STATUSES.has(status.toUpperCase());
}

export function routineScheduleNeedsNewInstance(
  currentInspectionStatus: string | null | undefined,
): boolean {
  return !isActiveRoutineInspectionStatus(currentInspectionStatus);
}
