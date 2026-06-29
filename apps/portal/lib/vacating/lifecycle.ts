import { LEASING_ITEM_STATUS, type LeasingItemStatus } from '@/lib/leasing/constants';
import {
  VACATING_CHECKLIST_LABEL,
  VACATING_LIFECYCLE_STEP,
  VACATING_LIFECYCLE_STEP_ORDER,
  type VacatingChecklistStatus,
  type VacatingLifecycleStep,
} from '@/lib/vacating/constants';
import type { VacatingPropertyDetail } from '@/lib/vacating/types';

export function checklistStatusToItemStatus(
  status: VacatingChecklistStatus,
  isActive: boolean,
): LeasingItemStatus {
  if (status === 'done') return LEASING_ITEM_STATUS.DONE;
  if (status === 'dispute') return LEASING_ITEM_STATUS.BLOCKED;
  return isActive ? LEASING_ITEM_STATUS.IN_PROGRESS : LEASING_ITEM_STATUS.NOT_STARTED;
}

export function deriveVacatingActiveStep(
  stepStatus: Record<VacatingLifecycleStep, VacatingChecklistStatus>,
): VacatingLifecycleStep {
  const firstPending = VACATING_LIFECYCLE_STEP_ORDER.find(
    (step) => stepStatus[step] !== 'done',
  );
  return firstPending ?? VACATING_LIFECYCLE_STEP.BOND_CLAIM;
}

export function deriveVacatingStepStatus(
  detail: VacatingPropertyDetail,
  step: VacatingLifecycleStep,
): LeasingItemStatus {
  const checklist = detail.stepStatus[step];
  const activeStep = deriveVacatingActiveStep(detail.stepStatus);
  if (step === VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION) {
    if (detail.outgoingInspection.status === LEASING_ITEM_STATUS.DONE) {
      return LEASING_ITEM_STATUS.DONE;
    }
    if (
      detail.outgoingInspection.scheduledAt ||
      detail.outgoingInspection.status === LEASING_ITEM_STATUS.IN_PROGRESS
    ) {
      return LEASING_ITEM_STATUS.IN_PROGRESS;
    }
  }
  return checklistStatusToItemStatus(checklist, step === activeStep);
}

export function vacatingStepFromChecklistLabel(label: string): VacatingLifecycleStep | undefined {
  return VACATING_LIFECYCLE_STEP_ORDER.find(
    (step) => VACATING_CHECKLIST_LABEL[step].toLowerCase() === label.toLowerCase(),
  );
}
