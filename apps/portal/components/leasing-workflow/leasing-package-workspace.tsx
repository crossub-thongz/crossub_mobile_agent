'use client';

import { useEffect } from 'react';

import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { fetchKeyCollection } from '@/lib/crossub-api/agent-client';
import { isUuid } from '@/lib/file-upload';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';

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
  const applyKeyCollectionFromApi = useLeasingWorkflowStore((s) => s.applyKeyCollectionFromApi);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));
  const { leasingCycles, apiConnected } = useAgentData();
  const cycleId = leasingCycles.find((c) => c.propertyId === propertyId)?.id;

  useLeasingCycleLiveSync(propertyId, cycleId, apiConnected);

  useEffect(() => {
    const seeded = ensureDetail(propertyId, propertyAddress, rentWeekly);
    resetActiveStepToHint(propertyId, seeded.activeStepHint);
  }, [ensureDetail, resetActiveStepToHint, propertyId, propertyAddress, rentWeekly]);

  // Live properties: hydrate key-collection from the agent API so the step card
  // reflects server state (time/location/status) instead of the offline seed.
  useEffect(() => {
    if (!isUuid(propertyId)) return;
    let active = true;
    void fetchKeyCollection(propertyId)
      .then((kc) => {
        if (active) applyKeyCollectionFromApi(propertyId, kc);
      })
      .catch(() => {
        /* offline / no active cycle — keep the seeded shell */
      });
    return () => {
      active = false;
    };
  }, [applyKeyCollectionFromApi, propertyId]);

  if (!detail) return null;

  return <LeasingLifecycleTabs detail={detail} />;
}
