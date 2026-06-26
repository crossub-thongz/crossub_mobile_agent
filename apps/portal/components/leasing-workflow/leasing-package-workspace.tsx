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
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));

  useEffect(() => {
    ensureDetail(propertyId, propertyAddress, rentWeekly);
  }, [ensureDetail, propertyId, propertyAddress, rentWeekly]);

  if (!detail) return null;

  return <LeasingLifecycleTabs detail={detail} />;
}
