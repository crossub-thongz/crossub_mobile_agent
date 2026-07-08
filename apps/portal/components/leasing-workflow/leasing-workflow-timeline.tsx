'use client';

import { useEffect, useRef } from 'react';

import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';

export function LeasingWorkflowTimeline({
  propertyId,
  propertyAddress,
  rentWeekly,
  hideSectionLabel = false,
}: {
  propertyId: string;
  propertyAddress: string;
  rentWeekly?: number;
  hideSectionLabel?: boolean;
}) {
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const resetActiveStepToHint = useLeasingWorkflowStore((s) => s.resetActiveStepToHint);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));
  const { leasingCycles, apiConnected } = useAgentData();
  const cycleId = leasingCycles.find((c) => c.propertyId === propertyId)?.id;
  const initializedIdRef = useRef<string | null>(null);

  useLeasingCycleLiveSync(propertyId, cycleId, apiConnected);

  useEffect(() => {
    const seeded = ensureDetail(propertyId, propertyAddress, rentWeekly);
    if (initializedIdRef.current !== propertyId) {
      resetActiveStepToHint(propertyId, seeded.activeStepHint);
      initializedIdRef.current = propertyId;
    }
  }, [ensureDetail, resetActiveStepToHint, propertyId, propertyAddress, rentWeekly]);

  if (!detail) return null;

  return (
    <div className="space-y-1.5">
      {!hideSectionLabel ? (
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Leasing workflow
        </p>
      ) : null}
      <LeasingLifecycleTabs detail={detail} />
    </div>
  );
}
