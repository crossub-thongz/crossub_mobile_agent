'use client';

import { useMemo } from 'react';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { LeasingLifecycleStepRail } from '@/components/leasing-workflow/leasing-lifecycle-step-rail';
import { LeasingStepApplicationApproval } from '@/components/leasing-workflow/leasing-step-application-approval';
import { LeasingStepOnboarding } from '@/components/leasing-workflow/leasing-step-onboarding';
import { LeasingStepOpenInspection } from '@/components/leasing-workflow/leasing-step-open-inspection';
import { LeasingStepOpenReport } from '@/components/leasing-workflow/leasing-step-open-report';
import { LeasingStepResults } from '@/components/leasing-workflow/leasing-step-results';
import { LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import { leasingEmailRecordsForStep } from '@/lib/leasing/agent-workflow-email';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

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

  return (
    <div className="min-w-0 space-y-4">
      <LeasingLifecycleStepRail
        detail={liveDetail}
        currentStep={activeStep}
        onStepClick={(step) => setActiveStep(detail.propertyId, step)}
      />

      <StepPanel
        step={activeStep}
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
  const stageEmails = useMemo(() => leasingEmailRecordsForStep(detail, step), [detail, step]);

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
