import {
  SessionStatusEnum,
  type OpenInspectionSession,
} from '@/constants/open-inspection-ops';
import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';
import { isAgentConductedOpenSession } from '@/lib/open-inspection/open-conducted-by';

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

export type OpenSessionRailContext = {
  /** When known from the inspection row or letting cycle — overrides session heuristics. */
  agentConducted?: boolean;
};

function startReached(session: OpenInspectionSession, now: Date) {
  return new Date(session.startTime) <= now;
}

function viewingSessionIsLive(session: OpenInspectionSession): boolean {
  return (
    session.sessionStatus === SessionStatusEnum.OPEN ||
    session.sessionStatus === SessionStatusEnum.STAFF_EN_ROUTE ||
    session.sessionStatus === SessionStatusEnum.CLOSED
  );
}

function isAgentConductedOpen(
  session: OpenInspectionSession,
  context?: OpenSessionRailContext,
): boolean {
  if (context?.agentConducted === true) return true;
  if (context?.agentConducted === false) return false;
  return isAgentConductedOpenSession(session);
}

function canEnterOpenRailStep(
  session: OpenInspectionSession,
  now: Date,
  context?: OpenSessionRailContext,
): boolean {
  // Agent self-opens need check-in / apply links as soon as the case exists so they can
  // advertise the viewing — not only once the scheduled window starts.
  if (isAgentConductedOpen(session, context)) return true;
  if (!startReached(session, now)) return false;
  if (viewingSessionIsLive(session)) return true;
  return false;
}

export function deriveOpenSessionRailProgress(
  session: OpenInspectionSession,
  now: Date = new Date(),
  context?: OpenSessionRailContext,
): { currentRailStep: OpenSessionRailStep; fillIndex: number } {
  const reportReady =
    session.openReportGenerated === true || Boolean(session.reviewCompletedAt);

  if (reportReady) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REPORT, fillIndex: 2 };
  }
  if (canEnterOpenRailStep(session, now, context)) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.OPEN, fillIndex: 1 };
  }
  return { currentRailStep: OPEN_SESSION_RAIL_STEP.SCHEDULED, fillIndex: 0 };
}

/** Steps at or before live progress can be opened to review prior stage content. */
export function isOpenSessionRailStepNavigable(
  session: OpenInspectionSession,
  step: OpenSessionRailStep,
  now: Date = new Date(),
  context?: OpenSessionRailContext,
): boolean {
  const reportReady =
    session.openReportGenerated === true || Boolean(session.reviewCompletedAt);
  if (reportReady || session.sessionStatus === SessionStatusEnum.CLOSED) {
    return true;
  }
  const { currentRailStep } = deriveOpenSessionRailProgress(session, now, context);
  const order = OPEN_SESSION_RAIL_STEP_ORDER;
  return order.indexOf(step) <= order.indexOf(currentRailStep);
}

export function isOpenSessionRailStepCompleted(
  session: OpenInspectionSession,
  step: OpenSessionRailStep,
  now: Date = new Date(),
  context?: OpenSessionRailContext,
): boolean {
  const reportReady =
    session.openReportGenerated === true || Boolean(session.reviewCompletedAt);

  switch (step) {
    case OPEN_SESSION_RAIL_STEP.SCHEDULED:
      return canEnterOpenRailStep(session, now, context) || reportReady;
    case OPEN_SESSION_RAIL_STEP.OPEN:
      return reportReady;
    case OPEN_SESSION_RAIL_STEP.REPORT:
      return session.openReportGenerated === true;
    default:
      return false;
  }
}

function applications(session: OpenInspectionSession) {
  return (session.visitors ?? []).filter((v) => v.application);
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
  return shouldShowCompleteReviewAction(session, now);
}

/** True when one or more applicants still need an approve/reject decision. */
export function hasPendingOpenApplicantReviews(session: OpenInspectionSession) {
  return !allReviewed(session) && applications(session).length > 0;
}

/** Show the complete-review CTA once the confirmed viewing window has started. */
export function shouldShowCompleteReviewAction(
  session: OpenInspectionSession,
  now: Date = new Date(),
) {
  if (session.reviewCompletedAt || session.openReportGenerated) return false;
  return startReached(session, now);
}
