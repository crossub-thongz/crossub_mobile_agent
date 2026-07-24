'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  DoorOpen,
  Loader2,
  Mail,
  MessageSquare,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { Timeline } from '@/components/agent/timeline';
import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { OpenInspectionScheduleRequestPanel } from '@/components/open-inspection/open-inspection-schedule-request-panel';
import { OpenInspectionWorkflowView } from '@/components/open-inspection/open-inspection-workflow-view';
import { StartCrossubOpenNowButton } from '@/components/open-inspection/start-crossub-open-now-button';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import {
  inspectionEmailRecordsForStep,
} from '@/lib/inspection/agent-workflow-email';
import { mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import {
  linkedOpenLeasingEmails,
  mergeOpenAndLeasingTimeline,
} from '@/lib/open-inspection/linked-case-history';
import {
  canDeleteOpenInspection,
  cancelOpenInspectionJob,
} from '@/lib/open-inspection-delete';
import {
  AGENT_OPEN_GATE_HINT,
  deriveOpenHeaderStatusFromSession,
  openGateStatusTone,
} from '@/lib/open-inspection-agent-display';
import {
  OPEN_SESSION_RAIL_STEP,
  OPEN_SESSION_RAIL_STEP_LABEL,
  OPEN_SESSION_RAIL_STEP_ORDER,
  type OpenSessionRailStep,
} from '@/lib/open-inspection-session-rail';
import { mergeOpenInspectionSessionPoll } from '@/lib/open-inspection-session-sync';
import {
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
  shouldShowOpenInspectionTenantDetails,
} from '@/lib/open-inspection';
import {
  formatInspectionDurationHours,
  formatInspectionTimeRange,
  needsOpenInspectionScheduleRequest,
  openInspectionStartReached,
} from '@/lib/leasing/open-inspection-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Calendar;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 text-xs last:border-0">
      <dt className="text-muted-foreground inline-flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
        {label}
      </dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  );
}

function Callout({
  tone,
  icon: Icon,
  title,
  body,
  footer,
}: {
  tone: 'warning' | 'info';
  icon?: typeof AlertTriangle;
  title: string;
  body: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 text-xs',
        tone === 'warning' && 'border-amber-500/40 bg-amber-500/10',
        tone === 'info' && 'border-sky-500/30 bg-sky-500/5',
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        {Icon ? <Icon className="size-4 shrink-0 text-amber-600" /> : null}
        {title}
      </p>
      <p className="text-muted-foreground mt-1.5 leading-relaxed">{body}</p>
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

/** Open inspection job case — Scheduled → Open → Report (mirrors ingoing/outgoing layout). */
export function OpenInspectionAgentDetail({
  inspection,
  apiConnected,
  embedded = false,
  onDeleted,
}: {
  inspection: Inspection;
  apiConnected: boolean;
  embedded?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { leasingCycles, refresh, properties } = useAgentData();
  const back = useBackNavigation(ROUTES.INSPECTIONS, 'Inspections');

  const isStandaloneOpenViewing = inspection.source === 'open_viewing';
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(apiConnected);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [viewedStep, setViewedStep] = useState<OpenSessionRailStep>(
    OPEN_SESSION_RAIL_STEP.SCHEDULED,
  );

  const leasingDetail = useLeasingWorkflowStore((s) =>
    inspection.propertyId ? s.getDetail(inspection.propertyId) : undefined,
  );
  const ensureLeasingDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const activeLeasingCycle = useMemo(
    () => leasingCycles.find((cycle) => cycle.propertyId === inspection.propertyId),
    [inspection.propertyId, leasingCycles],
  );
  const linkedLeasingCycleId = openSession?.leasingCycleId ?? activeLeasingCycle?.id;

  const property = inspection.propertyId
    ? properties.find((p) => p.id === inspection.propertyId)
    : undefined;

  useEffect(() => {
    if (!linkedLeasingCycleId || isStandaloneOpenViewing) return;
    ensureLeasingDetail(
      inspection.propertyId,
      inspection.propertyAddress,
      activeLeasingCycle?.rentPerWeek,
    );
  }, [
    activeLeasingCycle?.rentPerWeek,
    ensureLeasingDetail,
    inspection.propertyAddress,
    inspection.propertyId,
    isStandaloneOpenViewing,
    linkedLeasingCycleId,
  ]);

  useLeasingCycleLiveSync(
    inspection.propertyId,
    linkedLeasingCycleId,
    Boolean(!isStandaloneOpenViewing && linkedLeasingCycleId),
  );

  const syncOpenSession = useCallback(async () => {
    if (!apiConnected) {
      setOpenSession(null);
      setLoadingSession(false);
      return;
    }
    setLoadingSession(true);
    const applySession = (session: OpenInspectionSession) => {
      setOpenSession((previous) => mergeOpenInspectionSessionPoll(previous, session));
    };
    try {
      if (isStandaloneOpenViewing) {
        const session = await openViewingsApi.get(inspection.id);
        applySession(session);
        return;
      }
      const sessionId = leasingDetail?.openInspection.viewingSessionId;
      if (sessionId) {
        const session = await openViewingsApi.get(sessionId);
        applySession(session);
        return;
      }
      setOpenSession(null);
    } catch {
      /* keep last good session on transient poll errors */
    } finally {
      setLoadingSession(false);
    }
  }, [
    apiConnected,
    inspection.id,
    isStandaloneOpenViewing,
    leasingDetail?.openInspection.viewingSessionId,
  ]);

  useEffect(() => {
    void syncOpenSession();
  }, [syncOpenSession]);

  useLivePoll(syncOpenSession, apiConnected);

  const displayInspection = useMemo(() => {
    if (isStandaloneOpenViewing && openSession) {
      const mapped = mapOpenSessionToInspection(openSession, inspection.propertyId);
      return {
        ...inspection,
        ...mapped,
        propertyAddress: inspection.propertyAddress || mapped.propertyAddress,
      };
    }
    return inspection;
  }, [inspection, isStandaloneOpenViewing, openSession]);

  const timeline = useMemo(
    () =>
      mergeOpenAndLeasingTimeline({
        openSession,
        leasingDetail: isStandaloneOpenViewing ? undefined : leasingDetail,
        fallback: displayInspection.timeline,
      }),
    [displayInspection.timeline, isStandaloneOpenViewing, leasingDetail, openSession],
  );

  const stageEmails = useMemo(() => {
    const merged = linkedOpenLeasingEmails({ openSession, leasingDetail });
    if (merged.length > 0) return merged;
    if (linkedLeasingCycleId && !isStandaloneOpenViewing) return [];
    return inspectionEmailRecordsForStep(displayInspection);
  }, [
    displayInspection,
    isStandaloneOpenViewing,
    leasingDetail,
    linkedLeasingCycleId,
    openSession,
  ]);

  const isSelfOpen = displayInspection.openConductedBy === 'agent';
  const isLeasingLinked = Boolean(leasingDetail) && !isStandaloneOpenViewing;
  const isCrossubManagedLeasingOpen =
    isLeasingLinked && leasingDetail != null && !leasingDetail.openInspection.agentConducted;
  const needsScheduleRequest =
    isCrossubManagedLeasingOpen &&
    leasingDetail != null &&
    needsOpenInspectionScheduleRequest(leasingDetail.openInspection);
  const canStartCrossubOpenNow =
    isCrossubManagedLeasingOpen &&
    leasingDetail != null &&
    Boolean(leasingDetail.openInspection.scheduledTime) &&
    !openInspectionStartReached(leasingDetail.openInspection) &&
    Boolean(linkedLeasingCycleId) &&
    apiConnected;
  const isCrossubOpen =
    displayInspection.openConductedBy === 'crossub' ||
    isCrossubManagedLeasingOpen ||
    Boolean(
      leasingDetail?.openInspection.preferredScheduledTime ||
        leasingDetail?.openInspection.preferredNotes,
    );
  const inspectorLabel = isSelfOpen
    ? OPEN_CONDUCTED_BY_LABEL.agent
    : (openSession?.agent?.name?.trim() ||
        leasingDetail?.openInspection.inspectorName ||
        displayInspection.inspector) ??
      'Unassigned';
  const headerStatus = deriveOpenHeaderStatusFromSession(displayInspection, openSession);
  const canDelete = apiConnected && canDeleteOpenInspection(displayInspection);

  const showOpenTenantDetails =
    !isLeasingLinked &&
    shouldShowOpenInspectionTenantDetails({
      tenantMovedOut: openSession?.tenantMovedOut ?? displayInspection.tenantMovedOut,
      openListingContext: displayInspection.openListingContext,
    });
  const openTenantContact = (() => {
    if (!showOpenTenantDetails) return null;
    if (openSession?.currentTenant?.name) return openSession.currentTenant;
    if (!property?.tenantName || property.tenantName.trim().toLowerCase() === 'vacant') {
      return null;
    }
    return {
      name: property.tenantName,
      email: property.tenantContact?.email,
      phone: property.tenantContact?.phone,
    };
  })();

  const handleDeleteConfirm = async (reason: string) => {
    if (!apiConnected) {
      throw new Error('Connect to the API to delete cases');
    }
    await cancelOpenInspectionJob(displayInspection, reason);
    toast.success('Open inspection deleted');
    await refresh();
    if (embedded) {
      onDeleted?.();
      return;
    }
    router.push(back.href);
  };

  const scheduledTime =
    openSession?.startTime ??
    leasingDetail?.openInspection.scheduledTime ??
    leasingDetail?.openInspection.preferredScheduledTime ??
    displayInspection.scheduledAt;
  const scheduledTimeEnd =
    openSession?.endTime ??
    leasingDetail?.openInspection.scheduledTimeEnd ??
    leasingDetail?.openInspection.preferredScheduledTimeEnd;

  return (
    <div className="space-y-4">
      {embedded && canDelete ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </div>
      ) : null}

      {!embedded ? (
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <DoorOpen className="size-5" />
              </span>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-secondary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {INSPECTION_TYPE_LABEL[displayInspection.type]}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      openGateStatusTone(
                        openSession
                          ? viewedStep
                          : OPEN_SESSION_RAIL_STEP.SCHEDULED,
                      ),
                    )}
                  >
                    {headerStatus}
                  </span>
                </div>
                <h1 className="text-base font-semibold leading-snug">
                  {displayInspection.propertyAddress}
                </h1>
                <p className="text-muted-foreground text-xs">
                  Case ref {displayInspection.trackingNumber}
                </p>
                {displayInspection.propertyId ? (
                  <Link
                    href={propertyDetail(displayInspection.propertyId)}
                    className="text-primary inline-flex text-xs font-medium hover:underline"
                  >
                    View property
                  </Link>
                ) : null}
              </div>
            </div>
            {canDelete ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {openSession ? (
        <OpenInspectionWorkflowView
          session={openSession}
          propertyLabel={displayInspection.propertyAddress}
          onSessionChange={setOpenSession}
        />
      ) : (
        <>
          <section className="rounded-2xl border bg-card p-3">
            <p className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wide">
              Open inspection progress
            </p>
            <WorkflowProgressRail
              steps={OPEN_SESSION_RAIL_STEP_ORDER}
              labels={OPEN_SESSION_RAIL_STEP_LABEL}
              currentStep={viewedStep}
              progressFillIndex={0}
              getStepState={(step) =>
                resolveWorkflowStepState(false, step === viewedStep)
              }
              isStepCompleted={() => false}
              isStepEnabled={(step) => step === OPEN_SESSION_RAIL_STEP.SCHEDULED}
              onStepClick={(step) => {
                if (step === OPEN_SESSION_RAIL_STEP.SCHEDULED) setViewedStep(step);
              }}
            />
            <p className="text-muted-foreground px-1 pb-1 text-xs leading-relaxed">
              <span className="font-medium text-foreground">
                {viewedStep === OPEN_SESSION_RAIL_STEP.SCHEDULED
                  ? 'Scheduled'
                  : viewedStep === OPEN_SESSION_RAIL_STEP.OPEN
                    ? 'Open'
                    : 'Report'}
              </span>
              {' — '}
              {AGENT_OPEN_GATE_HINT[viewedStep]}
            </p>
          </section>

          {loadingSession && apiConnected ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Syncing open inspection…
            </div>
          ) : null}

          {needsScheduleRequest && linkedLeasingCycleId ? (
            <OpenInspectionScheduleRequestPanel
              propertyId={displayInspection.propertyId}
              cycleId={linkedLeasingCycleId}
            />
          ) : null}

          {leasingDetail?.openInspection.preferredScheduledTime ? (
            <InfoSection title="Preferred schedule">
              <InfoRow
                label="Agent preferred time"
                value={formatInspectionTimeRange(
                  leasingDetail.openInspection.preferredScheduledTime,
                  leasingDetail.openInspection.preferredScheduledTimeEnd,
                )}
                icon={Calendar}
              />
              {formatInspectionDurationHours(
                leasingDetail.openInspection.preferredScheduledTime,
                leasingDetail.openInspection.preferredScheduledTimeEnd,
              ) ? (
                <InfoRow
                  label="Duration"
                  value={
                    formatInspectionDurationHours(
                      leasingDetail.openInspection.preferredScheduledTime,
                      leasingDetail.openInspection.preferredScheduledTimeEnd,
                    )!
                  }
                />
              ) : null}
              {leasingDetail.openInspection.preferredNotes ? (
                <InfoRow label="Notes" value={leasingDetail.openInspection.preferredNotes} />
              ) : null}
            </InfoSection>
          ) : null}

          {leasingDetail?.openInspection.scheduledTime ? (
            <InfoSection title="Confirmed viewing">
              <InfoRow
                label="Scheduled time"
                value={formatInspectionTimeRange(
                  leasingDetail.openInspection.scheduledTime,
                  leasingDetail.openInspection.scheduledTimeEnd,
                )}
                icon={Calendar}
              />
              {formatInspectionDurationHours(
                leasingDetail.openInspection.scheduledTime,
                leasingDetail.openInspection.scheduledTimeEnd,
              ) ? (
                <InfoRow
                  label="Duration"
                  value={
                    formatInspectionDurationHours(
                      leasingDetail.openInspection.scheduledTime,
                      leasingDetail.openInspection.scheduledTimeEnd,
                    )!
                  }
                />
              ) : null}
              {leasingDetail.openInspection.inspectorName ? (
                <InfoRow
                  label="Inspector"
                  value={leasingDetail.openInspection.inspectorName}
                  icon={User}
                />
              ) : null}
              {canStartCrossubOpenNow && linkedLeasingCycleId ? (
                <div className="pt-2">
                  <StartCrossubOpenNowButton
                    propertyId={displayInspection.propertyId}
                    cycleId={linkedLeasingCycleId}
                    inspectionId={leasingDetail.openInspection.inspectionId}
                  />
                </div>
              ) : null}
            </InfoSection>
          ) : null}

          <section className="rounded-2xl border bg-card p-4">
            <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
              Inspector details
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  Open inspection date
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {scheduledTime ? formatDateTime(scheduledTime) : 'Not scheduled'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                  Inspector name
                </dt>
                <dd className="mt-1 text-sm font-medium">{inspectorLabel}</dd>
              </div>
            </dl>
          </section>

          {isSelfOpen ? (
            <Callout
              tone="warning"
              icon={AlertTriangle}
              title="You are running this open inspection"
              body={SELF_OPEN_INSPECTION_DISCLAIMER}
              footer={
                displayInspection.openListingContext === 'occupied' &&
                !displayInspection.agentTenantNotifiedConfirmed ? (
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Action required: notify the tenant of the open date and time.
                  </p>
                ) : displayInspection.agentTenantNotifiedConfirmed &&
                    displayInspection.agentTenantNotifiedAt ? (
                  <p className="text-muted-foreground">
                    Tenant notified {formatDateTime(displayInspection.agentTenantNotifiedAt)}
                  </p>
                ) : null
              }
            />
          ) : null}

          {isCrossubOpen && !needsScheduleRequest ? (
            <Callout
              tone="info"
              title="CROSSUB is arranging this open inspection"
              body={`CROSSUB will contact the ${
                showOpenTenantDetails ? 'tenant' : 'listing contacts'
              } and manage scheduling on your behalf.`}
            />
          ) : null}

          {showOpenTenantDetails && openTenantContact ? (
            <InfoSection title="Tenant details">
              <InfoRow label="Name" value={openTenantContact.name} icon={User} />
              {openTenantContact.email ? (
                <InfoRow label="Email" value={openTenantContact.email} icon={Mail} />
              ) : null}
              {openTenantContact.phone ? (
                <InfoRow label="Phone" value={openTenantContact.phone} icon={MessageSquare} />
              ) : null}
            </InfoSection>
          ) : null}

          {isCrossubOpen && displayInspection.openListingContext ? (
            <InfoSection title="Open inspection details">
              <InfoRow
                label="Property context"
                value={OPEN_LISTING_CONTEXT_LABEL[displayInspection.openListingContext]}
              />
            </InfoSection>
          ) : null}
        </>
      )}

      <JobCaseStageEmailHistory emails={stageEmails} title="Email/message history" />

      <section className="rounded-2xl border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          onClick={() => setActivityExpanded((value) => !value)}
          aria-expanded={activityExpanded}
        >
          <span className="text-sm font-semibold">Activity</span>
          <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {timeline.length} event{timeline.length === 1 ? '' : 's'}
            <ChevronDown
              className={cn('size-4 transition-transform', activityExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {activityExpanded ? (
          <div className="border-t px-4 py-3">
            <Timeline entries={timeline} />
          </div>
        ) : null}
      </section>

      {!apiConnected ? (
        <p className="text-muted-foreground text-xs">
          Connect to the API to see live open inspection status.
        </p>
      ) : null}

      <WorkflowCaseDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete open inspection"
        description="The open inspection is cancelled and removed from applicant browse. A reason is required."
        confirmLabel="Delete open inspection"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
