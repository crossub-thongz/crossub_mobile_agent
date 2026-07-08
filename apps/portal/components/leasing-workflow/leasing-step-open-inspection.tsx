'use client';

import { useState } from 'react';
import { CalendarClock, Megaphone, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  LEASING_ADVERTISING_STATUS,
  LEASING_ADVERTISING_STATUS_LABEL,
  LEASING_TONE,
  LEASING_UI,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatDateTime } from '@/lib/utils';

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(11, 0, 0, 0);
  return d.toISOString().slice(0, 19);
}

export function LeasingStepOpenInspection({ detail }: { detail: LeasingPropertyDetail }) {
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const pushToAppLocal = useLeasingWorkflowStore((s) => s.pushInspectionToAgentApp);
  const notifyLocal = useLeasingWorkflowStore((s) => s.notifyAgentToAdvertise);
  const arrangeLocal = useLeasingWorkflowStore((s) => s.arrangeOpenInspection);

  const [arranging, setArranging] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState(toDatetimeLocalValue(defaultScheduleTime()));

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;

  const oi = detail.openInspection;
  const advTone =
    oi.advertising === LEASING_ADVERTISING_STATUS.PUBLISHED
      ? LEASING_TONE.SUCCESS
      : oi.advertising === LEASING_ADVERTISING_STATUS.PENDING_INTEGRATION
        ? LEASING_TONE.WARNING
        : LEASING_TONE.MUTED;

  const arrange = async () => {
    const scheduledTime = new Date(scheduledLocal).toISOString();
    setArranging(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.arrangeOpenInspection(cycleId, { scheduledTime });
        applyCycleView(detail.propertyId, view);
        toast.success('Open inspection arranged');
      } else {
        arrangeLocal(detail.propertyId, 'Pending assignment', scheduledTime);
        toast.success('Open inspection arranged');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not arrange open inspection');
    } finally {
      setArranging(false);
    }
  };

  const pushToApp = async () => {
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.pushInspectionToAgentApp(cycleId);
        applyCycleView(detail.propertyId, view);
      } else {
        pushToAppLocal(detail.propertyId);
      }
      toast.success('Pushed to agent app');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not push to agent app');
    }
  };

  const notify = async () => {
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.notifyAgentToAdvertise(cycleId);
        applyCycleView(detail.propertyId, view);
      } else {
        notifyLocal(detail.propertyId);
      }
      toast.success('Agent notified to advertise');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not notify agent');
    }
  };

  return (
    <div className="space-y-3">
      <StepCard
        icon={CalendarClock}
        title="Open inspection"
        description="Arranged viewing time and assigned inspector."
        status={oi.status}
        footer={
          !oi.scheduledTime ? (
            <div className="space-y-2">
              <Input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                className={cn(LEASING_UI.btnSecondary)}
                variant="ghost"
                disabled={arranging}
                onClick={() => void arrange()}
              >
                Arrange open inspection
              </Button>
            </div>
          ) : undefined
        }
      >
        {oi.scheduledTime ? (
          <div className="grid grid-cols-2 gap-3">
            <StepFact label="Inspector" value={oi.inspectorName ?? 'Unassigned'} />
            <StepFact label="Scheduled" value={formatDateTime(oi.scheduledTime)} />
          </div>
        ) : (
          <p className="text-muted-foreground text-[12px]">No open inspection arranged yet.</p>
        )}
      </StepCard>

      <StepCard
        icon={Smartphone}
        title="Agent app & advertising"
        description="Push the arranged time to the agent app and notify the agent to advertise."
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <BoolStatus
              done={oi.pushedToAgentApp}
              doneLabel="Pushed to agent app"
              pendingLabel="Not yet pushed to agent app"
            />
            {!oi.pushedToAgentApp && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void pushToApp()}>
                Push
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <BoolStatus
              done={oi.agentNotifiedToAdvertise}
              doneLabel="Agent notified to advertise"
              pendingLabel="Agent not yet notified"
            />
            {!oi.agentNotifiedToAdvertise && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() => void notify()}
              >
                <Megaphone className="size-3.5" />
                Notify
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-secondary/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
              Listing portals
            </p>
            <LeasingToneBadge
              tone={advTone}
              label={LEASING_ADVERTISING_STATUS_LABEL[oi.advertising]}
              size="xs"
            />
          </div>
        </div>
      </StepCard>
    </div>
  );
}
