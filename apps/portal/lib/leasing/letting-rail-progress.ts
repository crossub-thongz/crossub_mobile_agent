import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { areAllApplicantResultsSent } from '@/lib/leasing/lifecycle';
import {
  openInspectionStartReached,
  resolveEffectiveOpenInspectionStart,
} from '@/lib/leasing/open-inspection-display';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export const LETTING_RAIL_STEP = {
  ORDER_CREATED: 'order_created',
  SCHEDULING: 'scheduling',
  SCHEDULED: 'scheduled',
  REPORT_AVAILABLE: 'report_available',
  RESULTS: 'results',
} as const;

export type LettingRailStep = (typeof LETTING_RAIL_STEP)[keyof typeof LETTING_RAIL_STEP];

export const LETTING_RAIL_STEP_ORDER: LettingRailStep[] = [
  LETTING_RAIL_STEP.ORDER_CREATED,
  LETTING_RAIL_STEP.SCHEDULING,
  LETTING_RAIL_STEP.SCHEDULED,
  LETTING_RAIL_STEP.REPORT_AVAILABLE,
  LETTING_RAIL_STEP.RESULTS,
];

export const LETTING_RAIL_STEP_LABEL: Record<LettingRailStep, string> = {
  [LETTING_RAIL_STEP.ORDER_CREATED]: 'Order Created',
  [LETTING_RAIL_STEP.SCHEDULING]: 'Scheduling',
  [LETTING_RAIL_STEP.SCHEDULED]: 'Scheduled',
  [LETTING_RAIL_STEP.REPORT_AVAILABLE]: 'Report Available',
  [LETTING_RAIL_STEP.RESULTS]: 'Results',
};

function hasSchedulingActivity(detail: LeasingPropertyDetail): boolean {
  const oi = detail.openInspection;
  return (
    oi.status !== LEASING_ITEM_STATUS.NOT_STARTED ||
    Boolean(
      oi.preferredScheduledTime ||
        oi.preferredNotes ||
        oi.inspectionId ||
        oi.viewingSessionId,
    )
  );
}

function isReportReady(detail: LeasingPropertyDetail): boolean {
  const or = detail.openReport;
  return (
    or.status === LEASING_ITEM_STATUS.DONE ||
    or.reportViewable ||
    or.sentToAgent
  );
}

export function deriveLettingRailProgress(
  detail: LeasingPropertyDetail,
  now: Date = new Date(),
): {
  currentRailStep: LettingRailStep;
  /** Fractional index 0–4 for the progress line (0.5 = halfway to next step). */
  fillIndex: number;
} {
  const oi = detail.openInspection;
  const reportReady = isReportReady(detail);
  const started = openInspectionStartReached(oi, now);
  const hasConfirmedSchedule = Boolean(oi.scheduledTime);

  if (reportReady) {
    return { currentRailStep: LETTING_RAIL_STEP.RESULTS, fillIndex: 4 };
  }
  if (started) {
    return { currentRailStep: LETTING_RAIL_STEP.REPORT_AVAILABLE, fillIndex: 3.5 };
  }
  if (hasConfirmedSchedule) {
    return { currentRailStep: LETTING_RAIL_STEP.SCHEDULED, fillIndex: 2 };
  }
  if (hasSchedulingActivity(detail)) {
    return { currentRailStep: LETTING_RAIL_STEP.SCHEDULING, fillIndex: 1.5 };
  }
  return { currentRailStep: LETTING_RAIL_STEP.ORDER_CREATED, fillIndex: 0.5 };
}

export function isLettingRailStepCompleted(
  detail: LeasingPropertyDetail,
  step: LettingRailStep,
  now: Date = new Date(),
): boolean {
  if (step === LETTING_RAIL_STEP.RESULTS && areAllApplicantResultsSent(detail)) {
    return true;
  }
  const { currentRailStep } = deriveLettingRailProgress(detail, now);
  const stepIndex = LETTING_RAIL_STEP_ORDER.indexOf(step);
  const currentIndex = LETTING_RAIL_STEP_ORDER.indexOf(currentRailStep);
  return stepIndex < currentIndex;
}

export function isLettingRailStepEnabled(
  detail: LeasingPropertyDetail,
  step: LettingRailStep,
  now: Date = new Date(),
): boolean {
  const oi = detail.openInspection;
  const reportReady = isReportReady(detail);
  const started = openInspectionStartReached(oi, now);
  const hasWindow = Boolean(resolveEffectiveOpenInspectionStart(oi));

  switch (step) {
    case LETTING_RAIL_STEP.ORDER_CREATED:
    case LETTING_RAIL_STEP.SCHEDULING:
      return true;
    case LETTING_RAIL_STEP.SCHEDULED:
      return hasWindow || Boolean(oi.scheduledTime);
    case LETTING_RAIL_STEP.REPORT_AVAILABLE:
      return (
        started ||
        reportReady ||
        oi.status === LEASING_ITEM_STATUS.DONE
      );
    case LETTING_RAIL_STEP.RESULTS:
      return reportReady;
    default:
      return false;
  }
}

export function isLettingResultsStep(
  detail: LeasingPropertyDetail,
  now: Date = new Date(),
): boolean {
  return deriveLettingRailProgress(detail, now).currentRailStep === LETTING_RAIL_STEP.RESULTS;
}

export function isLettingReportAvailableStep(
  detail: LeasingPropertyDetail,
  now: Date = new Date(),
): boolean {
  return (
    deriveLettingRailProgress(detail, now).currentRailStep ===
    LETTING_RAIL_STEP.REPORT_AVAILABLE
  );
}

export function isLettingScheduledStep(
  detail: LeasingPropertyDetail,
  now: Date = new Date(),
): boolean {
  return deriveLettingRailProgress(detail, now).currentRailStep === LETTING_RAIL_STEP.SCHEDULED;
}

/** Report Available or Results on the letting rail — show the open inspection report. */
export function isLettingOpenReportVisibleStep(
  detail: LeasingPropertyDetail,
  now: Date = new Date(),
): boolean {
  const step = deriveLettingRailProgress(detail, now).currentRailStep;
  return (
    step === LETTING_RAIL_STEP.REPORT_AVAILABLE || step === LETTING_RAIL_STEP.RESULTS
  );
}
