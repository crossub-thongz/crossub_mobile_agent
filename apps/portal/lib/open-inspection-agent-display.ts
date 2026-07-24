import { SessionStatusEnum } from '@/constants/open-inspection-ops';
import { INSPECTION_STATUS } from '@/constants/api-enums';
import {
  OPEN_SESSION_RAIL_STEP,
  OPEN_SESSION_RAIL_STEP_LABEL,
  deriveOpenSessionRailProgress,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';
import type { Inspection } from '@/lib/types';

export { OPEN_SESSION_RAIL_STEP_LABEL } from '@/lib/open-inspection-session-rail';

export const AGENT_OPEN_GATE_HINT: Record<OpenSessionRailStep, string> = {
  [OPEN_SESSION_RAIL_STEP.SCHEDULED]:
    'Viewing date, inspector assignment, and listing details for this open inspection.',
  [OPEN_SESSION_RAIL_STEP.OPEN]:
    'Live viewing — track check-ins, visitors, and applicant decisions.',
  [OPEN_SESSION_RAIL_STEP.REPORT]:
    'Open inspection report is ready for landlord review and download.',
};

/** Header badge when there is no live viewing session yet. */
export function deriveOpenInspectionHeaderStatus(inspection: Inspection): string {
  const api = (inspection.apiStatus ?? '').toLowerCase();
  if (
    api === SessionStatusEnum.CLOSED ||
    api === INSPECTION_STATUS.COMPLETED.toLowerCase() ||
    api === INSPECTION_STATUS.PUBLISHED.toLowerCase() ||
    inspection.reportStatus === 'sent' ||
    Boolean(inspection.reportUrl)
  ) {
    return 'Completed';
  }
  if (api === SessionStatusEnum.OPEN) return 'Open now';
  if (api === SessionStatusEnum.STAFF_EN_ROUTE) return 'Staff en route';
  if (api === SessionStatusEnum.CANCELLED) return 'Cancelled';
  if (inspection.scheduledAt) return 'Scheduled';
  return inspection.status || 'Pending';
}

export function openGateStatusTone(step: OpenSessionRailStep): string {
  if (step === OPEN_SESSION_RAIL_STEP.REPORT) {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (step === OPEN_SESSION_RAIL_STEP.OPEN) {
    return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
  }
  return 'bg-amber-500/10 text-amber-800 dark:text-amber-200';
}

export function deriveOpenHeaderStatusFromSession(
  inspection: Inspection,
  session: Parameters<typeof deriveOpenSessionRailProgress>[0] | null,
): string {
  if (!session) return deriveOpenInspectionHeaderStatus(inspection);
  const { currentRailStep } = deriveOpenSessionRailProgress(session);
  if (currentRailStep === OPEN_SESSION_RAIL_STEP.REPORT) return 'Completed';
  if (currentRailStep === OPEN_SESSION_RAIL_STEP.OPEN) {
    return session.sessionStatus === SessionStatusEnum.STAFF_EN_ROUTE
      ? 'Staff en route'
      : 'Open now';
  }
  return OPEN_SESSION_RAIL_STEP_LABEL[OPEN_SESSION_RAIL_STEP.SCHEDULED];
}
