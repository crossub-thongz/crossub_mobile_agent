'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Home,
  KeyRound,
  Loader2,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { FieldInspectionReportReviewSection } from '@/components/inspections/field-inspection-report-review-section';
import { HandoverNotesBlock } from '@/components/inspections/handover-custody-notes';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { InspectorNameWithHistory } from '@/components/inspections/inspector-name-with-history';
import { formatInspectorReassignmentLabel } from '@/lib/inspector-reassignment-label';
import { LEASING_AGENT_DECISION, LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { LEASING_INGOING_SCHEDULE_WINDOW_DAYS } from '@/lib/leasing/leasing-ingoing-handoff';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import { cancelIngoingInspectionJob } from '@/lib/ingoing-inspection-cancel';
import { markInspectionCancelledLocally } from '@/lib/inspection-job-cancel';
import {
  inspectionJobCaseEmails,
} from '@/lib/inspection/agent-workflow-email';
import { mergeInspectionCaseAudit } from '@/lib/inspection-case-audit';
import { inspectionsApi } from '@/lib/inspections-api';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import {
  deriveTenantAckState,
  isReportSubmitted,
} from '@/lib/inspections/agent-field-inspection-status';
import { isInspectionReportReadyForView } from '@/lib/inspections/inspection-report-ready';
import {
  AGENT_INGOING_GATE_HINT,
  AGENT_INGOING_GATE_LABEL,
  AGENT_INGOING_GATE_STEPS,
  agentIngoingGateIndex,
  canCancelIngoingInspection,
  deriveAgentIngoingGateStatus,
  formatInspectorFieldStatus,
  inspectorHasAcceptedJob,
  resolveIngoingInspectionDateDisplay,
  type AgentIngoingGateStatus,
} from '@/lib/ingoing-inspection-display';
import {
  mergeInspectionDetail,
  mergeInspectionRecord,
  mergeOnSiteProgression,
  mergeReportUrl,
} from '@/lib/inspections/field-inspection-snapshot-merge';
import { InspectionPlatformPaymentPrompt } from '@/components/billing/inspection-platform-payment-prompt';
import { InspectorConfirmCountdown } from '@/components/inspections/inspector-confirm-countdown';
import { InspectionViewPaymentButton } from '@/components/billing/inspection-view-payment-button';
import { isFieldInspectionPlatformPaymentActive } from '@/lib/billing/inspection-platform-payment';
import {
  INSPECTION_AWAITING_PAYMENT_BADGE_CLASS,
  INSPECTION_AWAITING_PAYMENT_LABEL,
  isAwaitingAgentPayment,
} from '@/lib/inspections/awaiting-payment';
import type { InspectionDetail, InspectionRecord, OnSiteProgression } from '@/lib/inspections-types';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type IngoingSnapshot = {
  record: InspectionRecord | null;
  progression: OnSiteProgression | null;
  detail: InspectionDetail | null;
  signName: string | null;
  signUrl: string | null;
  reportUrl: string | null;
  leasingTenantApproved: boolean;
  tenantName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  moveInDate: string | null;
};

function formatCustodyTime(iso: string): string {
  return formatDateTime(iso);
}

function ProofPhotoGrid({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary/40 block size-14 shrink-0 overflow-hidden rounded-md border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

function gateStatusTone(status: ReturnType<typeof deriveAgentIngoingGateStatus>): string {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'scheduled') return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
  if (status === 'awaiting_approval') return 'bg-amber-500/10 text-amber-800 dark:text-amber-200';
  return 'bg-amber-500/10 text-amber-800 dark:text-amber-200';
}

export function IngoingInspectionAgentDetail({
  inspection,
  apiConnected,
  onCancelled,
}: {
  inspection: Inspection;
  apiConnected: boolean;
  onCancelled?: () => void;
}) {
  const { leasingCycles, refresh, registerInspection } = useAgentData();
  const propertyLeasingCycle = leasingCycles.find(
    (cycle) => cycle.propertyId === inspection.propertyId,
  );

  const [snapshot, setSnapshot] = useState<IngoingSnapshot>({
    record: null,
    progression: null,
    detail: null,
    signName: null,
    signUrl: null,
    reportUrl: null,
    leasingTenantApproved: false,
    tenantName: null,
    tenantEmail: null,
    tenantPhone: null,
    moveInDate: null,
  });
  const [loading, setLoading] = useState(apiConnected);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [viewingGateStep, setViewingGateStep] = useState<AgentIngoingGateStatus | null>(null);

  const refreshSnapshot = useCallback(async () => {
    if (!apiConnected) {
      setLoading(false);
      return;
    }
    try {
      const [record, progression, detail] = await Promise.all([
        inspectionsApi.get(inspection.id).catch(() => null),
        inspectionsApi.getOnSiteProgression(inspection.id).catch(() => null),
        inspectionsApi.getDetail(inspection.id).catch(() => null),
      ]);

      const signName: string | null = detail?.signName ?? null;
      const signUrl: string | null = detail?.signUrl ?? null;

      let leasingTenantApproved = false;
      let tenantName: string | null = record?.tenantName?.trim() || null;
      let tenantEmail: string | null = record?.tenantEmail?.trim() || null;
      let tenantPhone: string | null = record?.tenantPhone?.trim() || null;
      let moveInDate: string | null = record?.moveInDate ?? null;

      const candidateCycleIds = [
        ...new Set(
          leasingCycles
            .filter((cycle) => cycle.propertyId === inspection.propertyId)
            .map((cycle) => cycle.id),
        ),
      ];
      if (propertyLeasingCycle?.id && !candidateCycleIds.includes(propertyLeasingCycle.id)) {
        candidateCycleIds.unshift(propertyLeasingCycle.id);
      }

      for (const cycleId of candidateCycleIds) {
        const cycleView = await leasingOpsApi.get(cycleId).catch(() => null);
        if (!cycleView) continue;
        const ingoingInspectionId =
          cycleView.onboarding?.ingoingInspection?.inspectionId ?? null;
        const linkedToThisJob = ingoingInspectionId === inspection.id;
        if (linkedToThisJob) {
          leasingTenantApproved =
            cycleView.onboarding?.ingoingReportApproval?.tenantApproved ?? false;
        }
        if (!linkedToThisJob && ingoingInspectionId && candidateCycleIds.length > 1) {
          continue;
        }
        moveInDate =
          moveInDate ??
          cycleView.rental?.moveInDate ??
          cycleView.rental?.availableFrom ??
          null;
        const approved = cycleView.applications.find(
          (a) => a.agentDecision === LEASING_AGENT_DECISION.APPROVED,
        );
        if (approved) {
          tenantName = tenantName || approved.applicantName?.trim() || null;
          tenantEmail = tenantEmail || approved.applicantEmail?.trim() || null;
          tenantPhone = tenantPhone || approved.applicantPhone?.trim() || null;
        }
        if (linkedToThisJob) break;
      }

      let mergedRecord: InspectionRecord | null = null;
      setSnapshot((prev) => {
        mergedRecord = mergeInspectionRecord(prev.record, record);
        const mergedProgression = mergeOnSiteProgression(prev.progression, progression);
        const mergedDetail = mergeInspectionDetail(prev.detail, detail);
        return {
          record: mergedRecord,
          progression: mergedProgression,
          detail: mergedDetail,
          signName: signName ?? prev.signName,
          signUrl: signUrl ?? prev.signUrl,
          reportUrl: mergeReportUrl(
            detail?.reportUrl,
            progression?.reportUrl,
            record?.reportUrl,
            inspection.reportUrl,
            prev.reportUrl,
          ),
          leasingTenantApproved: leasingTenantApproved || prev.leasingTenantApproved,
          tenantName: tenantName ?? prev.tenantName,
          tenantEmail: tenantEmail ?? prev.tenantEmail,
          tenantPhone: tenantPhone ?? prev.tenantPhone,
          moveInDate: moveInDate ?? prev.moveInDate,
        };
      });
      if (mergedRecord) registerInspection(mapInspectionRecordToView(mergedRecord));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inspection');
    } finally {
      setLoading(false);
    }
  }, [
    apiConnected,
    inspection.id,
    inspection.propertyId,
    leasingCycles,
    propertyLeasingCycle?.id,
    registerInspection,
  ]);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  useLivePoll(refreshSnapshot, apiConnected, { immediate: false });

  const { record, progression, detail, signName, signUrl, reportUrl, leasingTenantApproved } =
    snapshot;

  const custody = progression?.keyCustody;
  const collectPhotos = custody?.collectPhotos ?? [];
  const returnPhotos = custody?.returnPhotos ?? [];
  const keyCollected = custody?.collectComplete ?? collectPhotos.length > 0;
  const keyReturned = custody?.returnComplete ?? returnPhotos.length > 0;
  const reportSubmitted = isReportSubmitted(record, progression);
  const reportReady = isInspectionReportReadyForView(detail, {
    reportUrl,
    completedAt: detail?.completedDate ?? record?.completedDate,
    approvedAt: detail?.approvedAt ?? record?.approvedAt,
  });
  const tenantAck = deriveTenantAckState(record, signName, signUrl, {
    tenantReportSigned: record?.tenantReportSigned,
    leasingTenantApproved,
  });
  const tenantAcked = tenantAck.state === 'confirmed';
  const accepted = inspectorHasAcceptedJob(record, inspection);
  const stepsComplete = keyCollected && reportSubmitted && keyReturned && tenantAcked;

  const gateStatus = deriveAgentIngoingGateStatus({
    inspection,
    record,
    stepsComplete,
    progressionStatus: progression?.inspectionStatus,
  });
  const liveGateIndex = agentIngoingGateIndex(gateStatus);
  const viewingStep = viewingGateStep ?? gateStatus;
  const canCancel = canCancelIngoingInspection(inspection, record, stepsComplete);

  useEffect(() => {
    // Keep the rail on the live gate when progress advances.
    setViewingGateStep((current) => {
      if (current == null) return null;
      return agentIngoingGateIndex(current) > liveGateIndex ? null : current;
    });
  }, [liveGateIndex]);

  const stageEmails = useMemo(
    () => inspectionJobCaseEmails(inspection, record),
    [inspection, record],
  );

  const auditEntries = useMemo(
    () =>
      mergeInspectionCaseAudit({
        record,
        progression,
        leasingTenantApproved,
        tenantName: snapshot.tenantName,
      }),
    [record, progression, leasingTenantApproved, snapshot.tenantName],
  );

  const tenantName = snapshot.tenantName?.trim() || '—';
  const tenantEmail = snapshot.tenantEmail?.trim() || '—';
  const tenantPhone = snapshot.tenantPhone?.trim() || '—';
  const moveInDate = snapshot.moveInDate ? formatDate(snapshot.moveInDate) : '—';
  const dateDisplay = resolveIngoingInspectionDateDisplay({
    scheduledDate: record?.scheduledDate ?? inspection.scheduledAt,
    moveInDate: snapshot.moveInDate,
  });
  const currentInspectorName =
    record?.inspectorName?.trim() ||
    // List mapper may already embed "A → B (Reassigned)" — prefer raw record.
    (inspection.inspector && !/→/.test(inspection.inspector)
      ? inspection.inspector
      : null) ||
    null;
  const previousInspectorName = record?.previousInspectorName ?? null;
  const inspectorLabel =
    formatInspectorReassignmentLabel(
      currentInspectorName ?? inspection.inspector,
      previousInspectorName,
    ) ??
    currentInspectorName ??
    inspection.inspector ??
    'Unassigned';
  const inspectorStatus = formatInspectorFieldStatus({
    workflowPhase: record?.workflowPhase,
    keyCollected,
    reportSubmitted,
    keyReturned,
    tenantAcked,
    accepted,
    awaitingCrossubApproval: gateStatus === 'awaiting_approval',
  });

  const handleCancel = async (reason: string) => {
    await cancelIngoingInspectionJob(inspection, reason);
    registerInspection(markInspectionCancelledLocally(inspection));
    toast.success('Ingoing inspection cancelled');
    await refresh({ force: true });
    onCancelled?.();
  };

  const platformPaymentActive = isFieldInspectionPlatformPaymentActive({
    gateStatus,
    record,
    inspection,
  });
  const awaitingPayment = isAwaitingAgentPayment(record, inspection);

  return (
    <div className="space-y-4">
      {platformPaymentActive ? (
        <InspectionPlatformPaymentPrompt
          inspectionId={snapshot.record?.id ?? inspection.id}
          propertyId={inspection.propertyId}
          inspectionType="INGOING"
          active
        />
      ) : null}

      <InspectorConfirmCountdown
        inspectionId={snapshot.record?.id ?? inspection.id}
        propertyId={inspection.propertyId}
        deadlineAt={
          snapshot.record?.awaitingAgentPayment === true ||
          inspection.awaitingAgentPayment === true
            ? null
            : gateStatus === 'pending'
              ? (snapshot.record?.inspectorConfirmDeadlineAt ?? inspection.inspectorConfirmDeadlineAt)
              : null
        }
        refunded={
          snapshot.record?.unacceptedRefunded === true || inspection.unacceptedRefunded === true
        }
        apiStatus={snapshot.record?.status ?? inspection.apiStatus}
        onClosed={() => {
          void refreshSnapshot();
          void refresh();
        }}
      />

      <section className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <Home className="size-5" />
            </span>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-secondary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {INSPECTION_TYPE_LABEL[inspection.type]}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    awaitingPayment
                      ? INSPECTION_AWAITING_PAYMENT_BADGE_CLASS
                      : gateStatusTone(gateStatus),
                  )}
                >
                  {awaitingPayment
                    ? INSPECTION_AWAITING_PAYMENT_LABEL
                    : AGENT_INGOING_GATE_LABEL[gateStatus]}
                </span>
              </div>
              <h1 className="text-base font-semibold leading-snug">{inspection.propertyAddress}</h1>
              <p className="text-muted-foreground text-xs">Case ref {inspection.trackingNumber}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {inspection.propertyId ? (
                  <Link
                    href={propertyDetail(inspection.propertyId)}
                    className="text-primary inline-flex text-xs font-medium hover:underline"
                  >
                    View property
                  </Link>
                ) : null}
                <InspectionViewPaymentButton
                  inspectionId={snapshot.record?.id ?? inspection.id}
                  propertyId={inspection.propertyId}
                  inspectionType="INGOING"
                  active={gateStatus !== 'pending' || platformPaymentActive}
                />
              </div>
            </div>
          </div>
          {canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive h-8 gap-1.5 text-xs"
              onClick={() => setCancelOpen(true)}
            >
              <Trash2 className="size-3.5" />
              Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <FieldInspectionReportReviewSection
        inspectionId={inspection.id}
        record={record}
        propertyLabel={inspection.propertyAddress}
        inspectionType="ingoing"
        reportUrl={reportUrl}
        approvedAt={record?.approvedAt ?? inspection.approvedAt}
        reportDeclineReason={
          record?.reportDeclineReason ?? inspection.reportDeclineReason
        }
        tenantReportSigned={record?.tenantReportSigned}
        leasingTenantApproved={leasingTenantApproved}
        onUpdated={refreshSnapshot}
      />

      <section className="rounded-2xl border bg-card p-3">
        <p className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wide">
          Ingoing progress
        </p>
        <WorkflowProgressRail
          steps={AGENT_INGOING_GATE_STEPS}
          labels={
            awaitingPayment
              ? {
                  ...AGENT_INGOING_GATE_LABEL,
                  [gateStatus]: INSPECTION_AWAITING_PAYMENT_LABEL,
                }
              : AGENT_INGOING_GATE_LABEL
          }
          currentStep={viewingStep}
          liveStep={gateStatus}
          progressFillIndex={liveGateIndex}
          isStepCompleted={(step) => agentIngoingGateIndex(step) < liveGateIndex}
          isStepEnabled={(step) => agentIngoingGateIndex(step) <= liveGateIndex}
          getStepState={(step) => {
            const index = agentIngoingGateIndex(step);
            const isDone =
              index < liveGateIndex || (gateStatus === 'completed' && step === 'completed');
            const isViewing = step === viewingStep;
            return resolveWorkflowStepState(isDone, isViewing);
          }}
          onStepClick={(step) => setViewingGateStep(step)}
        />
        <p className="text-muted-foreground px-1 pb-1 text-xs leading-relaxed">
          <span className="font-medium text-foreground">
            {awaitingPayment && viewingStep === gateStatus
              ? INSPECTION_AWAITING_PAYMENT_LABEL
              : AGENT_INGOING_GATE_LABEL[viewingStep]}
          </span>
          {' — '}
          {AGENT_INGOING_GATE_HINT[viewingStep]}
        </p>
      </section>

      {loading && apiConnected ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Syncing inspection status…
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {/* Pending content: New tenant + inspector details (kept on later steps for context). */}
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          New tenant
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Name
            </dt>
            <dd className="mt-1 text-sm font-medium">{tenantName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Move-in date
            </dt>
            <dd className="mt-1 text-sm font-medium">{moveInDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Phone
            </dt>
            <dd className="mt-1 text-sm font-medium">{tenantPhone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Email
            </dt>
            <dd className="mt-1 text-sm font-medium break-all">{tenantEmail}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          Inspector details
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Ingoing inspection date
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {dateDisplay.iso ? formatDateTime(dateDisplay.iso) : 'Not scheduled'}
            </dd>
            {dateDisplay.isSuggested ? (
              <p className="text-muted-foreground mt-1 text-[11px]">
                Target: {LEASING_INGOING_SCHEDULE_WINDOW_DAYS} days before move-in (same rule as
                admin portal)
              </p>
            ) : null}
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Inspector name
            </dt>
            <dd className="mt-1">
              <InspectorNameWithHistory
                currentName={currentInspectorName ?? inspectorLabel}
                previousName={previousInspectorName}
                auditEntries={auditEntries}
              />
            </dd>
          </div>
          {gateStatus !== 'pending' ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Inspector status
              </dt>
              <dd className="mt-1 text-sm font-medium">{inspectorStatus}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {!loading && viewingStep === 'pending' && gateStatus === 'pending' ? (
        <section className="rounded-2xl border border-dashed bg-card/60 p-4">
          <p className="text-sm font-medium">Awaiting inspector acceptance</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Once an inspector accepts this job it moves to Scheduled. Handover (collecting keys) and the
            remaining completion steps will appear under Scheduled.
          </p>
        </section>
      ) : null}

      {/* Scheduled / Completed: four post-accept steps */}
      {!loading && viewingStep !== 'pending' && liveGateIndex >= 1 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wide">
            {viewingStep === 'completed'
              ? 'Completion steps'
              : viewingStep === 'awaiting_approval'
                ? 'Pending Approval — completion steps'
                : 'Scheduled — completion steps'}
          </p>
          <StepCard
            icon={KeyRound}
            title="Handover (collecting keys)"
            description="Inspector records handover with tenant or agent in the mobile app."
            status={keyCollected ? LEASING_ITEM_STATUS.DONE : LEASING_ITEM_STATUS.IN_PROGRESS}
          >
            {collectPhotos.length > 0 ? (
              <div className="space-y-2">
                {custody?.collectedAt ? (
                  <StepFact label="Collected" value={formatCustodyTime(custody.collectedAt)} />
                ) : null}
                <HandoverNotesBlock notes={custody?.collectNotes} />
                <ProofPhotoGrid urls={collectPhotos} label="Inspector upload" />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Waiting for the inspector to upload handover proof…
              </p>
            )}
          </StepCard>

          <StepCard
            icon={FileText}
            title="Ingoing report submitted"
            description="Inspector submits the field report; CROSSUB generates the PDF."
            status={
              reportSubmitted
                ? LEASING_ITEM_STATUS.DONE
                : keyCollected
                  ? LEASING_ITEM_STATUS.IN_PROGRESS
                  : LEASING_ITEM_STATUS.NOT_STARTED
            }
          >
            {reportSubmitted ? (
              <div className="space-y-3">
                <BoolStatus
                  done
                  doneLabel={
                    record?.completedDate
                      ? `Submitted ${formatDateTime(record.completedDate)}`
                      : 'Report submitted'
                  }
                  pendingLabel="Report not yet submitted"
                />
                {reportReady ? (
                  <div className="space-y-2">
                    <InspectionReportDownloadActions
                      inspectionId={inspection.id}
                      reportUrl={reportUrl}
                      propertyLabel={inspection.propertyAddress}
                      inspectionType="ingoing"
                      canDownload
                    />
                    {record?.tenantReturnedReportUrl ? (
                      <a
                        href={record.tenantReturnedReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary block text-xs font-medium underline"
                      >
                        Tenant returned copy
                        {record.tenantReturnedSignedName
                          ? ` · signed by ${record.tenantReturnedSignedName}`
                          : ''}
                      </a>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Tenant returned copy will appear here after they upload the signed report.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Waiting for CROSSUB to approve this report. View and download appear
                    here after approval.
                  </p>
                )}
              </div>
            ) : keyCollected ? (
              <BoolStatus
                done={false}
                doneLabel="Report submitted"
                pendingLabel="Waiting for the inspector to submit the field report…"
              />
            ) : (
              <BoolStatus
                done={false}
                doneLabel="Report submitted"
                pendingLabel="Available after handover (collecting keys)"
              />
            )}
          </StepCard>

          <StepCard
            icon={KeyRound}
            title="Handover (returning keys)"
            description="Inspector records handover with tenant or agent after the ingoing report is filed."
            status={
              keyReturned
                ? LEASING_ITEM_STATUS.DONE
                : reportSubmitted
                  ? LEASING_ITEM_STATUS.IN_PROGRESS
                  : LEASING_ITEM_STATUS.NOT_STARTED
            }
          >
            {returnPhotos.length > 0 ? (
              <div className="space-y-2">
                {custody?.returnedAt ? (
                  <StepFact label="Returned" value={formatCustodyTime(custody.returnedAt)} />
                ) : null}
                <HandoverNotesBlock notes={custody?.returnNotes} />
                <ProofPhotoGrid urls={returnPhotos} label="Inspector upload" />
              </div>
            ) : reportSubmitted ? (
              <p className="text-muted-foreground text-xs">
                Waiting for the inspector to upload handover (returning keys) proof…
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Available after the inspection report is submitted.
              </p>
            )}
          </StepCard>

          <StepCard
            icon={ClipboardCheck}
            title="Tenant acknowledgement"
            description="Tenant sign-off on the inspection report."
            status={
              tenantAcked
                ? LEASING_ITEM_STATUS.DONE
                : tenantAck.state === 'pending' || tenantAck.state === 'expired'
                  ? LEASING_ITEM_STATUS.WAITING
                  : keyReturned
                    ? LEASING_ITEM_STATUS.IN_PROGRESS
                    : LEASING_ITEM_STATUS.NOT_STARTED
            }
          >
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <User
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    tenantAcked ? 'text-emerald-600' : 'text-muted-foreground',
                  )}
                />
                <div>
                  <p className="font-medium">{tenantAck.label}</p>
                  {tenantAcked && signUrl ? (
                    <a
                      href={signUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary mt-1 inline-flex items-center gap-1 text-[11px] hover:underline"
                    >
                      <CheckCircle2 className="size-3" />
                      View signature
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </StepCard>
        </div>
      ) : null}

      <JobCaseStageEmailHistory emails={stageEmails} title="Email history" />

      <div className="rounded-xl border bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
          onClick={() => setAuditExpanded((value) => !value)}
          aria-expanded={auditExpanded}
        >
          <span className="text-sm font-medium">Audit</span>
          <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {auditEntries.length} event{auditEntries.length === 1 ? '' : 's'}
            <ChevronDown
              className={cn('size-4 transition-transform', auditExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {auditExpanded ? (
          <ul className="divide-y border-t px-4 py-1">
            {auditEntries.length === 0 ? (
              <li className="text-muted-foreground py-3 text-xs">
                No audit events yet. Acceptance, key proof, report, and tenant
                acknowledgement will appear here.
              </li>
            ) : (
              auditEntries.map((entry) => (
                <li key={entry.id} className="py-2.5 text-xs">
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {entry.actor} · {formatDateTime(entry.at)}
                  </p>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {inspection.propertyId ? (
        <CaseContactActions
          propertyId={inspection.propertyId}
          caseLabel="Ingoing inspection"
        />
      ) : null}

      {!apiConnected ? (
        <p className="text-muted-foreground text-xs">
          Connect to the API to see live key proof and acknowledgement status.
        </p>
      ) : null}

      <WorkflowCaseDeleteDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel ingoing inspection"
        description="The ingoing order is cancelled. To inspect again later, add a new ingoing order from the property workflow. A reason is required."
        confirmLabel="Cancel ingoing inspection"
        onConfirm={handleCancel}
        onSuccess={() => setCancelOpen(false)}
      />
    </div>
  );
}
