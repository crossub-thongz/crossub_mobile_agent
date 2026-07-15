import {
  type OpenInspectionSession,
} from '@/constants/open-inspection-ops';
import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';

export const OPEN_SESSION_RAIL_STEP = {
  SCHEDULED: 'scheduled',
  OPEN: 'open',
  REPORT: 'report',
} as const;

export type OpenSessionRailStep =
  (typeof OPEN_SESSION_RAIL_STEP)[keyof typeof OPEN_SESSION_RAIL_STEP];

export const OPEN_SESSION_RAIL_STEP_ORDER: OpenSessionRailStep[] = [
  OPEN_SESSION_RAIL_STEP.SCHEDULED,
  OPEN_SESSION_RAIL_STEP.OPEN,
  OPEN_SESSION_RAIL_STEP.REPORT,
];

export const OPEN_SESSION_RAIL_STEP_LABEL: Record<OpenSessionRailStep, string> = {
  [OPEN_SESSION_RAIL_STEP.SCHEDULED]: 'Scheduled',
  [OPEN_SESSION_RAIL_STEP.OPEN]: 'Open',
  [OPEN_SESSION_RAIL_STEP.REPORT]: 'Report',
};

function startReached(session: OpenInspectionSession, now: Date) {
  return new Date(session.startTime) <= now;
}

export function deriveOpenSessionRailProgress(
  session: OpenInspectionSession,
  now: Date = new Date(),
): { currentRailStep: OpenSessionRailStep; fillIndex: number } {
  const reportReady =
    session.openReportGenerated === true || Boolean(session.reviewCompletedAt);
  const started = startReached(session, now);

  if (reportReady) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REPORT, fillIndex: 2 };
  }
  if (started) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.OPEN, fillIndex: 1 };
  }
  return { currentRailStep: OPEN_SESSION_RAIL_STEP.SCHEDULED, fillIndex: 0 };
}

export function isOpenSessionRailStepCompleted(
  session: OpenInspectionSession,
  step: OpenSessionRailStep,
  now: Date = new Date(),
): boolean {
  const reportReady =
    session.openReportGenerated === true || Boolean(session.reviewCompletedAt);
  const started = startReached(session, now);

  switch (step) {
    case OPEN_SESSION_RAIL_STEP.SCHEDULED:
      return started;
    case OPEN_SESSION_RAIL_STEP.OPEN:
      return reportReady;
    case OPEN_SESSION_RAIL_STEP.REPORT:
      return session.openReportGenerated === true;
    default:
      return false;
  }
}

function applications(session: OpenInspectionSession) {
  return session.visitors.filter((v) => v.application);
}

function allReviewed(session: OpenInspectionSession) {
  const apps = applications(session);
  if (apps.length === 0) return true;
  return apps.every(
    (v) => v.application?.agentDecision !== LEASING_AGENT_DECISION.PENDING,
  );
}

export function canCompleteOpenSessionReview(
  session: OpenInspectionSession,
  now: Date = new Date(),
) {
  if (session.reviewCompletedAt || session.openReportGenerated) return false;
  if (!startReached(session, now)) return false;
  return allReviewed(session);
}
