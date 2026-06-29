'use client';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import {
  LEASING_ITEM_STATUS,
  LEASING_LIFECYCLE_STEP_ORDER,
  LEASING_LIFECYCLE_STEP_SHORT_LABEL,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import { deriveStepStatus } from '@/lib/leasing/lifecycle';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function LeasingLifecycleStepRail({
  detail,
  currentStep,
  onStepClick,
  href,
  className,
}: {
  detail: LeasingPropertyDetail;
  currentStep: LeasingLifecycleStep;
  onStepClick?: (step: LeasingLifecycleStep) => void;
  href?: string;
  className?: string;
}) {
  return (
    <WorkflowProgressRail
      steps={LEASING_LIFECYCLE_STEP_ORDER}
      labels={LEASING_LIFECYCLE_STEP_SHORT_LABEL}
      currentStep={currentStep}
      getStepState={(step) => {
        const isDone = deriveStepStatus(detail, step) === LEASING_ITEM_STATUS.DONE;
        return resolveWorkflowStepState(isDone, step === currentStep);
      }}
      isStepCompleted={(step) => deriveStepStatus(detail, step) === LEASING_ITEM_STATUS.DONE}
      onStepClick={onStepClick}
      href={href}
      className={className}
    />
  );
}
