import type { OpenInspectionSession } from '@/constants/open-inspection-ops';

/**
 * The OPEN pool inspection id — what OP- refs are built from.
 * Viewing-session ids produce a different OP- number and must not be used as the case ID.
 */
export function openSessionInspectionId(
  session: Pick<OpenInspectionSession, 'id' | 'inspectionId' | 'openInspection'>,
): string {
  return (
    session.inspectionId?.trim() ||
    session.openInspection?.inspectionId?.trim() ||
    session.id
  );
}
