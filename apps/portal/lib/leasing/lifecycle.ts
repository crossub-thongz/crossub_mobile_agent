import {
  LEASING_AGENT_DECISION,
  LEASING_ITEM_STATUS,
  LEASING_LIFECYCLE_STEP,
  type LeasingItemStatus,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function areAllApplicantResultsSent(detail: LeasingPropertyDetail): boolean {
  const apps = detail.applicationsDetail;
  if (apps.length === 0) return false;
  return apps.every((a) => Boolean(a.feedbackSentAt));
}

export function deriveApplicationStatus(detail: LeasingPropertyDetail): LeasingItemStatus {
  const apps = detail.applicationsDetail;
  if (apps.length === 0) return LEASING_ITEM_STATUS.NOT_STARTED;
  if (apps.some((a) => a.agentDecision === LEASING_AGENT_DECISION.APPROVED)) {
    return LEASING_ITEM_STATUS.DONE;
  }
  if (apps.some((a) => a.sentToAgent)) return LEASING_ITEM_STATUS.WAITING;
  return LEASING_ITEM_STATUS.IN_PROGRESS;
}

/** True once a tenant has been approved — step 3 becomes read-only history. */
export function isApplicationApprovalLocked(detail: LeasingPropertyDetail): boolean {
  return deriveApplicationStatus(detail) === LEASING_ITEM_STATUS.DONE;
}

export function getApprovedApplications(detail: LeasingPropertyDetail) {
  return detail.applicationsDetail.filter(
    (a) => a.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  );
}

/** Pending applicants not yet sent can be shortlisted for agent / PM approval. */
export function canSelectApplicantForApproval(
  app: LeasingPropertyDetail['applicationsDetail'][number],
): boolean {
  return app.agentDecision === LEASING_AGENT_DECISION.PENDING && !app.sentToAgent;
}

export function countSelectedForApprovalSend(
  apps: LeasingPropertyDetail['applicationsDetail'],
): number {
  return apps.filter((a) => a.selectedForAgent && canSelectApplicantForApproval(a)).length;
}

const READINESS_BY_STEP: Record<LeasingLifecycleStep, number> = {
  [LEASING_LIFECYCLE_STEP.OPEN_INSPECTION]: 12,
  [LEASING_LIFECYCLE_STEP.OPEN_REPORT]: 55,
  [LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL]: 72,
  [LEASING_LIFECYCLE_STEP.ONBOARDING]: 88,
};

/** True when onboarding procedures (deposit, bond, agreement, keys) are all done. */
export function isOnboardingProceduresComplete(detail: LeasingPropertyDetail): boolean {
  return deriveOnboardingProceduresStatus(detail) === LEASING_ITEM_STATUS.DONE;
}

export function deriveOnboardingProceduresStatus(detail: LeasingPropertyDetail): LeasingItemStatus {
  const o = detail.onboarding;
  const statuses: LeasingItemStatus[] = [
    o.deposit.status,
    o.bond.status,
    o.agreement.status,
    o.keyCollection.status,
  ];
  if (statuses.every((s) => s === LEASING_ITEM_STATUS.DONE)) {
    return LEASING_ITEM_STATUS.DONE;
  }
  if (statuses.some((s) => s === LEASING_ITEM_STATUS.BLOCKED)) {
    return LEASING_ITEM_STATUS.BLOCKED;
  }
  if (statuses.some((s) => s === LEASING_ITEM_STATUS.WAITING)) {
    return LEASING_ITEM_STATUS.WAITING;
  }
  if (statuses.some((s) => s !== LEASING_ITEM_STATUS.NOT_STARTED)) {
    return LEASING_ITEM_STATUS.IN_PROGRESS;
  }
  return LEASING_ITEM_STATUS.NOT_STARTED;
}

export function deriveLeasingReadiness(detail: LeasingPropertyDetail): number {
  if (isOnboardingProceduresComplete(detail)) return 100;

  const step = detail.activeStepHint ?? LEASING_LIFECYCLE_STEP.ONBOARDING;
  if (step === LEASING_LIFECYCLE_STEP.ONBOARDING) {
    const o = detail.onboarding;
    const items = [o.deposit, o.bond, o.agreement, o.keyCollection];
    const done = items.filter((i) => i.status === LEASING_ITEM_STATUS.DONE).length;
    return 90 + Math.round((done / items.length) * 10);
  }

  return READINESS_BY_STEP[step] ?? 0;
}

export function hasLeasingIngoingCase(detail: LeasingPropertyDetail): boolean {
  const ing = detail.onboarding.ingoingInspection;
  return Boolean(ing.inspectionId || ing.scheduledTime);
}

export function deriveIngoingInspectionStepStatus(detail: LeasingPropertyDetail): LeasingItemStatus {
  if (!isOnboardingProceduresComplete(detail)) {
    return LEASING_ITEM_STATUS.NOT_STARTED;
  }
  const o = detail.onboarding;
  const statuses: LeasingItemStatus[] = [
    o.ingoingInspection.status,
    o.ingoingReportApproval.status,
  ];
  if (statuses.every((s) => s === LEASING_ITEM_STATUS.DONE)) {
    return LEASING_ITEM_STATUS.DONE;
  }
  if (statuses.some((s) => s === LEASING_ITEM_STATUS.BLOCKED)) {
    return LEASING_ITEM_STATUS.BLOCKED;
  }
  if (statuses.some((s) => s === LEASING_ITEM_STATUS.WAITING)) {
    return LEASING_ITEM_STATUS.WAITING;
  }
  if (statuses.some((s) => s !== LEASING_ITEM_STATUS.NOT_STARTED)) {
    return LEASING_ITEM_STATUS.IN_PROGRESS;
  }
  return LEASING_ITEM_STATUS.NOT_STARTED;
}

export function showLeasingIngoingNextStepPanel(detail: LeasingPropertyDetail): boolean {
  return (
    deriveLeasingReadiness(detail) >= 100 &&
    deriveIngoingInspectionStepStatus(detail) !== LEASING_ITEM_STATUS.DONE
  );
}

export function isLeasingReadyForIngoingHandoff(detail: LeasingPropertyDetail): boolean {
  return showLeasingIngoingNextStepPanel(detail) && !hasLeasingIngoingCase(detail);
}

export function deriveOnboardingStatus(detail: LeasingPropertyDetail): LeasingItemStatus {
  const o = detail.onboarding;
  const statuses: LeasingItemStatus[] = [
    o.deposit.status,
    o.bond.status,
    o.agreement.status,
    o.keyCollection.status,
    o.ingoingInspection.status,
    o.ingoingReportApproval.status,
  ];
  if (statuses.every((s) => s === LEASING_ITEM_STATUS.DONE)) {
    return LEASING_ITEM_STATUS.DONE;
  }
  if (statuses.some((s) => s === LEASING_ITEM_STATUS.BLOCKED)) {
    return LEASING_ITEM_STATUS.BLOCKED;
  }
  if (statuses.some((s) => s === LEASING_ITEM_STATUS.WAITING)) {
    return LEASING_ITEM_STATUS.WAITING;
  }
  if (statuses.some((s) => s !== LEASING_ITEM_STATUS.NOT_STARTED)) {
    return LEASING_ITEM_STATUS.IN_PROGRESS;
  }
  return LEASING_ITEM_STATUS.NOT_STARTED;
}

export function deriveStepStatus(
  detail: LeasingPropertyDetail,
  step: LeasingLifecycleStep,
): LeasingItemStatus {
  switch (step) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      return detail.openInspection.status;
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT:
      return detail.openReport.status;
    case LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL:
      return deriveApplicationStatus(detail);
    case LEASING_LIFECYCLE_STEP.RESULTS:
      return areAllApplicantResultsSent(detail)
        ? LEASING_ITEM_STATUS.DONE
        : detail.applicationsDetail.length > 0
          ? LEASING_ITEM_STATUS.IN_PROGRESS
          : LEASING_ITEM_STATUS.NOT_STARTED;
    case LEASING_LIFECYCLE_STEP.ONBOARDING:
      return deriveOnboardingProceduresStatus(detail);
    default:
      return LEASING_ITEM_STATUS.NOT_STARTED;
  }
}
