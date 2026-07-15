'use client';

import { Button } from '@/components/ui/button';
import {
  LEASING_LIFECYCLE_STEP_LABEL,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';

export function LeasingLifecyclePhaseNav({
  activeStep,
  visibleSteps,
  onStepClick,
}: {
  activeStep: LeasingLifecycleStep;
  visibleSteps: LeasingLifecycleStep[];
  onStepClick: (step: LeasingLifecycleStep) => void;
}) {
  if (visibleSteps.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleSteps.map((step) => {
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
