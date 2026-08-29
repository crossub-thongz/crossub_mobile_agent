import { LEASING_ITEM_STATUS, LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import { areAllApplicantResultsSent, deriveStepStatus } from '@/lib/leasing/lifecycle';
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

const POST_OPEN_INSPECTION_PHASE_STEPS: LeasingLifecycleStep[] = [
  LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
  LEASING_LIFECYCLE_STEP.RESULTS,
  LEASING_LIFECYCLE_STEP.ONBOARDING,
];

/** Application, Reference Check, and Onboarding — always shown on the phase rail. */
export const LEASING_PHASE_STEP_ORDER = POST_OPEN_INSPECTION_PHASE_STEPS;

export function isLeasingPhaseStep(step: LeasingLifecycleStep): boolean {
  return LEASING_PHASE_STEP_ORDER.includes(step);
}

function phaseStepIndex(step: LeasingLifecycleStep): number {
  return LEASING_PHASE_STEP_ORDER.indexOf(step);
}

function inferLeasingPhaseRailStep(detail: LeasingPropertyDetail): LeasingLifecycleStep {
  for (const step of LEASING_PHASE_STEP_ORDER) {
    const status = deriveStepStatus(detail, step);
    if (status !== LEASING_ITEM_STATUS.DONE) return step;
  }
  return LEASING_LIFECYCLE_STEP.ONBOARDING;
}

export function deriveLeasingPhaseRailProgress(
  detail: LeasingPropertyDetail,
  activeStep: LeasingLifecycleStep,
): {
  currentPhaseStep: LeasingLifecycleStep;
  fillIndex: number;
} {
  const currentPhaseStep = isLeasingPhaseStep(activeStep)
    ? activeStep
    : inferLeasingPhaseRailStep(detail);

  const currentIndex = Math.max(0, phaseStepIndex(currentPhaseStep));
  const currentStatus = deriveStepStatus(detail, currentPhaseStep);
  const lastIndex = LEASING_PHASE_STEP_ORDER.length - 1;
  const fillIndex =
    currentStatus === LEASING_ITEM_STATUS.DONE
      ? currentIndex
      : Math.min(currentIndex + 0.5, lastIndex);

  return { currentPhaseStep, fillIndex };
}

export function isLeasingPhaseStepCompleted(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): boolean {
  return deriveStepStatus(detail, step) === LEASING_ITEM_STATUS.DONE;
}

/** @deprecated Use LEASING_PHASE_STEP_ORDER — all phase steps are always visible. */
export function visibleLeasingPhaseSteps(
  _detail: LeasingPropertyDetail,
  _now: Date = new Date(),
): LeasingLifecycleStep[] {
  return [...LEASING_PHASE_STEP_ORDER];
}

export function resolveLeasingWorkflowContentStep(
  activeStep: LeasingLifecycleStep,
  _detail: LeasingPropertyDetail,
  _now: Date = new Date(),
): LeasingLifecycleStep {
  return activeStep;
}

/** Single-line v2 rail: inspection track, then letting phases after Results. */
export const UNIFIED_LEASING_RAIL_STEP = {
  ORDER_CREATED: LETTING_RAIL_STEP.ORDER_CREATED,
  SCHEDULING: LETTING_RAIL_STEP.SCHEDULING,
  SCHEDULED: LETTING_RAIL_STEP.SCHEDULED,
  REPORT_AVAILABLE: LETTING_RAIL_STEP.REPORT_AVAILABLE,
  RESULTS: LETTING_RAIL_STEP.RESULTS,
  APPLICATION: LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
  REFERENCE_CHECK: 'reference_check',
  ONBOARDING: LEASING_LIFECYCLE_STEP.ONBOARDING,
} as const;

export type UnifiedLeasingRailStep =
  (typeof UNIFIED_LEASING_RAIL_STEP)[keyof typeof UNIFIED_LEASING_RAIL_STEP];

export const UNIFIED_LEASING_RAIL_STEP_ORDER: UnifiedLeasingRailStep[] = [
  UNIFIED_LEASING_RAIL_STEP.ORDER_CREATED,
  UNIFIED_LEASING_RAIL_STEP.SCHEDULING,
  UNIFIED_LEASING_RAIL_STEP.SCHEDULED,
  UNIFIED_LEASING_RAIL_STEP.REPORT_AVAILABLE,
  UNIFIED_LEASING_RAIL_STEP.RESULTS,
  UNIFIED_LEASING_RAIL_STEP.APPLICATION,
  UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK,
  UNIFIED_LEASING_RAIL_STEP.ONBOARDING,
];

export const UNIFIED_LEASING_RAIL_STEP_LABEL: Record<UnifiedLeasingRailStep, string> = {
  [UNIFIED_LEASING_RAIL_STEP.ORDER_CREATED]: 'Order Created',
  [UNIFIED_LEASING_RAIL_STEP.SCHEDULING]: 'Scheduling',
  [UNIFIED_LEASING_RAIL_STEP.SCHEDULED]: 'Scheduled',
  [UNIFIED_LEASING_RAIL_STEP.REPORT_AVAILABLE]: 'Report Available',
  [UNIFIED_LEASING_RAIL_STEP.RESULTS]: 'Results',
  [UNIFIED_LEASING_RAIL_STEP.APPLICATION]: 'Application',
  [UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK]: 'Reference Check',
  [UNIFIED_LEASING_RAIL_STEP.ONBOARDING]: 'Onboarding',
};

export const UNIFIED_LEASING_RAIL_MOBILE_LABEL: Record<UnifiedLeasingRailStep, string> = {
  [UNIFIED_LEASING_RAIL_STEP.ORDER_CREATED]: 'Created',
  [UNIFIED_LEASING_RAIL_STEP.SCHEDULING]: 'Scheduling',
  [UNIFIED_LEASING_RAIL_STEP.SCHEDULED]: 'Scheduled',
  [UNIFIED_LEASING_RAIL_STEP.REPORT_AVAILABLE]: 'Report',
  [UNIFIED_LEASING_RAIL_STEP.RESULTS]: 'Results',
  [UNIFIED_LEASING_RAIL_STEP.APPLICATION]: 'Application',
  [UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK]: 'References',
  [UNIFIED_LEASING_RAIL_STEP.ONBOARDING]: 'Onboarding',
};

export function unifiedRailStepToContentStep(
  railStep: UnifiedLeasingRailStep,
): LeasingLifecycleStep {
  switch (railStep) {
    case UNIFIED_LEASING_RAIL_STEP.ORDER_CREATED:
    case UNIFIED_LEASING_RAIL_STEP.SCHEDULING:
    case UNIFIED_LEASING_RAIL_STEP.SCHEDULED:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
    case UNIFIED_LEASING_RAIL_STEP.REPORT_AVAILABLE:
      return LEASING_LIFECYCLE_STEP.OPEN_REPORT;
    case UNIFIED_LEASING_RAIL_STEP.APPLICATION:
      return LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL;
    case UNIFIED_LEASING_RAIL_STEP.RESULTS:
    case UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK:
      return LEASING_LIFECYCLE_STEP.RESULTS;
    case UNIFIED_LEASING_RAIL_STEP.ONBOARDING:
      return LEASING_LIFECYCLE_STEP.ONBOARDING;
    default:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
  }
}

export function contentStepToUnifiedRailStep(
  contentStep: LeasingLifecycleStep,
  liveRailStep: LettingRailStep,
): UnifiedLeasingRailStep {
  switch (contentStep) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      if (
        liveRailStep === LETTING_RAIL_STEP.ORDER_CREATED ||
        liveRailStep === LETTING_RAIL_STEP.SCHEDULING ||
        liveRailStep === LETTING_RAIL_STEP.SCHEDULED
      ) {
        return liveRailStep;
      }
      return UNIFIED_LEASING_RAIL_STEP.SCHEDULED;
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT:
      return UNIFIED_LEASING_RAIL_STEP.REPORT_AVAILABLE;
    case LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL:
      return UNIFIED_LEASING_RAIL_STEP.APPLICATION;
    case LEASING_LIFECYCLE_STEP.RESULTS:
      return UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK;
    case LEASING_LIFECYCLE_STEP.ONBOARDING:
      return UNIFIED_LEASING_RAIL_STEP.ONBOARDING;
    default:
      return liveRailStep;
  }
}

export function deriveUnifiedLeasingRailProgress(
  detail: LeasingPropertyDetail,
  activeStep: LeasingLifecycleStep,
  now: Date = new Date(),
): { fillIndex: number } {
  const inspection = deriveLettingRailProgress(detail, now);
  const phase = deriveLeasingPhaseRailProgress(detail, activeStep);
  const lastIndex = UNIFIED_LEASING_RAIL_STEP_ORDER.length - 1;
  const phaseOffset = UNIFIED_LEASING_RAIL_STEP_ORDER.indexOf(
    UNIFIED_LEASING_RAIL_STEP.APPLICATION,
  );
  const fillIndex = isLeasingPhaseStep(activeStep)
    ? phaseOffset + phase.fillIndex
    : inspection.fillIndex;
  return { fillIndex: Math.min(fillIndex, lastIndex) };
}

export function isUnifiedLeasingRailStepCompleted(
  detail: LeasingPropertyDetail,
  step: UnifiedLeasingRailStep,
  now: Date = new Date(),
): boolean {
  switch (step) {
    case UNIFIED_LEASING_RAIL_STEP.APPLICATION:
      return isLeasingPhaseStepCompleted(detail, LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL);
    case UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK:
      return isLeasingPhaseStepCompleted(detail, LEASING_LIFECYCLE_STEP.RESULTS);
    case UNIFIED_LEASING_RAIL_STEP.ONBOARDING:
      return isLeasingPhaseStepCompleted(detail, LEASING_LIFECYCLE_STEP.ONBOARDING);
    default:
      return isLettingRailStepCompleted(detail, step, now);
  }
}

export function isUnifiedLeasingRailStepEnabled(
  detail: LeasingPropertyDetail,
  step: UnifiedLeasingRailStep,
  now: Date = new Date(),
): boolean {
  switch (step) {
    case UNIFIED_LEASING_RAIL_STEP.APPLICATION:
    case UNIFIED_LEASING_RAIL_STEP.REFERENCE_CHECK:
    case UNIFIED_LEASING_RAIL_STEP.ONBOARDING:
      return true;
    default:
      return isLettingRailStepEnabled(detail, step, now);
  }
}
