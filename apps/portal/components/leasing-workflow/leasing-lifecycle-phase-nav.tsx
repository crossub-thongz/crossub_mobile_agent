'use client';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import {
  LEASING_LIFECYCLE_STEP_LABEL,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import {
  LEASING_PHASE_STEP_ORDER,
  deriveLeasingPhaseRailProgress,
  isLeasingPhaseStepCompleted,
} from '@/lib/leasing/letting-rail-progress';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function LeasingLifecyclePhaseNav({
  detail,
  activeStep,
  onStepClick,
}: {
  detail: LeasingPropertyDetail;
  activeStep: LeasingLifecycleStep;
  onStepClick: (step: LeasingLifecycleStep) => void;
}) {
  const { currentPhaseStep, fillIndex } = deriveLeasingPhaseRailProgress(detail, activeStep);

  return (
    <section className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] px-3 py-2">
      <p className="text-violet-700/80 dark:text-violet-300/80 mb-1 text-[9px] font-semibold uppercase tracking-wide">
        Letting phases
      </p>
      <WorkflowProgressRail
        steps={LEASING_PHASE_STEP_ORDER}
        labels={LEASING_LIFECYCLE_STEP_LABEL}
        currentStep={currentPhaseStep}
        progressFillIndex={fillIndex}
        size="compact"
        tone="violet"
        getStepState={(step) => {
          const isDone = isLeasingPhaseStepCompleted(detail, step);
          const isViewing = activeStep === step;
          return resolveWorkflowStepState(isDone, isViewing);
        }}
        isStepCompleted={(step) => isLeasingPhaseStepCompleted(detail, step)}
        isStepEnabled={() => true}
        onStepClick={onStepClick}
      />
    </section>
  );
}
