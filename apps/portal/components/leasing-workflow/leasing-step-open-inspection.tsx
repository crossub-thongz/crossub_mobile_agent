'use client';

import { CalendarClock, Megaphone, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import {
  LEASING_ADVERTISING_STATUS,
  LEASING_ADVERTISING_STATUS_LABEL,
  LEASING_TONE,
  LEASING_UI,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn, formatDateTime } from '@/lib/utils';

export function LeasingStepOpenInspection({ detail }: { detail: LeasingPropertyDetail }) {
  const arrange = useLeasingWorkflowStore((s) => s.arrangeOpenInspection);
  const pushToApp = useLeasingWorkflowStore((s) => s.pushInspectionToAgentApp);
  const notify = useLeasingWorkflowStore((s) => s.notifyAgentToAdvertise);

  const oi = detail.openInspection;
  const advTone =
    oi.advertising === LEASING_ADVERTISING_STATUS.PUBLISHED
      ? LEASING_TONE.SUCCESS
      : oi.advertising === LEASING_ADVERTISING_STATUS.PENDING_INTEGRATION
        ? LEASING_TONE.WARNING
        : LEASING_TONE.MUTED;

  return (
    <div className="space-y-3">
      <StepCard
        icon={CalendarClock}
        title="Open inspection"
        description="Arranged viewing time and assigned inspector."
        status={oi.status}
        footer={
          !oi.scheduledTime ? (
            <Button
              size="sm"
              className={cn(LEASING_UI.btnSecondary)}
              variant="ghost"
              onClick={() => {
                arrange(detail.propertyId, 'Lisa Tran', '2026-06-12T11:00:00');
                toast.success('Open inspection arranged');
              }}
            >
              Arrange open inspection
            </Button>
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
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  pushToApp(detail.propertyId);
                  toast.success('Pushed to agent app');
                }}
              >
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
                onClick={() => {
                  notify(detail.propertyId);
                  toast.success('Agent notified to advertise');
                }}
              >
                <Megaphone className="size-3.5" />
                Notify
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-secondary/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
              Listing portals
            </p>
            <LeasingToneBadge
              tone={advTone}
              label={LEASING_ADVERTISING_STATUS_LABEL[oi.advertising]}
              size="xs"
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-[11.5px]">
            {oi.advertisingNote ??
              'Publishing to established listing companies in Malaysia and Australia is a planned API integration.'}
          </p>
        </div>
      </StepCard>
    </div>
  );
}
