'use client';

import { Button } from '@/components/ui/button';
import {
  LEASING_LIFECYCLE_STEP,
  LEASING_LIFECYCLE_STEP_LABEL,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';

const POST_REPORT_STEPS: LeasingLifecycleStep[] = [
  LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
  LEASING_LIFECYCLE_STEP.RESULTS,
  LEASING_LIFECYCLE_STEP.ONBOARDING,
];

export function LeasingLifecyclePhaseNav({
  activeStep,
  onStepClick,
}: {
  activeStep: LeasingLifecycleStep;
  onStepClick: (step: LeasingLifecycleStep) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {POST_REPORT_STEPS.map((step) => {
        const active = activeStep === step;
        return (
          <Button
            key={step}
            type="button"
            size="sm"
            variant={active ? 'default' : 'outline'}
            className="h-8 text-xs"
            onClick={() => onStepClick(step)}
          >
            {LEASING_LIFECYCLE_STEP_LABEL[step]}
          </Button>
        );
      })}
    </div>
  );
}
