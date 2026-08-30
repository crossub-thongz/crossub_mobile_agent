'use client';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { TaskWorkflowRailPortal } from '@/components/agent/tasks/task-workflow-rail-slot';
import {
  VACATING_LIFECYCLE_STEP_ORDER,
  VACATING_LIFECYCLE_STEP_SHORT_LABEL,
  type VacatingLifecycleStep,
} from '@/lib/vacating/constants';
import { deriveVacatingStepStatus } from '@/lib/vacating/lifecycle';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { VacatingPropertyDetail } from '@/lib/vacating/types';

export function VacatingLifecycleStepRail({
  detail,
  currentStep,
  onStepClick,
  className,
}: {
  detail: VacatingPropertyDetail;
  currentStep: VacatingLifecycleStep;
  onStepClick?: (step: VacatingLifecycleStep) => void;
  className?: string;
}) {
  return (
    <TaskWorkflowRailPortal>
    <WorkflowProgressRail
      steps={VACATING_LIFECYCLE_STEP_ORDER}
      labels={VACATING_LIFECYCLE_STEP_SHORT_LABEL}
      currentStep={currentStep}
      getStepState={(step) => {
        const isDone = deriveVacatingStepStatus(detail, step) === LEASING_ITEM_STATUS.DONE;
        return resolveWorkflowStepState(isDone, step === currentStep);
      }}
      isStepCompleted={(step) =>
        deriveVacatingStepStatus(detail, step) === LEASING_ITEM_STATUS.DONE
      }
      onStepClick={onStepClick}
      className={className}
    />
    </TaskWorkflowRailPortal>
  );
}
