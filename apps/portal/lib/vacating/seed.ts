import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import {
  VACATING_LIFECYCLE_STEP,
  VACATING_LIFECYCLE_STEP_ORDER,
  type VacatingChecklistStatus,
  type VacatingLifecycleStep,
} from '@/lib/vacating/constants';
import { deriveVacatingActiveStep, vacatingStepFromChecklistLabel } from '@/lib/vacating/lifecycle';
import type { VacatingPropertyDetail } from '@/lib/vacating/types';
import type { Inspection, VacatingCase } from '@/lib/types';

function emptyStepStatus(): Record<VacatingLifecycleStep, VacatingChecklistStatus> {
  return VACATING_LIFECYCLE_STEP_ORDER.reduce(
    (acc, step) => {
      acc[step] = 'pending';
      return acc;
    },
    {} as Record<VacatingLifecycleStep, VacatingChecklistStatus>,
  );
}

export function vacatingCaseToDetail(
  vacatingCase: VacatingCase,
  outgoingInspection?: Inspection,
): VacatingPropertyDetail {
  const stepStatus = emptyStepStatus();
  for (const item of vacatingCase.checklist) {
    const step = vacatingStepFromChecklistLabel(item.label);
    if (step) stepStatus[step] = item.status;
  }

  const outgoingDone =
    stepStatus[VACATING_LIFECYCLE_STEP.OUTGOING_INSPECTION] === 'done' ||
    outgoingInspection?.status.toLowerCase().includes('complete');

  return {
    vacatingId: vacatingCase.id,
    propertyId: vacatingCase.propertyId,
    propertyAddress: vacatingCase.propertyAddress,
    vacateDate: vacatingCase.vacateDate,
    reason: vacatingCase.reason,
    bondStatus: vacatingCase.bondStatus,
    requiresBondApproval: vacatingCase.requiresApproval,
    checklistProgress: vacatingCase.checklistProgress,
    activeStepHint: deriveVacatingActiveStep(stepStatus),
    stepStatus,
    outgoingInspection: {
      status: outgoingDone
        ? LEASING_ITEM_STATUS.DONE
        : outgoingInspection
          ? LEASING_ITEM_STATUS.IN_PROGRESS
          : LEASING_ITEM_STATUS.NOT_STARTED,
      inspectionId: outgoingInspection?.id,
      scheduledAt: outgoingInspection?.scheduledAt,
      inspector: outgoingInspection?.inspector,
      reportStatus: outgoingInspection?.reportStatus,
      summary: vacatingCase.outgoingInspectionStatus,
    },
    bondBreakdown: vacatingCase.bondBreakdown,
    timeline: vacatingCase.timeline,
  };
}
