'use client';

import { useEffect } from 'react';

import { LeasingLifecycleStepRail } from '@/components/leasing-workflow/leasing-lifecycle-step-rail';
import { propertyLeasingWorkflow } from '@/constants/routes';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';

export function LeasingWorkflowTimeline({
  propertyId,
  propertyAddress,
  rentWeekly,
}: {
  propertyId: string;
  propertyAddress: string;
  rentWeekly?: number;
}) {
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));

  useEffect(() => {
    ensureDetail(propertyId, propertyAddress, rentWeekly);
  }, [ensureDetail, propertyId, propertyAddress, rentWeekly]);

  if (!detail) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        Leasing workflow
      </p>
      <LeasingLifecycleStepRail
        detail={detail}
        currentStep={detail.activeStepHint}
        href={propertyLeasingWorkflow(propertyId)}
      />
    </div>
  );
}
