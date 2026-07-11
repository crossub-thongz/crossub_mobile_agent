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

function approvedCount(session: OpenInspectionSession) {
  return applications(session).filter(
    (v) => v.application?.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  ).length;
}

function allReviewed(session: OpenInspectionSession) {
  const apps = applications(session);
  if (apps.length === 0) return false;
  return apps.every(
    (v) => v.application?.agentDecision !== LEASING_AGENT_DECISION.PENDING,
  );
}

export function deriveOpenSessionRailProgress(
  session: OpenInspectionSession,
  reportGenerated: boolean,
): { currentRailStep: OpenSessionRailStep; fillIndex: number } {
  if (reportGenerated) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REPORT, fillIndex: 4 };
  }
  if (allReviewed(session) && approvedCount(session) > 0) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.REVIEW, fillIndex: 3.5 };
  }
  if (applications(session).length > 0) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.APPLICANTS, fillIndex: 2.5 };
  }
  if (
    session.sessionStatus === SessionStatusEnum.OPEN ||
    session.sessionStatus === SessionStatusEnum.CLOSED
  ) {
    return { currentRailStep: OPEN_SESSION_RAIL_STEP.OPEN, fillIndex: 1.5 };
  }
  return { currentRailStep: OPEN_SESSION_RAIL_STEP.SCHEDULED, fillIndex: 0.5 };
}

export function isOpenSessionRailStepCompleted(
  session: OpenInspectionSession,
  step: OpenSessionRailStep,
  reportGenerated: boolean,
): boolean {
  const { currentRailStep } = deriveOpenSessionRailProgress(session, reportGenerated);
  const stepIndex = OPEN_SESSION_RAIL_STEP_ORDER.indexOf(step);
  const currentIndex = OPEN_SESSION_RAIL_STEP_ORDER.indexOf(currentRailStep);
  return stepIndex < currentIndex;
}
