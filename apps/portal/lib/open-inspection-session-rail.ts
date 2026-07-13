import {
  SessionStatusEnum,
  type OpenInspectionSession,
} from '@/constants/open-inspection-ops';
import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';

export const OPEN_SESSION_RAIL_STEP = {
  SCHEDULED: 'scheduled',
  OPEN: 'open',
  APPLICANTS: 'applicants',
  REVIEW: 'review',
  REPORT: 'report',
} as const;

export type OpenSessionRailStep =
  (typeof OPEN_SESSION_RAIL_STEP)[keyof typeof OPEN_SESSION_RAIL_STEP];

export const OPEN_SESSION_RAIL_STEP_ORDER: OpenSessionRailStep[] = [
  OPEN_SESSION_RAIL_STEP.SCHEDULED,
  OPEN_SESSION_RAIL_STEP.OPEN,
  OPEN_SESSION_RAIL_STEP.APPLICANTS,
  OPEN_SESSION_RAIL_STEP.REVIEW,
  OPEN_SESSION_RAIL_STEP.REPORT,
];

export const OPEN_SESSION_RAIL_STEP_LABEL: Record<OpenSessionRailStep, string> = {
  [OPEN_SESSION_RAIL_STEP.SCHEDULED]: 'Scheduled',
  [OPEN_SESSION_RAIL_STEP.OPEN]: 'Open',
  [OPEN_SESSION_RAIL_STEP.APPLICANTS]: 'Applicants',
  [OPEN_SESSION_RAIL_STEP.REVIEW]: 'Review',
  [OPEN_SESSION_RAIL_STEP.REPORT]: 'Report',
};

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

function startReached(session: OpenInspectionSession, now: Date) {
  return new Date(session.startTime) <= now;
}

function endReached(session: OpenInspectionSession, now: Date) {
  return new Date(session.endTime) <= now;
}

export function deriveOpenSessionRailProgress(
  session: OpenInspectionSession,
  now: Date = new Date(),
): { currentRailStep: OpenSessionRailStep; fillIndex: number } {
  const reportGenerated = session.openReportGenerated === true;
  const reviewCompleted = Boolean(session.reviewCompletedAt);
  const started = startReached(session, now);
  const ended = endReached(session, now);
  const hasApps = applications(session).length > 0;

  if (reportGenerated) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REPORT, fillIndex: 4 };
  }
  if (reviewCompleted) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REPORT, fillIndex: 3.5 };
  }
  if (started && (hasApps || ended)) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REVIEW, fillIndex: 3 };
  }
  if (started) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.APPLICANTS, fillIndex: 2 };
  }
  return { currentRailStep: OPEN_SESSION_RAIL_STEP.SCHEDULED, fillIndex: 0.5 };
}

export function isOpenSessionRailStepCompleted(
  session: OpenInspectionSession,
  step: OpenSessionRailStep,
  now: Date = new Date(),
): boolean {
  const started = startReached(session, now);
  const ended = endReached(session, now);
  const hasApps = applications(session).length > 0;
  const reviewCompleted = Boolean(session.reviewCompletedAt);
  const reportGenerated = session.openReportGenerated === true;

  switch (step) {
    case OPEN_SESSION_RAIL_STEP.SCHEDULED:
      return started;
    case OPEN_SESSION_RAIL_STEP.OPEN:
      return started;
    case OPEN_SESSION_RAIL_STEP.APPLICANTS:
      return started && (hasApps || ended);
    case OPEN_SESSION_RAIL_STEP.REVIEW:
      return reviewCompleted;
    case OPEN_SESSION_RAIL_STEP.REPORT:
      return reportGenerated;
    default:
      return false;
  }
}

export function canCompleteOpenSessionReview(
  session: OpenInspectionSession,
  now: Date = new Date(),
) {
  if (session.reviewCompletedAt || session.openReportGenerated) return false;
  if (!startReached(session, now)) return false;
  return allReviewed(session);
}
