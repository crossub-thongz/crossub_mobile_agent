'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { WorkflowMobileStepChips } from '@/components/agent/workflow-mobile-step-chips';
import { TaskWorkflowRailPortal } from '@/components/agent/tasks/task-workflow-rail-slot';
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

function railStepToContentStep(railStep: LettingRailStep): LeasingLifecycleStep {
  switch (railStep) {
    case LETTING_RAIL_STEP.ORDER_CREATED:
    case LETTING_RAIL_STEP.SCHEDULING:
    case LETTING_RAIL_STEP.SCHEDULED:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
    case LETTING_RAIL_STEP.REPORT_AVAILABLE:
      return LEASING_LIFECYCLE_STEP.OPEN_REPORT;
    case LETTING_RAIL_STEP.RESULTS:
      return LEASING_LIFECYCLE_STEP.RESULTS;
    default:
      return LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
  }
}

/** Map lifecycle content step → which letting-rail node should show "Viewing". */
function contentStepToRailStep(
  contentStep: LeasingLifecycleStep,
  liveRailStep: LettingRailStep,
): LettingRailStep {
  switch (contentStep) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      if (
        liveRailStep === LETTING_RAIL_STEP.ORDER_CREATED ||
        liveRailStep === LETTING_RAIL_STEP.SCHEDULING ||
        liveRailStep === LETTING_RAIL_STEP.SCHEDULED
      ) {
        return liveRailStep;
      }
      return LETTING_RAIL_STEP.SCHEDULED;
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT:
      return LETTING_RAIL_STEP.REPORT_AVAILABLE;
    case LEASING_LIFECYCLE_STEP.RESULTS:
      return LETTING_RAIL_STEP.RESULTS;
    default:
      // Application / onboarding sit after the open-inspection rail.
      return liveRailStep;
  }
}

export function LeasingLifecycleStepRail({
  detail,
  currentStep,
  onStepClick,
  href,
  className,
  liveUpdates = true,
}: {
  detail: LeasingPropertyDetail;
  currentStep: LeasingLifecycleStep;
  onStepClick?: (step: LeasingLifecycleStep) => void;
  href?: string;
  className?: string;
  /** When false, the rail progress does not tick every live-poll interval (embedded job cases). */
  liveUpdates?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const [viewingRailStep, setViewingRailStep] = useState<LettingRailStep | null>(null);
  const tickNow = useCallback(() => {
    setNow(new Date());
  }, []);
  useLivePoll(tickNow, liveUpdates);

  const { currentRailStep: liveRailStep, fillIndex } = deriveLettingRailProgress(detail, now);

  // Phase-nav / external step changes clear a local rail selection.
  useEffect(() => {
    setViewingRailStep(null);
  }, [currentStep]);

  const displayRailStep =
    viewingRailStep ?? contentStepToRailStep(currentStep, liveRailStep);

  const isStepEnabled = (step: LettingRailStep) =>
    isLettingRailStepCompleted(detail, step, now) ||
    isLettingRailStepEnabled(detail, step, now);

  const handleRailStepClick = (railStep: LettingRailStep) => {
    setViewingRailStep(railStep);
    onStepClick?.(railStepToContentStep(railStep));
  };

  const mobileRailLabels: Record<LettingRailStep, string> = {
    [LETTING_RAIL_STEP.ORDER_CREATED]: 'Created',
    [LETTING_RAIL_STEP.SCHEDULING]: 'Scheduling',
    [LETTING_RAIL_STEP.SCHEDULED]: 'Scheduled',
    [LETTING_RAIL_STEP.REPORT_AVAILABLE]: 'Report',
    [LETTING_RAIL_STEP.RESULTS]: 'Results',
  };

  return (
    <TaskWorkflowRailPortal>
      <WorkflowMobileStepChips
        steps={LETTING_RAIL_STEP_ORDER}
        labels={mobileRailLabels}
        currentStep={displayRailStep}
        onStepClick={handleRailStepClick}
        isStepCompleted={(step) => isLettingRailStepCompleted(detail, step, now)}
        isStepEnabled={isStepEnabled}
      />
      <div className="hidden md:block">
        <WorkflowProgressRail
          steps={LETTING_RAIL_STEP_ORDER}
          labels={LETTING_RAIL_STEP_LABEL}
          currentStep={displayRailStep}
          liveStep={liveRailStep}
          progressFillIndex={fillIndex}
          getStepState={(step) => {
            const enabled = isStepEnabled(step);
            const isDone = isLettingRailStepCompleted(detail, step, now);
            const isViewing = step === displayRailStep;
            if (!enabled && !isDone && !isViewing) return 'upcoming';
            return resolveWorkflowStepState(isDone, isViewing);
          }}
          isStepCompleted={(step) => isLettingRailStepCompleted(detail, step, now)}
          isStepEnabled={isStepEnabled}
          onStepClick={handleRailStepClick}
          href={href}
          className={className}
        />
      </div>
    </TaskWorkflowRailPortal>
  );
}
