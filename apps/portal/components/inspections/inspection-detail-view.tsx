'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  FileText,
  Home,
  Key,
  Mail,
  MessageSquare,
  Trash2,
  User,
  Users,
} from 'lucide-react';

import { AgentFieldInspectionDetail } from '@/components/inspections/agent-field-inspection-detail';
import { InspectionCompareEvidenceSection } from '@/components/inspections/inspection-compare-evidence-section';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { RoutineSelfInspectionReviewSection } from '@/components/inspections/routine-self-inspection-review-section';
import { RoutineSelfPreviousSubmissionSection } from '@/components/inspections/routine-self-previous-submission-section';
import { RoutineInPersonKeyCustodySection } from '@/components/inspections/routine-in-person-key-custody-section';
import { OpenInspectionApplicantPanel } from '@/components/open-inspection/open-inspection-applicant-panel';
import { OpenInspectionOpenStage } from '@/components/open-inspection/open-inspection-open-stage';
import { OpenInspectionScheduleRequestPanel } from '@/components/open-inspection/open-inspection-schedule-request-panel';
import { StartCrossubOpenNowButton } from '@/components/open-inspection/start-crossub-open-now-button';
import { OpenInspectionEarlyStartNotice } from '@/components/open-inspection/open-inspection-early-start-notice';
import { OpenInspectionSessionRail } from '@/components/open-inspection/open-inspection-session-rail';
import { LeasingLifecycleStepRail } from '@/components/leasing-workflow/leasing-lifecycle-step-rail';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { DocumentViewer } from '@/components/agent/document-viewer';
import { StatusBadge } from '@/components/agent/status-badge';
import { Timeline } from '@/components/agent/timeline';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES, inspectionDetail } from '@/constants/routes';
import type { DetailNavContext } from '@/lib/detail-navigation';
import {
  inspectionEmailRecordsForStep,
} from '@/lib/inspection/agent-workflow-email';
import { LEASING_AGENT_DECISION, LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import {
  linkedOpenLeasingEmails,
  mergeOpenAndLeasingTimeline,
} from '@/lib/open-inspection/linked-case-history';
import {
  isLettingOpenReportVisibleStep,
  isLettingResultsStep,
} from '@/lib/leasing/letting-rail-progress';
import { OpenNewLeasingCaseButton } from '@/components/leasing-workflow/open-new-leasing-case-button';
import { OpenLeasingInspectionReportPanel } from '@/components/leasing-workflow/open-leasing-inspection-report-panel';
import { formatInspectionDurationHours, formatInspectionTimeRange, needsOpenInspectionScheduleRequest, openInspectionStartReached } from '@/lib/leasing/open-inspection-display';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { useLeasingCycleLiveSync } from '@/lib/use-leasing-cycle-live-sync';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useRecordRecentCaseVisit } from '@/hooks/use-record-recent-visit';
import {
  INSPECTION_TYPE_LABEL,
  inspectionNextAction,
} from '@/lib/inspections/presentation';
import { openViewingsApi } from '@/lib/open-viewings-api';
import {
  canDeleteOpenInspection,
  cancelOpenInspectionJob,
} from '@/lib/open-inspection-delete';
import { canCompleteOpenSessionReview } from '@/lib/open-inspection-session-rail';
import { mergeOpenInspectionSessionPoll } from '@/lib/open-inspection-session-sync';
import { crossubWebOpenInspectionUrl } from '@/lib/crossub-web-url';
import {
  OPEN_CONDUCTED_BY_LABEL,
  OPEN_LISTING_CONTEXT_LABEL,
  SELF_OPEN_INSPECTION_DISCLAIMER,
  shouldShowOpenInspectionTenantDetails,
} from '@/lib/open-inspection';
import { useInspectionDetailLiveSync } from '@/lib/use-inspection-detail-live-sync';
import { useLivePoll } from '@/lib/use-live-poll';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  routineInspectionApi,
  type ServerRoutineScheduleView,
} from '@/lib/routine-inspection-api';
import { mapInspectionRecordToView, mapOpenSessionToInspection } from '@/lib/inspection-mappers';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

export function InspectionDetailView({
  inspectionId,
  embedded = false,
  navContext,
  onClose,
}: {
  inspectionId: string;
  embedded?: boolean;
  navContext?: DetailNavContext;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { inspections, leasingCycles, apiConnected, registerInspection, refresh, properties } =
    useAgentData();
  const baseFromList = inspections.find((i) => i.id === inspectionId);
  const [fetchedBase, setFetchedBase] = useState<Inspection | null>(null);
  const [resolveState, setResolveState] = useState<'pending' | 'ready' | 'missing'>(
    baseFromList ? 'ready' : 'pending',
  );

  useEffect(() => {
    if (baseFromList) {
      setFetchedBase(null);
      setResolveState('ready');
      return;
    }

    if (!apiConnected) {
      setResolveState('missing');
      return;
    }

    let cancelled = false;
    setResolveState('pending');
    void inspectionsApi
      .get(inspectionId)
      .then((record) => {
        if (cancelled) return;
        const mapped = mapInspectionRecordToView(record);
        registerInspection(mapped);
        setFetchedBase(mapped);
        setResolveState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setResolveState('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, baseFromList, inspectionId, registerInspection]);

  const base = baseFromList ?? fetchedBase;
  const isOpenViewingSource = base?.type === 'OPEN' && base?.source === 'open_viewing';
  const liveInsp = useInspectionDetailLiveSync(base, apiConnected && !isOpenViewingSource);
  const [openSession, setOpenSession] = useState<OpenInspectionSession | null>(null);

  const leasingDetail = useLeasingWorkflowStore((s) =>
    base?.propertyId ? s.getDetail(base.propertyId) : undefined,
  );
  const ensureLeasingDetail = useLeasingWorkflowStore((s) => s.ensureDetail);
  const activeLeasingCycle = useMemo(
    () =>
      base?.propertyId
        ? leasingCycles.find((cycle) => cycle.propertyId === base.propertyId)
        : undefined,
    [base?.propertyId, leasingCycles],
  );
  const linkedLeasingCycleId = openSession?.leasingCycleId ?? activeLeasingCycle?.id;

  const isStandaloneOpenViewing = isOpenViewingSource;

  const insp = useMemo(() => {
    const row = liveInsp ?? base;
    if (!row) return row;
    if (isOpenViewingSource && openSession) {
      const mapped = mapOpenSessionToInspection(openSession, row.propertyId);
      return {
        ...row,
        ...mapped,
        propertyAddress: row.propertyAddress || mapped.propertyAddress,
        timeline: mergeOpenAndLeasingTimeline({
          openSession,
          leasingDetail,
          fallback: row.timeline.length > 0 ? row.timeline : mapped.timeline,
        }),
      };
    }
    if (row.type === 'OPEN' && (openSession || leasingDetail)) {
      return {
        ...row,
        timeline: mergeOpenAndLeasingTimeline({
          openSession,
          leasingDetail,
          fallback: row.timeline,
        }),
      };
    }
    return row;
  }, [liveInsp, base, isOpenViewingSource, openSession, leasingDetail]);

  useEffect(() => {
    if (!insp || insp.type !== 'OPEN' || !linkedLeasingCycleId) return;
    ensureLeasingDetail(
      insp.propertyId,
      insp.propertyAddress,
      activeLeasingCycle?.rentPerWeek,
    );
  }, [
    activeLeasingCycle?.rentPerWeek,
    ensureLeasingDetail,
    insp,
    linkedLeasingCycleId,
  ]);

  useLeasingCycleLiveSync(
    insp?.propertyId ?? '',
    linkedLeasingCycleId,
    Boolean(insp?.type === 'OPEN' && linkedLeasingCycleId),
  );
  const stageEmails = useMemo(() => {
    if (!insp) return [];
    if (insp.type === 'OPEN') {
      const merged = linkedOpenLeasingEmails({ openSession, leasingDetail });
      if (merged.length > 0) return merged;
      if (linkedLeasingCycleId) return [];
      return inspectionEmailRecordsForStep(insp);
    }
    return inspectionEmailRecordsForStep(insp);
  }, [insp, linkedLeasingCycleId, leasingDetail, openSession]);
  const [completingReview, setCompletingReview] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [routineDetail, setRoutineDetail] = useState<InspectionDetail | null>(null);
  const [routineSchedule, setRoutineSchedule] = useState<ServerRoutineScheduleView | null>(null);

  useEffect(() => {
    if (!apiConnected || !insp || insp.type !== 'ROUTINE') {
      setRoutineDetail(null);
      setRoutineSchedule(null);
      return;
    }
    let cancelled = false;
    void inspectionsApi
      .getDetail(insp.id)
      .then((detail) => {
        if (!cancelled) setRoutineDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setRoutineDetail(null);
      });
    void routineInspectionApi
      .getByInspection(insp.id)
      .then((schedule) => {
        if (!cancelled) setRoutineSchedule(schedule);
      })
      .catch(() => {
        if (!cancelled) setRoutineSchedule(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiConnected, insp?.id, insp?.type]);
  const back = useBackNavigation(ROUTES.INSPECTIONS, 'Inspections');

  const syncOpenSession = useCallback(async () => {
    if (!apiConnected || !base || base.type !== 'OPEN') {
      setOpenSession(null);
      return;
    }
    const applySession = (session: OpenInspectionSession) => {
      setOpenSession((previous) => mergeOpenInspectionSessionPoll(previous, session));
    };
    if (base.source === 'open_viewing') {
      try {
        const session = await openViewingsApi.get(base.id);
        applySession(session);
      } catch {
        /* keep last good session on transient poll errors */
      }
      return;
    }
    const sessionId = leasingDetail?.openInspection.viewingSessionId;
    if (sessionId) {
      try {
        const session = await openViewingsApi.get(sessionId);
        applySession(session);
      } catch {
        /* keep last good session on transient poll errors */
      }
      return;
    }
    setOpenSession(null);
  }, [apiConnected, base, leasingDetail?.openInspection.viewingSessionId]);

  useEffect(() => {
    void syncOpenSession();
  }, [syncOpenSession]);

  useLivePoll(syncOpenSession, apiConnected && base?.type === 'OPEN');

  useRecordRecentCaseVisit({
    id: base?.id,
    kind:
      base?.type === 'OPEN'
        ? 'open'
        : base?.type === 'INGOING'
          ? 'ingoing'
          : base?.type === 'OUTGOING'
            ? 'outgoing'
            : 'routine',
    address: base?.propertyAddress,
    href: base ? inspectionDetail(base.id) : '',
    module: 'inspection',
  });

  if (resolveState === 'pending') {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading inspection…
      </div>
    );
  }

  if (resolveState === 'missing' || !insp) {
    if (embedded) {
      return (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Could not load this inspection job case.
        </p>
      );
    }
    notFound();
  }

  if (insp.type === 'INGOING' || insp.type === 'OUTGOING') {
    return <AgentFieldInspectionDetail inspection={insp} apiConnected={apiConnected} />;
  }

  const nextAction = inspectionNextAction(insp);
  const isOpenLeasingCase =
    insp.type === 'OPEN' && Boolean(leasingDetail) && !isStandaloneOpenViewing;
  const isSelfOpen = insp.type === 'OPEN' && insp.openConductedBy === 'agent';
  const isCrossubManagedLeasingOpen =
    isOpenLeasingCase && Boolean(leasingDetail) && !leasingDetail.openInspection.agentConducted;
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
    insp.type === 'OPEN' &&
    (insp.openConductedBy === 'crossub' ||
      isCrossubManagedLeasingOpen ||
      Boolean(leasingDetail?.openInspection.preferredScheduledTime || leasingDetail?.openInspection.preferredNotes));
  const inspectorLabel = isSelfOpen
    ? OPEN_CONDUCTED_BY_LABEL.agent
    : insp.inspector ?? 'Unassigned';
  const visitors = openSession?.visitors ?? [];
  const applicantsWithApplications = visitors.filter((v) => v.application);
  const approvedApplicants = applicantsWithApplications.filter(
    (v) => v.application?.agentDecision === LEASING_AGENT_DECISION.APPROVED,
  );
  const reportGenerated = openSession?.openReportGenerated === true;
  const canCompleteReview = openSession
    ? canCompleteOpenSessionReview(openSession)
    : false;
  const hasReport = reportGenerated || insp.reportStatus === 'sent' || Boolean(insp.reportUrl);
  const sources = openSession?.reportSourceCounts;
  const canDelete = apiConnected && canDeleteOpenInspection(insp);
  const property = insp.propertyId
    ? properties.find((p) => p.id === insp.propertyId)
    : undefined;
  const showOpenTenantDetails =
    insp.type === 'OPEN' &&
    !isOpenLeasingCase &&
    shouldShowOpenInspectionTenantDetails({
      tenantMovedOut: openSession?.tenantMovedOut ?? insp.tenantMovedOut,
      openListingContext: insp.openListingContext,
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
  const isOpenResultsStep =
    !isStandaloneOpenViewing &&
    Boolean(leasingDetail) &&
    insp.type === 'OPEN' &&
    isLettingResultsStep(leasingDetail);
  const isOpenReportVisibleStep =
    !isStandaloneOpenViewing &&
    Boolean(leasingDetail) &&
    insp.type === 'OPEN' &&
    isLettingOpenReportVisibleStep(leasingDetail);
  const showSessionRail = Boolean(
    openSession && insp.type === 'OPEN' && (isStandaloneOpenViewing || !isOpenReportVisibleStep),
  );
  const showLettingRail = Boolean(
    insp.type === 'OPEN' && leasingDetail && !showSessionRail && !isStandaloneOpenViewing,
  );

  const handleDeleteConfirm = async (reason: string) => {
    if (!apiConnected) {
      throw new Error('Connect to the API to delete cases');
    }
    await cancelOpenInspectionJob(insp, reason);
    toast.success('Open inspection deleted');
    await refresh();
    if (embedded) {
      onClose?.();
      return;
    }
    router.push(back.href);
  };

  const TypeIcon =
    insp.type === 'OPEN' ? DoorOpen : insp.type === 'ROUTINE' ? ClipboardList : Home;

  return (
    <div className="space-y-5">
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
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <TypeIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-secondary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {INSPECTION_TYPE_LABEL[insp.type]}
              </span>
              <StatusBadge label={insp.status} />
            </div>
            <h1 className="text-base font-semibold leading-snug">{insp.propertyAddress}</h1>
            <p className="text-muted-foreground text-xs">Case ref {insp.trackingNumber}</p>
            {insp.propertyId && (
              <Link
                href={propertyDetail(insp.propertyId)}
                className="text-primary inline-flex text-xs font-medium hover:underline"
              >
                View property
              </Link>
            )}
          </div>
          {canDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive h-8 shrink-0 gap-1.5 text-xs"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <FactTile
            icon={Calendar}
            label="Scheduled"
            value={insp.scheduledAt ? formatDateTime(insp.scheduledAt) : 'Not set'}
          />
          <FactTile icon={User} label="Inspector" value={inspectorLabel} />
          {typeof insp.visitorCount === 'number' && (
            <FactTile
              icon={Users}
              label="Visitors"
              value={String(insp.visitorCount)}
            />
          )}
          <FactTile
            icon={FileText}
            label="Report"
            value={
              reportGenerated || insp.reportStatus === 'sent'
                ? 'Complete'
                : insp.reportUrl
                  ? 'Available'
                  : 'Pending'
            }
          />
        </div>
      </section>
      ) : null}

      {showLettingRail && leasingDetail ? (
        <div className="space-y-3">
          <LeasingLifecycleStepRail
            detail={leasingDetail}
            currentStep={
              isOpenResultsStep
                ? LEASING_LIFECYCLE_STEP.RESULTS
                : LEASING_LIFECYCLE_STEP.OPEN_INSPECTION
            }
            liveUpdates={false}
          />
          {isOpenResultsStep ? (
            <div className="flex justify-end">
              <OpenNewLeasingCaseButton propertyId={insp.propertyId} />
            </div>
          ) : null}
        </div>
      ) : null}

      {showSessionRail && openSession && !isStandaloneOpenViewing ? (
        <section className="rounded-2xl border bg-card px-2 py-1">
          <OpenInspectionSessionRail session={openSession} />
        </section>
      ) : null}

      {needsScheduleRequest && !isOpenResultsStep && linkedLeasingCycleId ? (
        <OpenInspectionScheduleRequestPanel
          propertyId={insp.propertyId}
          cycleId={linkedLeasingCycleId}
        />
      ) : null}

      {insp.type === 'OPEN' && leasingDetail?.openInspection.preferredScheduledTime && !isOpenResultsStep ? (
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

      {insp.type === 'OPEN' && leasingDetail?.openInspection.scheduledTime && !isOpenResultsStep ? (
        <InfoSection title="Confirmed viewing">
          <OpenInspectionEarlyStartNotice
            startedEarly={leasingDetail.openInspection.startedEarly}
            startedEarlyAt={leasingDetail.openInspection.startedEarlyAt}
            originalScheduledStart={leasingDetail.openInspection.originalScheduledStart}
            className="mb-3"
          />
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
            <InfoRow label="Inspector" value={leasingDetail.openInspection.inspectorName} icon={User} />
          ) : null}
          {canStartCrossubOpenNow && linkedLeasingCycleId ? (
            <div className="pt-2">
              <StartCrossubOpenNowButton
                propertyId={insp.propertyId}
                cycleId={linkedLeasingCycleId}
                inspectionId={leasingDetail.openInspection.inspectionId}
              />
            </div>
          ) : null}
        </InfoSection>
      ) : null}

      {!isOpenLeasingCase && !isStandaloneOpenViewing && nextAction ? (
        <section
          className={cn(
            'rounded-2xl border p-4',
            nextAction.tone === 'warning' && 'border-amber-500/40 bg-amber-500/10',
            nextAction.tone === 'success' && 'border-primary/30 bg-primary/5',
            nextAction.tone === 'info' && 'border-sky-500/30 bg-sky-500/5',
            nextAction.tone === 'default' && 'bg-secondary/20',
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">What to do next</p>
          <p className="mt-1 text-sm font-semibold">{nextAction.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{nextAction.description}</p>
          {hasReport && !showReport && (
            <Button size="sm" className="mt-3 h-8" onClick={() => setShowReport(true)}>
              View report
            </Button>
          )}
        </section>
      ) : null}

      {isSelfOpen && !isOpenResultsStep && !isStandaloneOpenViewing && (
        <Callout
          tone="warning"
          icon={AlertTriangle}
          title="You are running this open inspection"
          body={SELF_OPEN_INSPECTION_DISCLAIMER}
          footer={
            insp.openListingContext === 'occupied' && !insp.agentTenantNotifiedConfirmed ? (
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Action required: notify the tenant of the open date and time.
              </p>
            ) : insp.agentTenantNotifiedConfirmed && insp.agentTenantNotifiedAt ? (
              <p className="text-muted-foreground">
                Tenant notified {formatDateTime(insp.agentTenantNotifiedAt)}
              </p>
            ) : null
          }
        />
      )}

      {isCrossubOpen && !isOpenResultsStep && !needsScheduleRequest && (
        <Callout
          tone="info"
          title="CROSSUB is arranging this open inspection"
          body={`CROSSUB will contact the ${
            showOpenTenantDetails ? 'tenant' : 'listing contacts'
          } and manage scheduling on your behalf.`}
        />
      )}

      {showOpenTenantDetails && openTenantContact && !isOpenResultsStep ? (
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

      {isCrossubOpen && insp.openListingContext && !isOpenResultsStep && insp.tenantMovedOut == null ? (
        <InfoSection title="Open inspection details">
          <InfoRow
            label="Property context"
            value={OPEN_LISTING_CONTEXT_LABEL[insp.openListingContext]}
          />
        </InfoSection>
      ) : null}

      {(insp.keyStatus || insp.tenantAck || insp.routineMode || insp.nextDueDate) && (
        <InfoSection title="Job details">
          {insp.keyStatus && <InfoRow label="Key status" value={insp.keyStatus} icon={Key} />}
          {insp.tenantAck && (
            <InfoRow label="Tenant acknowledgement" value={insp.tenantAck} icon={CheckCircle2} />
          )}
          {insp.routineMode && (
            <InfoRow
              label="Routine mode"
              value={insp.routineMode === 'self' ? 'Tenant self-inspection' : 'In-person'}
            />
          )}
          {insp.nextDueDate && (
            <InfoRow label="Next due" value={formatDateTime(insp.nextDueDate)} icon={Calendar} />
          )}
        </InfoSection>
      )}

      {openSession && insp.type === 'OPEN' && isStandaloneOpenViewing ? (
        <OpenInspectionWorkflowView
          session={openSession}
          propertyLabel={insp.propertyAddress}
          onSessionChange={setOpenSession}
        />
      ) : null}

      {openSession &&
      insp.type === 'OPEN' &&
      !isStandaloneOpenViewing &&
      leasingDetail?.openInspection.agentConducted &&
      !isOpenResultsStep ? (
        <OpenInspectionOpenStage session={openSession} onSessionChange={setOpenSession} />
      ) : null}

      {openSession && insp.type === 'OPEN' && !isStandaloneOpenViewing && !isOpenResultsStep ? (
        <InfoSection title={`Applicants (${applicantsWithApplications.length})`}>
          <OpenInspectionApplicantPanel
            session={openSession}
            onSessionChange={(session) => {
              setOpenSession(session);
            }}
            readOnly
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {!reportGenerated ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                disabled={!canCompleteReview || completingReview}
                onClick={async () => {
                  setCompletingReview(true);
                  try {
                    const session = await openViewingsApi.completeReview(openSession.id);
                    setOpenSession(session);
                    toast.success('Review complete — open report generated');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not complete review');
                  } finally {
                    setCompletingReview(false);
                  }
                }}
              >
                <CheckCircle2 className="size-3.5" />
                {completingReview ? 'Completing…' : 'Complete review'}
              </Button>
            ) : null}
            {reportGenerated && !isOpenResultsStep ? (
              <InspectionReportDownloadActions
                inspectionId={openSession.id}
                propertyLabel={insp.propertyAddress}
                inspectionType="open"
                fetchPdf={openViewingsApi.downloadReportPdf}
                variant="inline"
                size="sm"
              />
            ) : null}
          </div>
          {reportGenerated && sources && !isOpenResultsStep ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <p className="text-muted-foreground col-span-2 font-medium uppercase tracking-wide">
                Open report summary
              </p>
              <p>Tenant app: {sources.tenantApp}</p>
              <p>Apply link / QR: {sources.linkOrQr}</p>
            </div>
          ) : null}
        </InfoSection>
      ) : null}

      {visitors.length > 0 && !(openSession && insp.type === 'OPEN') && (
        <InfoSection title={`Applicants (${visitors.length})`}>
          <ul className="space-y-2">
            {visitors.map((visitor) => (
              <li key={visitor.id} className="rounded-xl border bg-background px-3 py-2.5 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{visitor.name}</p>
                  {visitor.application ? (
                    <StatusBadge label={visitor.application.agentDecision} />
                  ) : null}
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {visitor.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" />
                      {visitor.email}
                    </span>
                  )}
                  {visitor.phone && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {visitor.phone}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 capitalize">
                  {visitor.registrationSource.replace(/_/g, ' ')} ·{' '}
                  {visitor.attendanceStatus.replace(/_/g, ' ')}
                  {visitor.application ? ' · application submitted' : ''}
                </p>
              </li>
            ))}
          </ul>
          {insp.propertyId ? (
            <Button asChild size="sm" variant="outline" className="mt-3 h-8 gap-1.5 text-xs">
              <a
                href={crossubWebOpenInspectionUrl(insp.propertyId, insp.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage in staff portal
              </a>
            </Button>
          ) : null}
        </InfoSection>
      )}

      {insp.maintenanceEscalations && insp.maintenanceEscalations.length > 0 && (
        <InfoSection title="Maintenance escalation">
          <ul className="space-y-2 text-xs">
            {insp.maintenanceEscalations.map((e) => (
              <li key={e.label} className="flex items-center justify-between gap-2">
                <span>{e.label}</span>
                <StatusBadge label={e.severity} priority={e.severity} />
              </li>
            ))}
          </ul>
        </InfoSection>
      )}

      {isOpenReportVisibleStep && hasReport && leasingDetail ? (
        <OpenLeasingInspectionReportPanel
          detail={leasingDetail}
          openSession={openSession}
        />
      ) : null}

      {insp.type === 'ROUTINE' &&
      (routineSchedule?.flow ?? insp.routineMode) === 'in_person' &&
      insp.id ? (
        <RoutineInPersonKeyCustodySection
          inspectionId={insp.id}
          apiConnected={apiConnected}
          inspectorAssigned={Boolean(insp.inspector && insp.inspector !== 'Unassigned')}
        />
      ) : null}

      {insp.type === 'ROUTINE' && routineSchedule?.currentInspection?.previousSubmission ? (
        <RoutineSelfPreviousSubmissionSection
          submission={routineSchedule.currentInspection.previousSubmission}
          propertyLabel={insp.propertyAddress}
          inspectionRecordId={routineSchedule.currentInspectionId ?? routineSchedule.currentInspection.id}
          declineReason={routineSchedule.currentInspection.declineReason}
        />
      ) : null}

      {insp.type === 'ROUTINE' && routineSchedule?.currentInspection?.declineReason ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
          Awaiting tenant to re-upload the routine self-inspection.
        </div>
      ) : null}

      {insp.type === 'ROUTINE' && routineSchedule ? (
        <RoutineSelfInspectionReviewSection
          schedule={routineSchedule}
          propertyLabel={insp.propertyAddress}
          onUpdated={setRoutineSchedule}
        />
      ) : null}

      {insp.type === 'ROUTINE' && routineDetail ? (
        <InspectionCompareEvidenceSection
          detail={routineDetail}
          currentLabel="Routine"
          title={
            (routineSchedule?.flow ?? insp.routineMode) === 'self'
              ? 'Tenant self-inspection photos'
              : 'Routine vs latest ingoing'
          }
          showReferenceIngoing={
            (routineSchedule?.flow ?? insp.routineMode) !== 'self'
          }
        />
      ) : null}

      {hasReport && insp.type !== 'OPEN' && (
        <section className="space-y-3">
          {!showReport ? (
            <Button variant="outline" className="h-11 w-full rounded-xl" onClick={() => setShowReport(true)}>
              <FileText className="size-4" />
              View inspection report
            </Button>
          ) : (
            <DocumentViewer
              title={`${insp.type} inspection report`}
              propertyAddress={insp.propertyAddress}
              category="inspection"
              downloadUrl={insp.reportUrl}
              onClose={() => setShowReport(false)}
            />
          )}
        </section>
      )}

      {insp.type === 'OPEN' ? (
        <JobCaseStageEmailHistory emails={stageEmails} title="Email/message history" />
      ) : !isStandaloneOpenViewing ? (
        <JobCaseStageEmailHistory emails={stageEmails} />
      ) : null}

      <section className="rounded-2xl border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          onClick={() => setActivityExpanded((value) => !value)}
          aria-expanded={activityExpanded}
        >
          <span className="text-sm font-semibold">Activity</span>
          <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {insp.timeline.length} event{insp.timeline.length === 1 ? '' : 's'}
            <ChevronDown
              className={cn('size-4 transition-transform', activityExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {activityExpanded ? (
          <div className="border-t px-4 py-3">
            <Timeline entries={insp.timeline} />
          </div>
        ) : null}
      </section>

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

function FactTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-secondary/30 rounded-xl px-3 py-2.5">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-1 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

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
        {Icon && <Icon className="size-3.5 shrink-0" />}
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
        tone === 'info' && 'border-border bg-secondary/20',
      )}
    >
      <div className="flex gap-2">
        {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-amber-600" />}
        <div className="space-y-2">
          <p className="text-sm font-semibold">{title}</p>
          <p className="leading-relaxed">{body}</p>
          {footer}
        </div>
      </div>
    </div>
  );
}
