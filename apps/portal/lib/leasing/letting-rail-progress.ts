import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { isAssignedInspectorName } from '@/lib/leasing/open-inspection-display';
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

function hasScheduledInspection(detail: LeasingPropertyDetail): boolean {
  const oi = detail.openInspection;
  return Boolean(oi.scheduledTime) || isAssignedInspectorName(oi.inspectorName);
}

function isReportReady(detail: LeasingPropertyDetail): boolean {
  const or = detail.openReport;
  return (
    or.status === LEASING_ITEM_STATUS.DONE ||
    or.reportViewable ||
    or.sentToAgent
  );
}

export function deriveLettingRailProgress(detail: LeasingPropertyDetail): {
  currentRailStep: LettingRailStep;
  /** Fractional index 0–4 for the progress line (0.5 = halfway to next step). */
  fillIndex: number;
} {
  const oi = detail.openInspection;
  const oiDone = oi.status === LEASING_ITEM_STATUS.DONE;
  const reportReady = isReportReady(detail);
  const scheduled = hasScheduledInspection(detail);

  if (reportReady) {
    return { currentRailStep: LETTING_RAIL_STEP.RESULTS, fillIndex: 4 };
  }
  if (oiDone) {
    return { currentRailStep: LETTING_RAIL_STEP.REPORT_AVAILABLE, fillIndex: 3.5 };
  }
  if (scheduled) {
    return { currentRailStep: LETTING_RAIL_STEP.SCHEDULED, fillIndex: 2 };
  }
  if (oi.status !== LEASING_ITEM_STATUS.NOT_STARTED) {
    return { currentRailStep: LETTING_RAIL_STEP.SCHEDULING, fillIndex: 1.5 };
  }
  return { currentRailStep: LETTING_RAIL_STEP.ORDER_CREATED, fillIndex: 0.5 };
}

export function isLettingRailStepCompleted(
  detail: LeasingPropertyDetail,
  step: LettingRailStep,
): boolean {
  const { currentRailStep } = deriveLettingRailProgress(detail);
  const stepIndex = LETTING_RAIL_STEP_ORDER.indexOf(step);
  const currentIndex = LETTING_RAIL_STEP_ORDER.indexOf(currentRailStep);
  return stepIndex < currentIndex;
}

export function isLettingRailStepEnabled(
  detail: LeasingPropertyDetail,
  step: LettingRailStep,
): boolean {
  const oiDone = detail.openInspection.status === LEASING_ITEM_STATUS.DONE;
  const reportReady = isReportReady(detail);

  switch (step) {
    case LETTING_RAIL_STEP.ORDER_CREATED:
    case LETTING_RAIL_STEP.SCHEDULING:
    case LETTING_RAIL_STEP.SCHEDULED:
      return true;
    case LETTING_RAIL_STEP.REPORT_AVAILABLE:
      return oiDone;
    case LETTING_RAIL_STEP.RESULTS:
      return reportReady;
    default:
      return false;
  }
}
