'use client';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { TaskWorkflowRailPortal } from '@/components/agent/tasks/task-workflow-rail-slot';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  OPEN_SESSION_RAIL_STEP_LABEL,
  OPEN_SESSION_RAIL_STEP_ORDER,
  deriveOpenSessionRailProgress,
  isOpenSessionRailStepCompleted,
  isOpenSessionRailStepNavigable,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';

export function OpenInspectionSessionRail({
  session,
  viewedStep,
  onStepClick,
  className,
}: {
  session: OpenInspectionSession;
  viewedStep?: OpenSessionRailStep;
  onStepClick?: (step: OpenSessionRailStep) => void;
  className?: string;
}) {
  const { currentRailStep, fillIndex } = deriveOpenSessionRailProgress(session);
  const displayStep = viewedStep ?? currentRailStep;

  return (
    <TaskWorkflowRailPortal>
    <WorkflowProgressRail
      steps={OPEN_SESSION_RAIL_STEP_ORDER}
      labels={OPEN_SESSION_RAIL_STEP_LABEL}
      currentStep={displayStep}
      progressFillIndex={fillIndex}
      getStepState={(step) => {
        const isDone = isOpenSessionRailStepCompleted(session, step);
        const isViewing = step === displayStep;
        return resolveWorkflowStepState(isDone, isViewing);
      }}
      isStepCompleted={(step) => isOpenSessionRailStepCompleted(session, step)}
      onStepClick={onStepClick}
      isStepEnabled={(step) => isOpenSessionRailStepNavigable(session, step)}
      className={className}
    />
    </TaskWorkflowRailPortal>
  );
}
