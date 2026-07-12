'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail } from '@/constants/routes';
import { fromLeasingWorkflow } from '@/lib/detail-navigation';
import { createAgentIngoingInspection } from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_AGENT_DECISION, LEASING_UI } from '@/lib/leasing/constants';
import {
  LEASING_INGOING_SCHEDULE_WINDOW_DAYS,
  suggestLeasingIngoingScheduledTime,
} from '@/lib/leasing/leasing-ingoing-handoff';
import {
  hasLeasingIngoingCase,
  isLeasingReadyForIngoingHandoff,
  showLeasingIngoingNextStepPanel,
} from '@/lib/leasing/lifecycle';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingCycleApprovalRef } from '@/lib/workflow-case-reference';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatDateTime } from '@/lib/utils';

export function LeasingIngoingNextStepPanel({ detail }: { detail: LeasingPropertyDetail }) {
  const router = useRouter();
  const { leasingCycles, apiConnected, refresh } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const scheduleLocal = useLeasingWorkflowStore((s) => s.scheduleIngoingInspection);

  const [busy, setBusy] = useState(false);

  if (!showLeasingIngoingNextStepPanel(detail)) return null;

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;
  const ing = detail.onboarding.ingoingInspection;
  const caseExists = hasLeasingIngoingCase(detail);
  const canStart = isLeasingReadyForIngoingHandoff(detail);

  const openJobCase = (inspectionId: string) => {
    router.push(inspectionDetail(inspectionId, fromLeasingWorkflow(detail.propertyId)));
  };

  const handleStart = async () => {
    const moveIn = detail.rental.moveInDate ?? detail.rental.availableFrom;
    if (!moveIn) {
      toast.error('Move-in date is required before scheduling an ingoing inspection');
      return;
    }

    const scheduledTime = suggestLeasingIngoingScheduledTime(moveIn);
    if (!scheduledTime) {
      toast.error('Could not calculate a scheduled inspection time');
      return;
    }

    setBusy(true);
    try {
      let inspectionId: string | null = null;

      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.scheduleIngoingInspection(cycleId, {
          scheduledTime,
          assignee: 'Task pool',
        });
        applyCycleView(detail.propertyId, view);
        inspectionId = view.onboarding?.ingoingInspection?.inspectionId ?? null;
        await refresh();
      } else if (apiConnected) {
        const approved = detail.applicationsDetail.find(
          (a) => a.agentDecision === LEASING_AGENT_DECISION.APPROVED,
        );
        const created = await createAgentIngoingInspection(detail.propertyId, {
          moveInDate: moveIn.slice(0, 10),
          scheduledTime: new Date(scheduledTime).toISOString(),
          tenantName: approved?.applicant ?? 'Tenant',
          tenantEmail: approved?.email?.trim() || undefined,
          tenantPhone: approved?.phone?.trim() || undefined,
          leaseApprovalRef: leasingCycleApprovalRef(cycleId),
        });
        inspectionId = created.id;
        scheduleLocal(detail.propertyId, scheduledTime, 'Task pool', created.id);
        await refresh();
      } else {
        scheduleLocal(detail.propertyId, scheduledTime, 'Task pool');
      }

      if (!inspectionId) {
        toast.error('Ingoing inspection was scheduled but no job id was returned');
        return;
      }

      toast.success('Ingoing inspection created — opening job case');
      openJobCase(inspectionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not schedule ingoing inspection');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenCase = async () => {
    setBusy(true);
    try {
      let inspectionId = ing.inspectionId ?? null;

      if (!inspectionId && apiConnected && cycleId) {
        const view = await leasingOpsApi.get(cycleId);
        applyCycleView(detail.propertyId, view);
        inspectionId = view.onboarding?.ingoingInspection?.inspectionId ?? null;
      }

      if (!inspectionId) {
        toast.error('Ingoing job case not found — try scheduling again');
        return;
      }

      openJobCase(inspectionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open ingoing job case');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <div className="bg-border/80 h-px flex-1" />
        <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
          Next step
        </span>
        <div className="bg-border/80 h-px flex-1" />
      </div>

      <div
        className={cn(
          'rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4',
          LEASING_UI.ingoingTabGlow,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-teal-950 dark:text-teal-50">
              <Sparkles className="size-4 text-teal-600 dark:text-teal-400" />
              Ingoing inspection
            </p>
            {caseExists ? (
              <p className="text-muted-foreground text-xs">
                Ingoing inspection scheduled
                {ing.scheduledTime ? ` for ${formatDateTime(ing.scheduledTime)}` : ''}
                {ing.assignee ? ` — ${ing.assignee}` : ''}. Open the job case to track progress.
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Onboarding is complete. Schedule the ingoing inspection — property and tenant
                details are prefilled and scheduled {LEASING_INGOING_SCHEDULE_WINDOW_DAYS} days before
                move-in. The job enters the task pool for an inspector to claim.
              </p>
            )}
          </div>
          {canStart ? (
            <Button
              size="sm"
              className={cn('h-9 shrink-0 gap-1.5 text-xs', LEASING_UI.ingoingBtn)}
              disabled={busy}
              onClick={() => void handleStart()}
            >
              {busy ? 'Creating…' : 'Schedule ingoing inspection'}
            </Button>
          ) : (
            <Button
              size="sm"
              className={cn('h-9 shrink-0 gap-1.5 text-xs', LEASING_UI.ingoingBtn)}
              variant="outline"
              disabled={busy}
              onClick={() => void handleOpenCase()}
            >
              <ExternalLink className="size-3.5" />
              {busy ? 'Opening…' : 'Open job case'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
