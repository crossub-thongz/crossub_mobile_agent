'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { fetchKeyCollection } from '@/lib/crossub-api/agent-client';
import { isUuid } from '@/lib/file-upload';
import {
  LEASING_LIFECYCLE_STEP,
  LEASING_LIFECYCLE_STEP_ORDER,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';

function parseLeasingStepParam(value: string | null): LeasingLifecycleStep | null {
  if (!value) return null;
  return LEASING_LIFECYCLE_STEP_ORDER.includes(value as LeasingLifecycleStep)
    ? (value as LeasingLifecycleStep)
    : null;
}

export function LeasingPackageWorkspace({
  propertyId,
  propertyAddress,
  rentWeekly,
}: {
  propertyId: string;
  propertyAddress: string;
  rentWeekly?: number;
}) {
  const searchParams = useSearchParams();
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const resetActiveStepToHint = useLeasingWorkflowStore((s) => s.resetActiveStepToHint);
  const setActiveStep = useLeasingWorkflowStore((s) => s.setActiveStep);
  const applyKeyCollectionFromApi = useLeasingWorkflowStore((s) => s.applyKeyCollectionFromApi);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));
  const { leasingCycles, apiConnected } = useAgentData();
  const cycleId = leasingCycles.find((c) => c.propertyId === propertyId)?.id;
  const autoStepAppliedRef = useRef(false);

  useLeasingCycleLiveSync(propertyId, cycleId, apiConnected);

  useEffect(() => {
    const seeded = ensureDetail(propertyId, propertyAddress, rentWeekly);
    resetActiveStepToHint(propertyId, seeded.activeStepHint);
  }, [ensureDetail, resetActiveStepToHint, propertyId, propertyAddress, rentWeekly]);

  useEffect(() => {
    const step = parseLeasingStepParam(searchParams.get('step'));
    if (step) setActiveStep(propertyId, step);
  }, [propertyId, searchParams, setActiveStep]);

  // When CROSSUB pushes the arranged open inspection, land the agent on step 3 once.
  useEffect(() => {
    if (!detail?.openInspection.pushedToAgentApp || autoStepAppliedRef.current) return;
    const step =
      parseLeasingStepParam(searchParams.get('step')) ??
      detail.activeStepHint ??
      LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL;
    if (step === LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL) {
      setActiveStep(propertyId, step);
      autoStepAppliedRef.current = true;
    }
  }, [detail, propertyId, searchParams, setActiveStep]);

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
