'use client';

import { useCallback, useMemo, useState } from 'react';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { LeasingLifecyclePhaseNav } from '@/components/leasing-workflow/leasing-lifecycle-phase-nav';
import { LeasingLifecycleStepRail } from '@/components/leasing-workflow/leasing-lifecycle-step-rail';
import { LeasingStepApplicationApproval } from '@/components/leasing-workflow/leasing-step-application-approval';
import { LeasingStepOnboarding } from '@/components/leasing-workflow/leasing-step-onboarding';
import { LeasingStepOpenInspection } from '@/components/leasing-workflow/leasing-step-open-inspection';
import { LeasingStepOpenReport } from '@/components/leasing-workflow/leasing-step-open-report';
import { LeasingStepResults } from '@/components/leasing-workflow/leasing-step-results';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { LEASING_LIFECYCLE_STEP, LEASING_AGENT_SELF_OPEN_LABEL, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import {
  enrichLeasingEmailRecords,
  leasingEmailRecordsForStep,
} from '@/lib/leasing/agent-workflow-email';
import {
  resolveLeasingWorkflowContentStep,
  visibleLeasingPhaseSteps,
} from '@/lib/leasing/letting-rail-progress';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { resolveRentReviewAgentEmail } from '@/lib/rent-review/agent-email';
import { useLivePoll } from '@/lib/use-live-poll';

export function LeasingLifecycleTabs({
  detail,
  onCaseClosed,
  onOpenInspectionCreated,
}: {
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const activeStep = useLeasingWorkflowStore((s) => s.getActiveStep(detail.propertyId));
  const setActiveStep = useLeasingWorkflowStore((s) => s.setActiveStep);
  const liveDetail = useLeasingWorkflowStore((s) => s.getDetail(detail.propertyId)) ?? detail;
  const [now, setNow] = useState(() => new Date());
  const tickNow = useCallback(() => {
    setNow(new Date());
  }, []);
  useLivePoll(tickNow);

  const visiblePhaseSteps = useMemo(
    () => visibleLeasingPhaseSteps(liveDetail, now),
    [liveDetail, now],
  );
  const contentStep = useMemo(
    () => resolveLeasingWorkflowContentStep(activeStep, liveDetail, now),
    [activeStep, liveDetail, now],
  );

  return (
    <div className="min-w-0 space-y-4">
      <LeasingLifecycleStepRail
        detail={liveDetail}
        currentStep={activeStep}
        onStepClick={(step) => setActiveStep(detail.propertyId, step)}
      />

      {liveDetail.openInspection.agentConducted ? (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3">
          <p className="text-sm font-semibold">{LEASING_AGENT_SELF_OPEN_LABEL}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            You are conducting the open inspection for this property. CROSSUB will not create a
            separate open inspection order.
          </p>
        </div>
      ) : null}

      <LeasingLifecyclePhaseNav
        activeStep={activeStep}
        visibleSteps={visiblePhaseSteps}
        onStepClick={(step) => setActiveStep(detail.propertyId, step)}
      />

      <StepPanel
        step={contentStep}
        detail={liveDetail}
        onCaseClosed={onCaseClosed}
        onOpenInspectionCreated={onOpenInspectionCreated}
      />
    </div>
  );
}

function StepPanel({
  step,
  detail,
  onCaseClosed,
  onOpenInspectionCreated,
}: {
  step: LeasingLifecycleStep;
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const { properties, agencies } = useAgentData();
  const { user } = useAuth();
  const property = properties.find((p) => p.id === detail.propertyId);
  const agency = agencies.find((a) => a.id === property?.agencyId);
  const agentEmail = resolveRentReviewAgentEmail({
    userEmail: user?.email,
    agencyContactEmail: agency?.contactEmail ?? detail.agentInfo.email,
  });
  const stageEmails = useMemo(
    () => enrichLeasingEmailRecords(leasingEmailRecordsForStep(detail, step), agentEmail),
    [agentEmail, detail, step],
  );

  return (
    <div className="space-y-4">
      <StepPanelContent
        step={step}
        detail={detail}
        onCaseClosed={onCaseClosed}
        onOpenInspectionCreated={onOpenInspectionCreated}
      />
      <JobCaseStageEmailHistory
        emails={stageEmails}
        title={step === LEASING_LIFECYCLE_STEP.ONBOARDING ? 'All e-mail' : undefined}
      />
    </div>
  );
}

function StepPanelContent({
  step,
  detail,
  onCaseClosed,
  onOpenInspectionCreated,
}: {
  step: LeasingLifecycleStep;
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  switch (step) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      return (
        <LeasingStepOpenInspection
          detail={detail}
          onOpenInspectionCreated={onOpenInspectionCreated}
        />
      );
    case LEASING_LIFECYCLE_STEP.OPEN_REPORT:
      return <LeasingStepOpenReport detail={detail} />;
    case LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL:
      return <LeasingStepApplicationApproval detail={detail} />;
    case LEASING_LIFECYCLE_STEP.RESULTS:
      return <LeasingStepResults detail={detail} onCaseClosed={onCaseClosed} />;
    case LEASING_LIFECYCLE_STEP.ONBOARDING:
      return <LeasingStepOnboarding detail={detail} />;
    default:
      return null;
  }
}
