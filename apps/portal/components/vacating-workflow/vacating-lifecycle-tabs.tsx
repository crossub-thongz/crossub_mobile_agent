'use client';

import { VacatingLifecycleStepRail } from '@/components/vacating-workflow/vacating-lifecycle-step-rail';
import { VacatingStepPanel } from '@/components/vacating-workflow/vacating-step-panels';
import { useVacatingWorkflowStore } from '@/lib/vacating/store';
import type { VacatingPropertyDetail } from '@/lib/vacating/types';
import type { Inspection } from '@/lib/types';

export function VacatingLifecycleTabs({
  detail,
  inspection,
}: {
  detail: VacatingPropertyDetail;
  inspection?: Inspection;
}) {
  const activeStep = useVacatingWorkflowStore((s) => s.getActiveStep(detail.vacatingId));
  const setActiveStep = useVacatingWorkflowStore((s) => s.setActiveStep);
  const liveDetail = useVacatingWorkflowStore((s) => s.getDetail(detail.vacatingId)) ?? detail;

  return (
    <div className="min-w-0 space-y-4">
      <VacatingLifecycleStepRail
        detail={liveDetail}
        currentStep={activeStep}
        onStepClick={(step) => setActiveStep(detail.vacatingId, step)}
      />
      <VacatingStepPanel step={activeStep} detail={liveDetail} inspection={inspection} />
    </div>
  );
}
