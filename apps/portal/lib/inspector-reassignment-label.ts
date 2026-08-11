/**
 * Job-case inspector label after staff reassignment or cancel-assignee.
 *
 * - Reassign: `Alice Smith → Bob Jones (Reassigned)`
 * - Cancel assignee: `Alice Smith (cancelled) → Pending Inspector`
 */
export function formatInspectorReassignmentLabel(
  currentName: string | null | undefined,
  previousName: string | null | undefined,
): string | null {
  const current = currentName?.trim() || null
  const previous = previousName?.trim() || null

  if (previous && !current) {
    const cancelled = /\(cancelled\)$/i.test(previous)
      ? previous
      : `${previous} (cancelled)`
    return `${cancelled} → Pending Inspector`
  }

  if (!current) return null
  if (!previous || previous.toLowerCase() === current.toLowerCase()) {
    return current
  }
  return `${previous} → ${current} (Reassigned)`
}
