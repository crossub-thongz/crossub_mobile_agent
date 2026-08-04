/** Label used consistently on job case surfaces (matches property list PM column). */
export const CASE_ASSIGNED_TO_LABEL = 'Assigned to';

export function formatCaseAssignedTo(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed || '—';
}

export function resolveCaseAssignedToFromProperty(
  propertyManager: string | null | undefined,
  overrideName?: string | null,
): string {
  return formatCaseAssignedTo(overrideName ?? propertyManager);
}
