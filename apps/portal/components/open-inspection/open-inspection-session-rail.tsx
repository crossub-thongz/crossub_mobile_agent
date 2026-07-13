'use client';

import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  OPEN_SESSION_RAIL_STEP_LABEL,
  OPEN_SESSION_RAIL_STEP_ORDER,
  deriveOpenSessionRailProgress,
  isOpenSessionRailStepCompleted,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';

export function OpenInspectionSessionRail({
  session,
  className,
}: {
  session: OpenInspectionSession;
  reportGenerated?: boolean;
  className?: string;
}) {
  const { currentRailStep, fillIndex } = deriveOpenSessionRailProgress(session);

  return (
    <WorkflowProgressRail
      steps={OPEN_SESSION_RAIL_STEP_ORDER}
      labels={OPEN_SESSION_RAIL_STEP_LABEL}
      currentStep={currentRailStep}
      progressFillIndex={fillIndex}
      getStepState={(step) => {
        const isDone = isOpenSessionRailStepCompleted(session, step);
        const isViewing = step === currentRailStep;
        return resolveWorkflowStepState(isDone, isViewing);
      }}
      isStepCompleted={(step) => isOpenSessionRailStepCompleted(session, step)}
      className={className}
    />
  );
}
