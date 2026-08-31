/**
 * Canonical reason written onto cases when an agent archives the property.
 * Keep in step with apps/api/src/constants/property-case-archive.constants.ts.
 */
export const AGENT_ARCHIVED_CASE_REASON = 'Agent Archived';

export function isAgentArchivedReason(reason?: string | null): boolean {
  return reason?.trim() === AGENT_ARCHIVED_CASE_REASON;
}

export function overlayAgentArchivedLabel(
  fallback: string,
  reason?: string | null,
): string {
  return isAgentArchivedReason(reason) ? AGENT_ARCHIVED_CASE_REASON : fallback;
}
