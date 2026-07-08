'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail } from '@/constants/routes';
import { fromLeasingWorkflow } from '@/lib/detail-navigation';
import { LEASING_UI } from '@/lib/leasing/constants';
import { resolveOpenInspectionSessionId } from '@/lib/leasing/resolve-open-inspection-session';
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

function inspectorLabel(name?: string): string {
  if (
    name &&
    !['pending assignment', 'task pool', 'pending — task pool'].includes(name.toLowerCase())
  ) {
    return name;
  }
  return 'Pending — task pool';
}

export function LeasingStepOpenInspection({ detail }: { detail: LeasingPropertyDetail }) {
  const router = useRouter();
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const arrangeLocal = useLeasingWorkflowStore((s) => s.arrangeOpenInspection);

  const [arranging, setArranging] = useState(false);
  const [openingJob, setOpeningJob] = useState(false);
  const [scheduledLocal, setScheduledLocal] = useState(toDatetimeLocalValue(defaultScheduleTime()));

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;

  const oi = detail.openInspection;
  const inspectionHref = oi.viewingSessionId
    ? inspectionDetail(oi.viewingSessionId, fromLeasingWorkflow(detail.propertyId))
    : null;

  const navigateToOpenInspection = async () => {
    setOpeningJob(true);
    try {
      const sessionId = await resolveOpenInspectionSessionId(detail, {
        cycleId: apiConnected ? cycleId : undefined,
        onCycleView: (view) => applyCycleView(detail.propertyId, view),
      });
      if (!sessionId) {
        toast.error('Open inspection job case not found — try scheduling again');
        return;
      }
      router.push(inspectionDetail(sessionId, fromLeasingWorkflow(detail.propertyId)));
    } finally {
      setOpeningJob(false);
    }
  };

  const arrange = async () => {
    const scheduledTime = new Date(scheduledLocal).toISOString();
    setArranging(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.arrangeOpenInspection(cycleId, { scheduledTime });
        applyCycleView(detail.propertyId, view);
        toast.success('Open inspection arranged — opening job case');
        const sessionId =
          view.viewingSessionId ??
          (await resolveOpenInspectionSessionId(
            { ...detail, openInspection: { ...detail.openInspection, scheduledTime } },
            {
              cycleId,
              onCycleView: (refreshed) => applyCycleView(detail.propertyId, refreshed),
            },
          ));
        if (sessionId) {
          router.push(inspectionDetail(sessionId, fromLeasingWorkflow(detail.propertyId)));
        }
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

  return (
    <div className="space-y-3">
      <StepCard
        icon={CalendarClock}
        title="Open inspection"
        description="Schedule the viewing time — an inspector will claim the job from the task pool."
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
                {arranging ? 'Scheduling…' : 'Schedule open inspection'}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
              variant="ghost"
              disabled={openingJob}
              onClick={() => void navigateToOpenInspection()}
            >
              <ExternalLink className="size-3.5" />
              {openingJob ? 'Opening…' : 'Open job case'}
            </Button>
          )
        }
      >
        {oi.scheduledTime ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StepFact label="Inspector" value={inspectorLabel(oi.inspectorName)} />
              <StepFact label="Scheduled" value={formatDateTime(oi.scheduledTime)} />
            </div>
            {inspectionHref ? (
              <Link
                href={inspectionHref}
                className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              >
                <ExternalLink className="size-3.5" />
                View open inspection case
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-[12px]">No open inspection scheduled yet.</p>
        )}
      </StepCard>
    </div>
  );
}
