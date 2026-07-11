'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { OpenInspectionApplyShareCard } from '@/components/open-inspection/open-inspection-apply-share-card';
import { StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { inspectionDetail } from '@/constants/routes';
import { cancelAgentLeasingCycle } from '@/lib/crossub-api/agent-workflow-client';
import { crossubWebOpenInspectionUrl } from '@/lib/crossub-web-url';
import { fromLeasingWorkflow } from '@/lib/detail-navigation';
import { LEASING_UI } from '@/lib/leasing/constants';
import { resolveOpenInspectionSessionId } from '@/lib/leasing/resolve-open-inspection-session';
import {
  canCancelLetting,
  formatInspectionTimeRange,
  formatLettingRent,
  formatTenantMovedOutDate,
  isAssignedInspectorName,
  OPEN_INSPECTION_PENDING,
  resolveOpenInspectionForProperty,
} from '@/lib/leasing/open-inspection-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { cn, formatDate } from '@/lib/utils';

function pendingOr(value?: string | null): string {
  return isAssignedInspectorName(value) ? value!.trim() : OPEN_INSPECTION_PENDING;
}

export function LeasingStepOpenInspection({ detail }: { detail: LeasingPropertyDetail }) {
  const router = useRouter();
  const { inspections, leasingCycles, apiConnected, refresh } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const clearDetail = useLeasingWorkflowStore((s) => s.clearDetail);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;

  const oi = detail.openInspection;
  const { rental } = detail;

  const linkedInspection = useMemo(
    () =>
      resolveOpenInspectionForProperty(inspections, detail.propertyId, oi.viewingSessionId),
    [inspections, detail.propertyId, oi.viewingSessionId],
  );

  const inspectionHref = oi.viewingSessionId
    ? inspectionDetail(oi.viewingSessionId, fromLeasingWorkflow(detail.propertyId))
    : linkedInspection
      ? inspectionDetail(linkedInspection.id, fromLeasingWorkflow(detail.propertyId))
      : null;

  const inspectorName = pendingOr(oi.inspectorName ?? linkedInspection?.inspector);
  const inspectionTime = formatInspectionTimeRange(
    oi.scheduledTime ?? linkedInspection?.scheduledAt,
    oi.scheduledTimeEnd,
  );

  const staffOpenInspectionHref =
    oi.viewingSessionId
      ? crossubWebOpenInspectionUrl(detail.propertyId, oi.viewingSessionId)
      : null;

  useEffect(() => {
    if (!apiConnected || !oi.viewingSessionId) {
      setOpenSession(null);
      return;
    }
    void openViewingsApi
      .get(oi.viewingSessionId)
      .then(setOpenSession)
      .catch(() => setOpenSession(null));
  }, [apiConnected, oi.viewingSessionId]);

  const allowCancel = canCancelLetting(detail, linkedInspection);

  const openJobCase = async () => {
    const sessionId = await resolveOpenInspectionSessionId(detail, {
      cycleId: apiConnected ? cycleId : undefined,
      onCycleView: (view) => applyCycleView(detail.propertyId, view),
    });
    if (!sessionId) return;
    router.push(inspectionDetail(sessionId, fromLeasingWorkflow(detail.propertyId)));
  };

  const handleCancelLetting = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error('Please enter a reason for cancelling');
      return;
    }
    if (!apiConnected || !cycleId) {
      toast.error('Connect to the API to cancel this letting');
      return;
    }
    setCancelling(true);
    try {
      await cancelAgentLeasingCycle(detail.propertyId, cycleId, { reason });
      clearDetail(detail.propertyId);
      await refresh();
      setCancelOpen(false);
      setCancelReason('');
      toast.success('Letting cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel letting');
    } finally {
      setCancelling(false);
    }
  };

  const lettingFacts = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StepFact label="New rental" value={formatLettingRent(rental.rentPerWeek)} />
      <StepFact
        label="Available from"
        value={rental.availableFrom ? formatDate(rental.availableFrom) : '—'}
      />
      <StepFact label="Lease term" value={rental.leaseTerm ?? '—'} />
      <StepFact label="Tenant moved out" value={formatTenantMovedOutDate(detail)} />
    </div>
  );

  const inspectorFacts = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StepFact label="Inspection time" value={inspectionTime} className="sm:col-span-2" />
        <StepFact label="Inspector name" value={inspectorName} />
        <StepFact label="Contact number" value={pendingOr(oi.inspectorPhone)} />
        <StepFact label="Email" value={pendingOr(oi.inspectorEmail)} className="sm:col-span-2" />
      </div>
      {staffOpenInspectionHref ? (
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
          <a href={staffOpenInspectionHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5" />
            Open in CROSSUB staff portal
          </a>
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      {lettingFacts}
      {rental.lettingNotes ? (
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{rental.lettingNotes}</p>
        </div>
      ) : null}

      <StepCard
        icon={CalendarClock}
        title="Open inspection & arrangement"
        description="An inspector will claim this job from the task pool. Details appear here once accepted."
        status={oi.status}
        footer={
          <div className="flex flex-wrap items-center gap-2">
            {allowCancel ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                Cancel letting
              </Button>
            ) : null}
            {inspectionHref ? (
              <Button
                size="sm"
                className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
                variant="ghost"
                onClick={() => void openJobCase()}
              >
                <ExternalLink className="size-3.5" />
                Open job case
              </Button>
            ) : null}
          </div>
        }
      >
        {inspectorFacts}
        {!allowCancel && (oi.scheduledTime || isAssignedInspectorName(oi.inspectorName)) ? (
          <p className="text-muted-foreground text-[11px]">
            This letting can no longer be cancelled — an inspector or inspection time has been
            scheduled.
          </p>
        ) : null}
        {!inspectionHref ? (
          <p className="text-muted-foreground text-[12px]">
            Waiting for an inspector to accept the open inspection from the task pool.
          </p>
        ) : null}
      </StepCard>

      {openSession?.applyUrl ? (
        <OpenInspectionApplyShareCard session={openSession} compact />
      ) : null}

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this letting?</DialogTitle>
            <DialogDescription>
              This will close the new letting workflow and stop the weekly auto-rerun. Please
              provide a reason — for example, the landlord decided not to lease anymore.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-letting-reason">Reason for cancelling</Label>
            <Textarea
              id="cancel-letting-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Landlord decided not to lease anymore"
              rows={3}
              maxLength={500}
              disabled={cancelling}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Keep letting
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelling || !cancelReason.trim()}
              onClick={() => void handleCancelLetting()}
            >
              {cancelling ? 'Cancelling…' : 'Cancel letting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
