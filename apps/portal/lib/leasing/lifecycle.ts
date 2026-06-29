import {
  LEASING_AGENT_DECISION,
  LEASING_ITEM_STATUS,
  LEASING_LIFECYCLE_STEP,
  type LeasingItemStatus,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

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
    case LEASING_LIFECYCLE_STEP.ONBOARDING:
      return deriveOnboardingStatus(detail);
    default:
      return LEASING_ITEM_STATUS.NOT_STARTED;
  }
}
