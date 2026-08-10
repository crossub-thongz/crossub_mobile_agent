/** Placeholder / pending labels mean “leave in the inspector task pool”. */
const ROUTINE_POOL_PENDING_LABELS = new Set([
  'pending',
  'pending assignment',
  'pending — task pool',
  'pending - task pool',
  'task pool',
]);

/**
 * Returns undefined when the inspector field is blank or a pending placeholder,
 * so the API spawns a DRAFT pool job instead of treating it as assigned.
 */
export function normalizeRoutinePoolInspectorName(
  raw: string | null | undefined,
): string | undefined {
  const name = raw?.trim() ?? '';
  if (!name) return undefined;
  if (ROUTINE_POOL_PENDING_LABELS.has(name.toLowerCase())) return undefined;
  return name;
}
