'use client';

import { LeasingLifecycleStepRail } from '@/components/leasing-workflow/leasing-lifecycle-step-rail';
import { LeasingStepApplicationApproval } from '@/components/leasing-workflow/leasing-step-application-approval';
import { LeasingStepOnboarding } from '@/components/leasing-workflow/leasing-step-onboarding';
import { LeasingStepOpenInspection } from '@/components/leasing-workflow/leasing-step-open-inspection';
import { LeasingStepOpenReport } from '@/components/leasing-workflow/leasing-step-open-report';
import { LeasingStepResults } from '@/components/leasing-workflow/leasing-step-results';
import { LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

export function LeasingLifecycleTabs({
  detail,
  onCaseClosed,
}: {
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
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

      <StepPanel step={activeStep} detail={liveDetail} onCaseClosed={onCaseClosed} />
    </div>
  );
}

function StepPanel({
  step,
  detail,
  onCaseClosed,
}: {
  step: LeasingLifecycleStep;
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
}) {
  switch (step) {
    case LEASING_LIFECYCLE_STEP.OPEN_INSPECTION:
      return <LeasingStepOpenInspection detail={detail} />;
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
