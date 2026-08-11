/**
 * Job-case inspector label after staff reassignment before work starts.
 * Example: `Alice Smith → Bob Jones (Reassigned)`.
 */
export function formatInspectorReassignmentLabel(
  currentName: string | null | undefined,
  previousName: string | null | undefined,
): string | null {
  const current = currentName?.trim() || null;
  if (!current) return null;
  const previous = previousName?.trim() || null;
  if (!previous || previous.toLowerCase() === current.toLowerCase()) {
    return current;
  }
  return `${previous} → ${current} (Reassigned)`;
}
