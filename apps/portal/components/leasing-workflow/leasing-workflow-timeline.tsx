'use client';

import { useEffect, useRef } from 'react';

import { LeasingLifecycleTabs } from '@/components/leasing-workflow/leasing-lifecycle-tabs';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { isUuid } from '@/lib/file-upload';
import { LEASING_LIFECYCLE_STEP, type LeasingLifecycleStep } from '@/lib/leasing/constants';
import { splitLeasingCyclesByHistory } from '@/lib/property-leasing-history';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';

export function LeasingWorkflowTimeline({
  propertyId,
  leasingCycleId,
  propertyAddress,
  rentWeekly,
  hideSectionLabel = false,
  focusBond = false,
  onFocusBondHandled,
  onCaseClosed,
  onOpenInspectionCreated,
  unifiedRail = false,
}: {
  propertyId: string;
  /** When set (e.g. history row), load this cycle instead of the property's active letting. */
  leasingCycleId?: string;
  propertyAddress: string;
  rentWeekly?: number;
  hideSectionLabel?: boolean;
  focusBond?: boolean;
  onFocusBondHandled?: () => void;
  onCaseClosed?: () => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
  unifiedRail?: boolean;
}) {
  const ensureDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const resetActiveStepToHint = useLeasingWorkflowStore((s) => s.resetActiveStepToHint);
  const setActiveStep = useLeasingWorkflowStore((s) => s.setActiveStep);
  const requestBondSectionHighlight = useLeasingWorkflowStore((s) => s.requestBondSectionHighlight);
  const detail = useLeasingWorkflowStore((s) => s.getDetail(propertyId));
  const { leasingCycles, apiConnected } = useAgentData();
  const propertyCycles = (leasingCycles ?? []).filter((c) => c.propertyId === propertyId);
  const activeCycleId = splitLeasingCyclesByHistory(propertyCycles).active[0]?.id;
  const resolvedCycleId = leasingCycleId ?? activeCycleId;
  const initializedKeyRef = useRef<string | null>(null);
  const bondFocusAppliedRef = useRef(false);

  useLeasingCycleLiveSync(propertyId, resolvedCycleId, apiConnected, {
    onSynced: (view) => {
      ensureDetail(propertyId, propertyAddress, rentWeekly);
      const step = (view.activeStepHint ?? view.lifecycleStep) as LeasingLifecycleStep;
      const initKey = `${propertyId}:${resolvedCycleId}`;
      if (initializedKeyRef.current !== initKey) {
        resetActiveStepToHint(propertyId, step);
        initializedKeyRef.current = initKey;
      }
    },
  });

  useEffect(() => {
    ensureDetail(propertyId, propertyAddress, rentWeekly);
  }, [ensureDetail, propertyId, propertyAddress, rentWeekly]);

  useEffect(() => {
    if (!leasingCycleId || !isUuid(leasingCycleId)) return;

    return () => {
      if (!apiConnected || !activeCycleId || activeCycleId === leasingCycleId) return;
      void leasingOpsApi.get(activeCycleId).then((view) => {
        applyCycleView(propertyId, view);
      });
    };
  }, [leasingCycleId, activeCycleId, apiConnected, propertyId, applyCycleView]);

  useEffect(() => {
    if (!focusBond) {
      bondFocusAppliedRef.current = false;
      return;
    }
    if (bondFocusAppliedRef.current) return;
    bondFocusAppliedRef.current = true;
    setActiveStep(propertyId, LEASING_LIFECYCLE_STEP.ONBOARDING);
    requestBondSectionHighlight(propertyId);
    onFocusBondHandled?.();
  }, [focusBond, onFocusBondHandled, propertyId, requestBondSectionHighlight, setActiveStep]);

  const cycleReady =
    !leasingCycleId || !isUuid(leasingCycleId) || detail?.cycleId === leasingCycleId;

  if (!detail || !cycleReady) return null;

  return (
    <div className="space-y-1.5">
      {!hideSectionLabel ? (
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Leasing workflow
        </p>
      ) : null}
      <LeasingLifecycleTabs
        detail={detail}
        leasingCycleId={resolvedCycleId}
        onCaseClosed={onCaseClosed}
        onOpenInspectionCreated={onOpenInspectionCreated}
        unifiedRail={unifiedRail}
      />
    </div>
  );
}
