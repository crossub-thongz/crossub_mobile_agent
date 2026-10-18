'use client';

import { useEffect } from 'react';

import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { LEASING_WORKSPACE_PANE_COPY } from '@/constants/module-workspace';
import { fetchKeyCollection } from '@/lib/crossub-api/agent-client';
import { isUuid } from '@/lib/file-upload';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingCycle } from '@/lib/types';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';
import { formatPropertyFullAddress } from '@/lib/utils';

/**
 * The letting workspace (step rail and the current step's actions) for the cycle selected on
 * the desktop Leasing page. Same store, live sync and steps as the full leasing page, pinned to
 * this cycle rather than whichever cycle the property lists first.
 */
export function LeasingCycleWorkspacePane({ cycle }: { cycle: LeasingCycle }) {
  const { properties, apiConnected } = useAgentData();
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const resetActiveStepToHint = useLeasingWorkflowStore((s) => s.resetActiveStepToHint);
  const applyKeyCollectionFromApi = useLeasingWorkflowStore((s) => s.applyKeyCollectionFromApi);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(cycle.propertyId));

  const property = properties.find((p) => p.id === cycle.propertyId);
  const address = property ? formatPropertyFullAddress(property) : cycle.propertyAddress;
  const rentWeekly = property?.rentWeekly;

  useLeasingCycleLiveSync(cycle.propertyId, cycle.id, apiConnected);

  useEffect(() => {
    const seeded = ensureDetail(cycle.propertyId, address, rentWeekly);
    resetActiveStepToHint(cycle.propertyId, seeded.activeStepHint);
  }, [address, cycle.propertyId, ensureDetail, rentWeekly, resetActiveStepToHint]);

  // Key collection lives on its own agent route; hydrate it so the onboarding card is current.
  useEffect(() => {
    if (!isUuid(cycle.propertyId)) return;
    let active = true;
    void fetchKeyCollection(cycle.propertyId)
      .then((kc) => {
        if (active) applyKeyCollectionFromApi(cycle.propertyId, kc);
      })
      .catch(() => {
        /* no active cycle on the route yet: keep the seeded card */
      });
    return () => {
      active = false;
    };
  }, [applyKeyCollectionFromApi, cycle.propertyId]);

  if (!detail) {
    return <p className="text-muted-foreground text-xs">{LEASING_WORKSPACE_PANE_COPY.loading}</p>;
  }

  return <LeasingLifecycleTabs detail={detail} leasingCycleId={cycle.id} />;
}
