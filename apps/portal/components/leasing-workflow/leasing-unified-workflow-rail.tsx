'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { WorkflowMobileStepChips } from '@/components/agent/workflow-mobile-step-chips';
import { TaskWorkflowRailPortal } from '@/components/agent/tasks/task-workflow-rail-slot';
import { useLivePoll } from '@/lib/use-live-poll';
import type { LeasingLifecycleStep } from '@/lib/leasing/constants';
import {
  UNIFIED_LEASING_RAIL_MOBILE_LABEL,
  UNIFIED_LEASING_RAIL_STEP_LABEL,
  UNIFIED_LEASING_RAIL_STEP_ORDER,
  contentStepToUnifiedRailStep,
  deriveLettingRailProgress,
  deriveUnifiedLeasingRailProgress,
  isUnifiedLeasingRailStepCompleted,
  isUnifiedLeasingRailStepEnabled,
  unifiedRailStepToContentStep,
  type UnifiedLeasingRailStep,
} from '@/lib/leasing/letting-rail-progress';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function LeasingUnifiedWorkflowRail({
  detail,
  currentStep,
  onStepClick,
}: {
  detail: LeasingPropertyDetail;
  currentStep: LeasingLifecycleStep;
  onStepClick: (step: LeasingLifecycleStep) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [viewingRailStep, setViewingRailStep] = useState<UnifiedLeasingRailStep | null>(null);
  const tickNow = useCallback(() => {
    setNow(new Date());
  }, []);
  useLivePoll(tickNow);

  const { currentRailStep: liveRailStep } = deriveLettingRailProgress(detail, now);
  const { fillIndex } = deriveUnifiedLeasingRailProgress(detail, currentStep, now);

  useEffect(() => {
    setViewingRailStep((prev) => {
      if (prev && unifiedRailStepToContentStep(prev) === currentStep) return prev;
      return null;
    });
  }, [currentStep]);

  const displayRailStep =
    viewingRailStep ?? contentStepToUnifiedRailStep(currentStep, liveRailStep);

  const handleRailStepClick = (railStep: UnifiedLeasingRailStep) => {
    setViewingRailStep(railStep);
    onStepClick(unifiedRailStepToContentStep(railStep));
  };

  const isStepEnabled = (step: UnifiedLeasingRailStep) =>
    isUnifiedLeasingRailStepCompleted(detail, step, now) ||
    isUnifiedLeasingRailStepEnabled(detail, step, now);

  return (
    <TaskWorkflowRailPortal>
      <WorkflowMobileStepChips
        steps={UNIFIED_LEASING_RAIL_STEP_ORDER}
        labels={UNIFIED_LEASING_RAIL_MOBILE_LABEL}
        currentStep={displayRailStep}
        onStepClick={handleRailStepClick}
        isStepCompleted={(step) => isUnifiedLeasingRailStepCompleted(detail, step, now)}
        isStepEnabled={isStepEnabled}
        tourStepAnchors
      />
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[44rem]">
          <WorkflowProgressRail
            steps={UNIFIED_LEASING_RAIL_STEP_ORDER}
            labels={UNIFIED_LEASING_RAIL_STEP_LABEL}
            currentStep={displayRailStep}
            liveStep={contentStepToUnifiedRailStep(currentStep, liveRailStep)}
            progressFillIndex={fillIndex}
            getStepState={(step) => {
              const enabled = isStepEnabled(step);
              const isDone = isUnifiedLeasingRailStepCompleted(detail, step, now);
              const isViewing = step === displayRailStep;
              if (!enabled && !isDone && !isViewing) return 'upcoming';
              return resolveWorkflowStepState(isDone, isViewing);
            }}
            isStepCompleted={(step) => isUnifiedLeasingRailStepCompleted(detail, step, now)}
            isStepEnabled={isStepEnabled}
            onStepClick={handleRailStepClick}
            tourStepAnchors
          />
        </div>
      </div>
    </TaskWorkflowRailPortal>
  );
}
