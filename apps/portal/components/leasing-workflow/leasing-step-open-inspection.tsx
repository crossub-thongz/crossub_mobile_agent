'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, DoorOpen, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CreateInspectionWizard, type InspectionCreateResult } from '@/components/inspections/create-inspection-wizard';
import { InspectionPlatformPaymentPrompt } from '@/components/billing/inspection-platform-payment-prompt';
import { OpenLeasingGenerateReportButton } from '@/components/leasing-workflow/open-leasing-generate-report-button';
import { OpenLeasingInspectionReportPanel } from '@/components/leasing-workflow/open-leasing-inspection-report-panel';
import { OpenInspectionApplicantLinksPanel } from '@/components/open-inspection/open-inspection-applicant-links-panel';
import { OpenInspectionApplicantPanel } from '@/components/open-inspection/open-inspection-applicant-panel';
import { OpenInspectionKeyCustodySection } from '@/components/open-inspection/open-inspection-key-custody-section';
import { OpenInspectionScheduleRequestPanel } from '@/components/open-inspection/open-inspection-schedule-request-panel';
import { StartCrossubOpenNowButton } from '@/components/open-inspection/start-crossub-open-now-button';
import { canStartOpenInspectionNow } from '@/constants/open-batch';
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
import { useOpenInspectionEmailSources } from '@/hooks/use-open-inspection-email-sources';
import {
  isOpenPlatformPaymentActive,
  resolveOpenPlatformPaymentInspectionId,
} from '@/lib/billing/inspection-platform-payment';
import { cancelAgentLeasingCycle } from '@/lib/crossub-api/agent-workflow-client';
import { crossubWebOpenInspectionUrl } from '@/lib/crossub-web-url';
import { LEASING_AGENT_SELF_OPEN_LABEL, LEASING_UI } from '@/lib/leasing/constants';
import { resolveOpenInspectionSessionId } from '@/lib/leasing/resolve-open-inspection-session';
import { fetchLatestOpenPoolInspection } from '@/lib/open-inspection-resolve';
import {
  canCancelLetting,
  formatInspectionDurationHours,
  formatInspectionTimeRange,
  formatLettingRent,
  formatTenantMovedOutDate,
  needsOpenInspectionScheduleRequest,
  openInspectionStartReached,
  resolveOpenInspectionForProperty,
} from '@/lib/leasing/open-inspection-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { isLettingOpenReportVisibleStep, isLettingScheduledStep, deriveLettingRailProgress, LETTING_RAIL_STEP } from '@/lib/leasing/letting-rail-progress';
import { isLeasingOpenReportReady } from '@/components/leasing-workflow/open-leasing-inspection-report-panel';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { useLivePoll } from '@/lib/use-live-poll';
import { cn, formatDate } from '@/lib/utils';

export function LeasingStepOpenInspection({
  detail,
  leasingCycleId,
  onOpenInspectionCreated,
}: {
  detail: LeasingPropertyDetail;
  /** Known server cycle id from the case row / timeline (preferred over portfolio lookup). */
  leasingCycleId?: string;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const { inspections, leasingCycles, apiConnected, refresh } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const clearDetail = useLeasingWorkflowStore((s) => s.clearDetail);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const [now, setNow] = useState(() => new Date());

  const tickNow = useCallback(() => {
    setNow(new Date());
  }, []);
  useLivePoll(tickNow);

  const showOpenReport = isLettingOpenReportVisibleStep(detail, now);
  const isScheduledStep = isLettingScheduledStep(detail, now);
  const { currentRailStep } = deriveLettingRailProgress(detail, now);
  const reportReady =
    isLeasingOpenReportReady(detail) || openSession?.openReportGenerated === true;

  const cycle = (leasingCycles ?? []).find((c) => c.propertyId === detail.propertyId);
  const cycleId = leasingCycleId ?? detail.cycleId ?? cycle?.id;

  const oi = detail.openInspection;
  const { rental } = detail;
  const crossubManagedOpen = !oi.agentConducted;

  const linkedInspection = useMemo(
    () =>
      resolveOpenInspectionForProperty(
        inspections ?? [],
        detail.propertyId,
        oi.viewingSessionId,
        oi.inspectionId,
      ),
    [inspections, detail.propertyId, oi.viewingSessionId, oi.inspectionId],
  );

  const hasOpenInspection = Boolean(
    oi.viewingSessionId ||
      oi.scheduledTime ||
      oi.preferredScheduledTime ||
      oi.preferredNotes ||
      oi.inspectionId ||
      linkedInspection?.id ||
      (crossubManagedOpen && oi.status === 'in_progress'),
  );

  const { poolInspectionRecord, poolInspectionId } = useOpenInspectionEmailSources({
    enabled: crossubManagedOpen && hasOpenInspection,
    apiConnected,
    leasingDetail: detail,
    focusInspectionId: oi.inspectionId ?? linkedInspection?.id,
    poll: true,
  });

  const openPoolInspectionId = resolveOpenPlatformPaymentInspectionId({
    poolInspectionId,
    leasingDetail: detail,
    openSession,
    focusInspectionId: oi.inspectionId ?? linkedInspection?.id,
  });

  const openPlatformPaymentActive = isOpenPlatformPaymentActive({
    isCrossubOpen: crossubManagedOpen,
    isSelfOpen: oi.agentConducted,
    isDone: reportReady || oi.status === 'done',
    poolInspectionRecord,
    inspection: linkedInspection ?? null,
    leasingDetail: detail,
    openSession,
  });

  const openBillingInspectionId =
    openPoolInspectionId ??
    poolInspectionRecord?.id ??
    oi.inspectionId ??
    openSession?.inspectionId ??
    linkedInspection?.id ??
    null;
  const isScheduled = Boolean(oi.scheduledTime ?? linkedInspection?.scheduledAt);
  const isRequested = !isScheduled && Boolean(oi.preferredScheduledTime || oi.preferredNotes);
  const crossubOrderPlaced =
    crossubManagedOpen && hasOpenInspection && !isScheduled && !isRequested;
  const needsScheduleRequest =
    crossubManagedOpen && needsOpenInspectionScheduleRequest(oi);
  const canStartOpenNow =
    // CRS-0068 — off for agents. Starting an open "now" chooses its time, and `startNow`
    // skips the weekly batch and the Saturday rule to do it.
    canStartOpenInspectionNow &&
    crossubManagedOpen &&
    isScheduled &&
    !openInspectionStartReached(oi, now) &&
    Boolean(cycleId) &&
    apiConnected;

  const canOpenJobCase = Boolean(oi.viewingSessionId || oi.inspectionId || linkedInspection);

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

  const inspectionDuration = isScheduled
    ? formatInspectionDurationHours(
        oi.scheduledTime ?? linkedInspection?.scheduledAt,
        oi.scheduledTimeEnd,
      )
    : isRequested
      ? formatInspectionDurationHours(
          oi.preferredScheduledTime,
          oi.preferredScheduledTimeEnd,
        )
      : null;

  const inspectionTimeLabel = isScheduled
    ? 'Scheduled'
    : isRequested
      ? 'Preferred (awaiting CROSSUB)'
      : crossubOrderPlaced
        ? 'Order placed'
        : 'Awaiting schedule';

  const staffOpenInspectionHref =
    oi.viewingSessionId
      ? crossubWebOpenInspectionUrl(detail.propertyId, oi.viewingSessionId)
      : null;

  /** Only on this cycle's OI — not a stale OPEN job from another letting on the property. */
  const canShowGenerateReport =
    hasOpenInspection &&
    !reportReady &&
    (showOpenReport ||
      (currentRailStep === LETTING_RAIL_STEP.SCHEDULED &&
        openInspectionStartReached(oi, now)));

  useEffect(() => {
    if (!apiConnected || !oi.viewingSessionId) {
      setOpenSession(null);
      return;
    }
    const load = () => {
      void openViewingsApi
        .get(oi.viewingSessionId!)
        .then(setOpenSession)
        .catch(() => setOpenSession(null));
    };
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [apiConnected, oi.viewingSessionId]);

  const allowCancel = canCancelLetting(detail, linkedInspection);

  const openJobCase = async () => {
    const inspectionId = oi.inspectionId ?? linkedInspection?.id;
    if (inspectionId) {
      onOpenInspectionCreated?.(inspectionId);
      return;
    }
    const sessionId = await resolveOpenInspectionSessionId(detail, {
      cycleId: apiConnected ? cycleId : undefined,
      onCycleView: (view) => applyCycleView(detail.propertyId, view),
    });
    if (sessionId) {
      onOpenInspectionCreated?.(sessionId);
    }
  };

  const handleCancelLetting = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error('Please enter a reason for cancelling');
      return;
    }
    if (!cycleId) {
      toast.error('Could not find this letting to cancel. Refresh and try again.');
      return;
    }
    setCancelling(true);
    try {
      await cancelAgentLeasingCycle(detail.propertyId, cycleId, { reason, force: true });
      clearDetail(detail.propertyId);
      await refresh({ force: true }).catch(() => undefined);
      setCancelOpen(false);
      setCancelReason('');
      toast.success('Letting cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel letting');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenInspectionCreated = async (result?: InspectionCreateResult) => {
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

    let inspectionId = result?.inspectionId;
    if (!inspectionId && oi.inspectionId) {
      inspectionId = oi.inspectionId;
    }
    if (!inspectionId && apiConnected) {
      const pooled = await fetchLatestOpenPoolInspection(detail.propertyId);
      inspectionId = pooled?.id;
    }
    if (!inspectionId) {
      inspectionId = (
        await resolveOpenInspectionSessionId(detail, {
          cycleId: apiConnected ? cycleId : undefined,
          onCycleView: (view) => applyCycleView(detail.propertyId, view),
        })
      ) ?? undefined;
    }

    if (inspectionId) {
      onOpenInspectionCreated?.(inspectionId);
    }
  };

  return (
    <div className="space-y-3">
      {openPlatformPaymentActive && !openBillingInspectionId ? (
        <section className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm">
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading payment details…
          </div>
        </section>
      ) : null}

      {openPlatformPaymentActive ? (
        <InspectionPlatformPaymentPrompt
          inspectionId={openBillingInspectionId ?? oi.viewingSessionId ?? oi.inspectionId ?? ''}
          poolInspectionId={openBillingInspectionId ?? openPoolInspectionId ?? undefined}
          propertyId={detail.propertyId}
          viewingSessionId={oi.viewingSessionId ?? undefined}
          inspectionType="OPEN"
          active
        />
      ) : null}

      {oi.agentConducted ? (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3">
          <p className="text-sm font-semibold">{LEASING_AGENT_SELF_OPEN_LABEL}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            This letting was opened with you running the open inspection yourself. Advertise the
            property, run the viewing, and add applicants when ready.
          </p>
        </div>
      ) : null}
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
                {inspectionDuration ? (
                  <>
                    {' '}
                    · <span className="text-foreground font-medium">{inspectionDuration}</span>
                  </>
                ) : null}
              </p>
              {isRequested && oi.preferredNotes ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Notes: {oi.preferredNotes}
                </p>
              ) : null}
              {crossubOrderPlaced ? (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Choose a Saturday for CROSSUB to conduct the open inspection.
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
            {canStartOpenNow && cycleId ? (
              <StartCrossubOpenNowButton
                propertyId={detail.propertyId}
                cycleId={cycleId}
                inspectionId={oi.inspectionId}
                onStarted={(inspectionId) => {
                  if (inspectionId) onOpenInspectionCreated?.(inspectionId);
                }}
              />
            ) : null}
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
            {/* {staffOpenInspectionHref ? (
              <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <a href={staffOpenInspectionHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  Open in staff portal
                </a>
              </Button>
            ) : null} */}
          </div>
        </div>
      ) : crossubManagedOpen ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
          <div className="bg-secondary flex size-11 items-center justify-center rounded-full">
            <DoorOpen className="text-muted-foreground size-5" />
          </div>
          <p className="mt-3 text-sm font-medium">Open inspection order placed</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            CROSSUB will arrange the open inspection and contact the tenant or listing contacts on
            your behalf. Applicants who apply via the viewing QR code are linked here automatically.
          </p>
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
            Create open inspection
          </Button>
        </div>
      )}

      {needsScheduleRequest && cycleId ? (
        <OpenInspectionScheduleRequestPanel
          propertyId={detail.propertyId}
          cycleId={cycleId}
          onScheduled={(inspectionId) => {
            if (inspectionId) onOpenInspectionCreated?.(inspectionId);
          }}
        />
      ) : null}

      {oi.agentConducted && oi.viewingSessionId ? (
        <OpenInspectionApplicantLinksPanel
          propertyId={detail.propertyId}
          viewingSessionId={oi.viewingSessionId}
          apiConnected={apiConnected}
          inspectionId={oi.inspectionId ?? linkedInspection?.id}
        />
      ) : null}

      {openSession && (isScheduled || isScheduledStep || showOpenReport) && !oi.agentConducted ? (
        <>
          <OpenInspectionKeyCustodySection
            inspectionId={
              openSession.inspectionId ?? oi.inspectionId ?? linkedInspection?.id
            }
            apiConnected={apiConnected}
            inspectionComplete={openSession.sessionStatus === 'closed'}
          />
            <OpenInspectionApplicantPanel
            session={openSession}
            onSessionChange={setOpenSession}
            readOnly
          />
        </>
      ) : null}

      {canShowGenerateReport ? (
        <OpenLeasingGenerateReportButton
          cycleId={cycleId}
          sessionId={oi.viewingSessionId ?? undefined}
          reportReady={reportReady}
          onCycleView={(view) => applyCycleView(detail.propertyId, view)}
          onSessionUpdated={setOpenSession}
        />
      ) : null}

      {showOpenReport && hasOpenInspection ? (
        <OpenLeasingInspectionReportPanel
          detail={detail}
          openSession={openSession}
          showPending
          onSessionChange={setOpenSession}
        />
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
            <DialogTitle>Schedule Open Inspection</DialogTitle>
            <DialogDescription>
              Choose a Saturday — CROSSUB assigns an inspector from the task pool.
            </DialogDescription>
          </DialogHeader>
          <CreateInspectionWizard
            key={createOpen ? 'open-create' : 'closed'}
            preselectedPropertyId={detail.propertyId}
            initialType="OPEN"
            hideTypePicker
            hidePropertySelect
            leasingCycleId={cycleId}
            navigateOnSuccess={false}
            onCreated={(result) => void handleOpenInspectionCreated(result)}
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
    </div>
  );
}
