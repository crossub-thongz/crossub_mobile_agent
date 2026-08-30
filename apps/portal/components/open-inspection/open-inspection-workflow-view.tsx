'use client';

import { useEffect, useRef, useState } from 'react';

import { OpenInspectionSessionRail } from '@/components/open-inspection/open-inspection-session-rail';
import { OpenInspectionStagePanel } from '@/components/open-inspection/open-inspection-stage-panel';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  deriveOpenSessionRailProgress,
  isOpenSessionRailStepNavigable,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';

export function OpenInspectionWorkflowView({
  session,
  propertyLabel,
  onSessionChange,
  fieldInspectorName,
}: {
  session: OpenInspectionSession;
  propertyLabel: string;
  onSessionChange: (session: OpenInspectionSession) => void;
  fieldInspectorName?: string | null;
}) {
  const { currentRailStep } = deriveOpenSessionRailProgress(session);
  const [viewedStep, setViewedStep] = useState<OpenSessionRailStep>(currentRailStep);
  const userPickedRef = useRef(false);

  useEffect(() => {
    userPickedRef.current = false;
    setViewedStep(deriveOpenSessionRailProgress(session).currentRailStep);
  }, [session.id]);

  useEffect(() => {
    if (!userPickedRef.current) {
      setViewedStep(currentRailStep);
    }
  }, [currentRailStep]);

  const onStepClick = (step: OpenSessionRailStep) => {
    if (!isOpenSessionRailStepNavigable(session, step)) return;
    userPickedRef.current = true;
    setViewedStep(step);
  };

  return (
    <div className="space-y-4">
      <OpenInspectionSessionRail
        session={session}
        viewedStep={viewedStep}
        onStepClick={onStepClick}
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
