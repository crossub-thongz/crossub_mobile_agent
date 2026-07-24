'use client';

import { useEffect, useRef, useState } from 'react';

import { OpenInspectionSessionRail } from '@/components/open-inspection/open-inspection-session-rail';
import { OpenInspectionStagePanel } from '@/components/open-inspection/open-inspection-stage-panel';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import {
  deriveOpenSessionRailProgress,
  isOpenSessionRailStepNavigable,
  OPEN_SESSION_RAIL_STEP_LABEL,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';
import { AGENT_OPEN_GATE_HINT } from '@/lib/open-inspection-agent-display';

export function OpenInspectionWorkflowView({
  session,
  propertyLabel,
  onSessionChange,
}: {
  session: OpenInspectionSession;
  propertyLabel: string;
  onSessionChange: (session: OpenInspectionSession) => void;
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
      <section className="rounded-2xl border bg-card p-3">
        <p className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wide">
          Open inspection progress
        </p>
        <OpenInspectionSessionRail
          session={session}
          viewedStep={viewedStep}
          onStepClick={onStepClick}
        />
        <p className="text-muted-foreground px-1 pb-1 text-xs leading-relaxed">
          <span className="font-medium text-foreground">
            {OPEN_SESSION_RAIL_STEP_LABEL[viewedStep]}
          </span>
          {' — '}
          {AGENT_OPEN_GATE_HINT[viewedStep]}
        </p>
      </section>
      <OpenInspectionStagePanel
        session={session}
        propertyLabel={propertyLabel}
        viewedStep={viewedStep}
        onSessionChange={onSessionChange}
      />
    </div>
  );
}
