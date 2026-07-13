'use client';

import { useCallback, useState } from 'react';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { useLivePoll } from '@/lib/use-live-poll';
import { LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import {
  LETTING_RAIL_STEP,
  LETTING_RAIL_STEP_LABEL,
  LETTING_RAIL_STEP_ORDER,
  deriveLettingRailProgress,
  isLettingRailStepCompleted,
  isLettingRailStepEnabled,
  type LettingRailStep,
} from '@/lib/leasing/letting-rail-progress';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

function railStepToContentStep(
  railStep: LettingRailStep,
  detail: LeasingPropertyDetail,
): LeasingLifecycleStep {
  switch (railStep) {
    case LETTING_RAIL_STEP.ORDER_CREATED:
    case LETTING_RAIL_STEP.SCHEDULING:
    case LETTING_RAIL_STEP.SCHEDULED:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
    case LETTING_RAIL_STEP.REPORT_AVAILABLE:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
    case LETTING_RAIL_STEP.RESULTS:
      return LEASING_LIFECYCLE_STEP.RESULTS;
    default:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
  }
}

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
  const [now, setNow] = useState(() => new Date());
  const tickNow = useCallback(() => {
    setNow(new Date());
  }, []);
  useLivePoll(tickNow);

  const { currentRailStep, fillIndex } = deriveLettingRailProgress(detail, now);

  return (
    <WorkflowProgressRail
      steps={LETTING_RAIL_STEP_ORDER}
      labels={LETTING_RAIL_STEP_LABEL}
      currentStep={currentRailStep}
      progressFillIndex={fillIndex}
      getStepState={(step) => {
        const enabled = isLettingRailStepEnabled(detail, step, now);
        const isDone = isLettingRailStepCompleted(detail, step, now);
        const isViewing = step === currentRailStep;
        if (!enabled && !isDone && !isViewing) return 'upcoming';
        return resolveWorkflowStepState(isDone, isViewing);
      }}
      isStepCompleted={(step) => isLettingRailStepCompleted(detail, step, now)}
      isStepEnabled={(step) => isLettingRailStepEnabled(detail, step, now)}
      onStepClick={
        onStepClick
          ? (railStep) => onStepClick(railStepToContentStep(railStep, detail))
          : undefined
      }
      href={href}
      className={className}
    />
  );
}
