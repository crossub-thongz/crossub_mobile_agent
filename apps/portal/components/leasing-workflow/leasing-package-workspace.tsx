'use client';

import { useEffect } from 'react';

import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';

export function LeasingPackageWorkspace({
  propertyId,
  propertyAddress,
  rentWeekly,
}: {
  propertyId: string;
  propertyAddress: string;
  rentWeekly?: number;
}) {
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const resetActiveStepToHint = useLeasingWorkflowStore((s) => s.resetActiveStepToHint);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));

  useEffect(() => {
    const seeded = ensureDetail(propertyId, propertyAddress, rentWeekly);
    resetActiveStepToHint(propertyId, seeded.activeStepHint);
  }, [ensureDetail, resetActiveStepToHint, propertyId, propertyAddress, rentWeekly]);

  if (!detail) return null;

  return <LeasingLifecycleTabs detail={detail} />;
}
