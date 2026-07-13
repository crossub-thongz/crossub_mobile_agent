'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, DoorOpen, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { CreateInspectionWizard } from '@/components/inspections/create-inspection-wizard';
import { OpenInspectionApplyShareCard } from '@/components/open-inspection/open-inspection-apply-share-card';
import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { StepFact } from '@/components/leasing-workflow/leasing-step-kit';
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
  resolveOpenInspectionForProperty,
} from '@/lib/leasing/open-inspection-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { cn, formatDate } from '@/lib/utils';

export function LeasingStepOpenInspection({ detail }: { detail: LeasingPropertyDetail }) {
  const { inspections, leasingCycles, apiConnected, refresh } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const clearDetail = useLeasingWorkflowStore((s) => s.clearDetail);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const [inspectionDialogId, setInspectionDialogId] = useState<string | null>(null);

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;

  const oi = detail.openInspection;
  const { rental } = detail;

  const linkedInspection = useMemo(
    () =>
      resolveOpenInspectionForProperty(inspections, detail.propertyId, oi.viewingSessionId),
    [inspections, detail.propertyId, oi.viewingSessionId],
  );

  const dialogInspection = useMemo(
    () => inspections.find((item) => item.id === inspectionDialogId) ?? linkedInspection,
    [inspectionDialogId, inspections, linkedInspection],
  );

  const hasOpenInspection = Boolean(
    oi.viewingSessionId ||
      oi.scheduledTime ||
      oi.preferredScheduledTime ||
      oi.preferredNotes ||
      linkedInspection,
  );
  const isScheduled = Boolean(oi.scheduledTime ?? linkedInspection?.scheduledAt);
  const isRequested = !isScheduled && Boolean(oi.preferredScheduledTime || oi.preferredNotes);
  const canOpenJobCase = Boolean(oi.viewingSessionId || linkedInspection);

  const inspectionTime = isScheduled
    ? formatInspectionTimeRange(
        oi.scheduledTime ?? linkedInspection?.scheduledAt,
        oi.scheduledTimeEnd,
      )
    : isRequested
      ? formatInspectionTimeRange(
          oi.preferredScheduledTime,
          oi.preferredScheduledTimeEnd,
        )
      : formatInspectionTimeRange();

  const inspectionTimeLabel = isScheduled
    ? 'Scheduled'
    : isRequested
      ? 'Preferred (awaiting CROSSUB)'
      : 'Awaiting schedule';

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
    setInspectionDialogId(sessionId);
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

  const handleOpenInspectionCreated = async () => {
    setCreateOpen(false);
    if (apiConnected && cycleId) {
      try {
        const view = await leasingOpsApi.get(cycleId);
        applyCycleView(detail.propertyId, view);
      } catch {
        /* live sync will catch up */
      }
    }
    await refresh();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StepFact label="New rental" value={formatLettingRent(rental.rentPerWeek)} />
        <StepFact
          label="Available from"
          value={rental.availableFrom ? formatDate(rental.availableFrom) : '—'}
        />
        <StepFact label="Lease term" value={rental.leaseTerm ?? '—'} />
        <StepFact label="Tenant moved out" value={formatTenantMovedOutDate(detail)} />
      </div>

      {rental.lettingNotes ? (
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{rental.lettingNotes}</p>
        </div>
      ) : null}

      {hasOpenInspection ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <CalendarClock className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold">Open inspection</p>
              <p className="text-muted-foreground text-xs">
                {inspectionTimeLabel} ·{' '}
                <span className="text-foreground font-medium">{inspectionTime}</span>
              </p>
              {isRequested && oi.preferredNotes ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Notes: {oi.preferredNotes}
                </p>
              ) : null}
              {oi.pushedToAgentApp ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Advertise the property, run the viewing, and submit applicants when ready.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canOpenJobCase ? (
              <Button
                size="sm"
                className={cn('h-8 gap-1.5 text-xs', LEASING_UI.btnSecondary)}
                variant="outline"
                onClick={() => void openJobCase()}
              >
                <ExternalLink className="size-3.5" />
                Open job case
              </Button>
            ) : null}
            {staffOpenInspectionHref ? (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <a href={staffOpenInspectionHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open in staff portal
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
          <div className="bg-secondary flex size-11 items-center justify-center rounded-full">
            <DoorOpen className="text-muted-foreground size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">No open inspection yet</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            Schedule an open inspection for prospects, or wait for CROSSUB to arrange one for you.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4 h-9 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Create open inspection
          </Button>
        </div>
      )}

      {openSession?.applyUrl ? (
        <OpenInspectionApplyShareCard session={openSession} compact />
      ) : null}

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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent elevated className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request open inspection</DialogTitle>
            <DialogDescription>
              Tell CROSSUB when you would like the viewing, or schedule it yourself. CROSSUB
              confirms the official time before advertising.
            </DialogDescription>
          </DialogHeader>
          <CreateInspectionWizard
            key={createOpen ? 'open-create' : 'closed'}
            preselectedPropertyId={detail.propertyId}
            initialType="OPEN"
            hideTypePicker
            hidePropertySelect
            navigateOnSuccess={false}
            onCreated={() => void handleOpenInspectionCreated()}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          setCancelOpen(open);
          if (!open) setCancelReason('');
        }}
      >
        <DialogContent elevated>
          <DialogHeader>
            <DialogTitle>Cancel this letting?</DialogTitle>
            <DialogDescription>
              This will close the new leasing workflow and stop the weekly auto-rerun. Please
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

      <InspectionDetailDialog
        open={inspectionDialogId !== null}
        onClose={() => setInspectionDialogId(null)}
        inspection={dialogInspection}
        navContext={fromLeasingWorkflow(detail.propertyId)}
      />
    </div>
  );
}
