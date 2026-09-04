'use client';

import { useEffect, useRef, useState } from 'react';

import { OpenInspectionSessionRail } from '@/components/open-inspection/open-inspection-session-rail';
import { OpenInspectionStagePanel } from '@/components/open-inspection/open-inspection-stage-panel';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  deriveOpenSessionRailProgress,
  isOpenSessionRailStepNavigable,
  type OpenSessionRailContext,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';

export function OpenInspectionWorkflowView({
  session,
  propertyLabel,
  onSessionChange,
  fieldInspectorName,
  railContext,
}: {
  session: OpenInspectionSession;
  propertyLabel: string;
  onSessionChange: (session: OpenInspectionSession) => void;
  fieldInspectorName?: string | null;
  railContext?: OpenSessionRailContext;
}) {
  const { currentRailStep } = deriveOpenSessionRailProgress(session, undefined, railContext);
  const [viewedStep, setViewedStep] = useState<OpenSessionRailStep>(currentRailStep);
  const userPickedRef = useRef(false);

  useEffect(() => {
    userPickedRef.current = false;
    setViewedStep(deriveOpenSessionRailProgress(session, undefined, railContext).currentRailStep);
  }, [session.id, railContext?.agentConducted]);

  useEffect(() => {
    if (!userPickedRef.current) {
      setViewedStep(currentRailStep);
    }
  }, [currentRailStep]);

  const onStepClick = (step: OpenSessionRailStep) => {
    if (!isOpenSessionRailStepNavigable(session, step, undefined, railContext)) return;
    userPickedRef.current = true;
    setViewedStep(step);
  };

  return (
    <div className="space-y-4">
      <OpenInspectionSessionRail
        session={session}
        viewedStep={viewedStep}
        onStepClick={onStepClick}
        railContext={railContext}
      />
      <OpenInspectionStagePanel
        session={session}
        propertyLabel={propertyLabel}
        viewedStep={viewedStep}
        onSessionChange={onSessionChange}
        fieldInspectorName={fieldInspectorName}
      />
    </div>
  );
}
