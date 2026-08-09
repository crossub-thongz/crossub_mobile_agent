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
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { FieldInspectionReportReviewSection } from '@/components/inspections/field-inspection-report-review-section';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { propertyDetail } from '@/constants/routes';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { TenantOutgoingAttendanceStatus } from '@/lib/end-leasing/types';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import {
  inspectionJobCaseEmails,
} from '@/lib/inspection/agent-workflow-email';
import { mergeInspectionCaseAudit } from '@/lib/inspection-case-audit';
import { inspectionsApi } from '@/lib/inspections-api';
import type {
  InspectionDetail,
  InspectionRecord,
  OnSiteProgression,
} from '@/lib/inspections-types';
import {
  deriveAgentAckState,
  isReportSubmitted,
} from '@/lib/inspections/agent-field-inspection-status';
import { isInspectionReportReadyForView } from '@/lib/inspections/inspection-report-ready';
import {
  AGENT_OUTGOING_GATE_HINT,
  AGENT_OUTGOING_GATE_LABEL,
  AGENT_OUTGOING_GATE_STEPS,
  agentOutgoingGateIndex,
  deriveAgentOutgoingGateStatus,
  formatInspectorFieldStatus,
  inspectorHasAcceptedJob,
  type AgentOutgoingGateStatus,
} from '@/lib/outgoing-inspection-display';
import { terminationApi } from '@/lib/termination-case-api';
import { InspectionPlatformPaymentPrompt } from '@/components/billing/inspection-platform-payment-prompt';
import { isFieldInspectionPlatformPaymentActive } from '@/lib/billing/inspection-platform-payment';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

type OutgoingSnapshot = {
  record: InspectionRecord | null;
  progression: OnSiteProgression | null;
  detail: InspectionDetail | null;
  reportUrl: string | null;
  tenantAttendance: TenantOutgoingAttendanceStatus;
  terminationCaseId: string | null;
  agentAcknowledged: boolean;
  agentAcknowledgedAt: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
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

function gateStatusTone(status: ReturnType<typeof deriveAgentOutgoingGateStatus>): string {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'scheduled') return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
  return 'bg-amber-500/10 text-amber-800 dark:text-amber-200';
}

/** Outgoing inspection job case — Pending → Scheduled → Completed (mirrors ingoing). */
export function OutgoingFieldInspectionDetail({
  inspection,
  apiConnected,
}: {
  inspection: Inspection;
  apiConnected: boolean;
}) {
  const { vacating, properties } = useAgentData();
  const linkedVacating = vacating.find((v) => v.propertyId === inspection.propertyId);
  const property = properties.find((p) => p.id === inspection.propertyId);

  const [snapshot, setSnapshot] = useState<OutgoingSnapshot>({
    record: null,
    progression: null,
    detail: null,
    reportUrl: null,
    tenantAttendance: 'pending',
    terminationCaseId: linkedVacating?.id ?? null,
    agentAcknowledged: false,
    agentAcknowledgedAt: null,
    tenantName: null,
    tenantEmail: null,
    tenantPhone: null,
  });
  const [loading, setLoading] = useState(apiConnected);
  const [error, setError] = useState<string | null>(null);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [viewingGateStep, setViewingGateStep] = useState<AgentOutgoingGateStatus | null>(null);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!apiConnected) {
      setLoading(false);
      return;
    }
    try {
      const [record, progression, detail, terminationCase] = await Promise.all([
        inspectionsApi.get(inspection.id).catch(() => null),
        inspectionsApi.getOnSiteProgression(inspection.id).catch(() => null),
        inspectionsApi.getDetail(inspection.id).catch(() => null),
        linkedVacating?.id
          ? terminationApi.get(linkedVacating.id).catch(() => null)
          : Promise.resolve(null),
      ]);

      const reportUrl =
        detail?.reportUrl ??
        progression?.reportUrl ??
        record?.reportUrl ??
        inspection.reportUrl ??
        null;

      const terminationCaseId =
        terminationCase?.inspection.inspectionId === inspection.id
          ? terminationCase.id
          : (terminationCase?.id ?? linkedVacating?.id ?? null);

      // Inspection tenantSnapshot is often empty for outgoing jobs spawned from
      // end-leasing — fall back to the termination case / property profile.
      const propertyTenantName =
        property?.tenantName && property.tenantName !== '—'
          ? property.tenantName.trim()
          : '';
      const caseTenantName =
        terminationCase?.tenant?.name && terminationCase.tenant.name !== '—'
          ? terminationCase.tenant.name.trim()
          : '';
      const tenantName =
        record?.tenantName?.trim() ||
        caseTenantName ||
        propertyTenantName ||
        null;
      const tenantEmail =
        record?.tenantEmail?.trim() ||
        terminationCase?.tenant?.email?.trim() ||
        property?.tenantContact?.email?.trim() ||
        null;
      const tenantPhone =
        record?.tenantPhone?.trim() ||
        terminationCase?.tenant?.phone?.trim() ||
        property?.tenantContact?.phone?.trim() ||
        null;

      setSnapshot({
        record,
        progression,
        detail,
        reportUrl,
        tenantAttendance: terminationCase?.inspection.tenantAttendance ?? 'pending',
        terminationCaseId,
        agentAcknowledged: terminationCase?.reportComparison.agentAcknowledged ?? false,
        agentAcknowledgedAt: terminationCase?.reportComparison.agentAcknowledgedAt ?? null,
        tenantName,
        tenantEmail,
        tenantPhone,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inspection');
    } finally {
      setLoading(false);
    }
  }, [
    apiConnected,
    inspection.id,
    inspection.reportUrl,
    linkedVacating?.id,
    property?.tenantName,
    property?.tenantContact?.email,
    property?.tenantContact?.phone,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLivePoll(refresh, apiConnected);

  const {
    record,
    progression,
    detail,
    reportUrl,
    tenantAttendance,
    terminationCaseId,
    agentAcknowledged,
    agentAcknowledgedAt,
  } = snapshot;

  const custody = progression?.keyCustody;
  const collectPhotos = custody?.collectPhotos ?? [];
  const returnPhotos = custody?.returnPhotos ?? [];
  const keyCollected = custody?.collectComplete ?? collectPhotos.length > 0;
  const keyReturned = custody?.returnComplete ?? returnPhotos.length > 0;
  const reportSubmitted = isReportSubmitted(record, progression);
  const reportReady =
    reportSubmitted && isInspectionReportReadyForView(detail, { reportUrl });
  const agentAck = deriveAgentAckState(record, {
    agentAcknowledged,
    agentAcknowledgedAt,
  });
  const agentAcked = agentAck.state === 'confirmed';
  const accepted = inspectorHasAcceptedJob(record, inspection);
  const stepsComplete = keyCollected && reportSubmitted && keyReturned && agentAcked;

  const gateStatus = deriveAgentOutgoingGateStatus({
    inspection,
    record,
    stepsComplete,
  });
  const liveGateIndex = agentOutgoingGateIndex(gateStatus);
  const viewingStep = viewingGateStep ?? gateStatus;

  useEffect(() => {
    setViewingGateStep((current) => {
      if (current == null) return null;
      return agentOutgoingGateIndex(current) > liveGateIndex ? null : current;
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
        leasingTenantApproved: false,
        tenantName: snapshot.tenantName,
        ackParty: 'agent',
        agentAcknowledged,
        agentAcknowledgedAt,
      }),
    [record, progression, snapshot.tenantName, agentAcknowledged, agentAcknowledgedAt],
  );

  const tenantName = snapshot.tenantName?.trim() || '—';
  const tenantEmail = snapshot.tenantEmail?.trim() || '—';
  const tenantPhone = snapshot.tenantPhone?.trim() || '—';
  const inspectionDate =
    record?.scheduledDate ?? inspection.scheduledAt ?? record?.inspectionDate ?? null;
  const inspectorLabel = record?.inspectorName ?? inspection.inspector ?? 'Unassigned';
  const inspectorStatus = formatInspectorFieldStatus({
    workflowPhase: record?.workflowPhase,
    keyCollected,
    reportSubmitted,
    keyReturned,
    tenantAcked: agentAcked,
    ackParty: 'agent',
    accepted,
  });

  const confirmAgentAcknowledgement = async () => {
    if (!terminationCaseId || agentAcked) return;
    setAckBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(terminationCaseId, {
        agentAcknowledged: true,
      });
      setSnapshot((prev) => ({
        ...prev,
        agentAcknowledged: updated.reportComparison.agentAcknowledged,
        agentAcknowledgedAt: updated.reportComparison.agentAcknowledgedAt ?? null,
      }));
      toast.success('Outgoing report acknowledged');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record acknowledgement');
    } finally {
      setAckBusy(false);
    }
  };

  const setAttendance = async (attendance: 'yes' | 'no') => {
    if (attendance === tenantAttendance) return;
    if (!terminationCaseId) {
      toast.error('No end-leasing case is linked to this property');
      return;
    }
    setAttendanceBusy(true);
    try {
      const updated = await terminationApi.setTenantOutgoingAttendance(
        terminationCaseId,
        attendance,
      );
      const next = updated.inspection.tenantAttendance;
      setSnapshot((current) => ({
        ...current,
        tenantAttendance: next === 'yes' || next === 'no' ? next : 'pending',
      }));
      toast.success(`Tenant attendance set to ${attendance === 'yes' ? 'Yes' : 'No'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update tenant attendance');
    } finally {
      setAttendanceBusy(false);
    }
  };

  const platformPaymentActive = isFieldInspectionPlatformPaymentActive({
    gateStatus,
    record,
    inspection,
  });

  return (
    <div className="space-y-4">
      {platformPaymentActive ? (
        <InspectionPlatformPaymentPrompt inspectionId={inspection.id} active />
      ) : null}

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
                    gateStatusTone(gateStatus),
                  )}
                >
                  {AGENT_OUTGOING_GATE_LABEL[gateStatus]}
                </span>
              </div>
              <h1 className="text-base font-semibold leading-snug">{inspection.propertyAddress}</h1>
              <p className="text-muted-foreground text-xs">Case ref {inspection.trackingNumber}</p>
              {inspection.propertyId ? (
                <Link
                  href={propertyDetail(inspection.propertyId)}
                  className="text-primary inline-flex text-xs font-medium hover:underline"
                >
                  View property
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <FieldInspectionReportReviewSection
        inspectionId={inspection.id}
        record={record}
        propertyLabel={inspection.propertyAddress}
        inspectionType="outgoing"
        reportUrl={reportUrl}
        agentAcknowledged={agentAcknowledged}
        onUpdated={refresh}
      />

      <section className="rounded-2xl border bg-card p-3">
        <p className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wide">
          Outgoing progress
        </p>
        <WorkflowProgressRail
          steps={AGENT_OUTGOING_GATE_STEPS}
          labels={AGENT_OUTGOING_GATE_LABEL}
          currentStep={viewingStep}
          liveStep={gateStatus}
          progressFillIndex={liveGateIndex}
          isStepCompleted={(step) => agentOutgoingGateIndex(step) < liveGateIndex}
          isStepEnabled={(step) => agentOutgoingGateIndex(step) <= liveGateIndex}
          getStepState={(step) => {
            const index = agentOutgoingGateIndex(step);
            const isDone =
              index < liveGateIndex || (gateStatus === 'completed' && step === 'completed');
            const isViewing = step === viewingStep;
            return resolveWorkflowStepState(isDone, isViewing);
          }}
          onStepClick={(step) => setViewingGateStep(step)}
        />
        <p className="text-muted-foreground px-1 pb-1 text-xs leading-relaxed">
          <span className="font-medium text-foreground">
            {AGENT_OUTGOING_GATE_LABEL[viewingStep]}
          </span>
          {' — '}
          {AGENT_OUTGOING_GATE_HINT[viewingStep]}
        </p>
      </section>

      {loading && apiConnected ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Syncing inspection status…
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <section className="rounded-2xl border bg-card p-4">
        <p className="text-muted-foreground mb-3 text-[10px] font-semibold uppercase tracking-wide">
          Vacating tenant
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
              Phone
            </dt>
            <dd className="mt-1 text-sm font-medium">{tenantPhone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Email
            </dt>
            <dd className="mt-1 text-sm font-medium break-all">{tenantEmail}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Tenant attend
            </dt>
            <dd className="mt-2">
              {terminationCaseId && gateStatus !== 'completed' ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={tenantAttendance === 'yes' ? 'default' : 'outline'}
                    disabled={attendanceBusy}
                    onClick={() => void setAttendance('yes')}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tenantAttendance === 'no' ? 'default' : 'outline'}
                    disabled={attendanceBusy}
                    onClick={() => void setAttendance('no')}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {tenantAttendance === 'yes'
                    ? 'Yes'
                    : tenantAttendance === 'no'
                      ? 'No'
                      : '—'}
                </p>
              )}
            </dd>
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
              Outgoing inspection date
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {inspectionDate ? formatDateTime(inspectionDate) : 'Not scheduled'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Inspector name
            </dt>
            <dd className="mt-1 text-sm font-medium">{inspectorLabel}</dd>
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
            Once an inspector accepts this job it moves to Scheduled. Key collection proof and the
            remaining completion steps will appear under Scheduled.
          </p>
        </section>
      ) : null}

      {!loading && viewingStep !== 'pending' && liveGateIndex >= 1 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground px-1 text-[10px] font-semibold uppercase tracking-wide">
            {viewingStep === 'completed' ? 'Completion steps' : 'Scheduled — completion steps'}
          </p>
          <StepCard
            icon={KeyRound}
            title="Key collection proof"
            description="Photo proof uploaded by the inspector in the mobile app."
            status={keyCollected ? LEASING_ITEM_STATUS.DONE : LEASING_ITEM_STATUS.IN_PROGRESS}
          >
            {collectPhotos.length > 0 ? (
              <div className="space-y-2">
                {custody?.collectedAt ? (
                  <StepFact label="Collected" value={formatCustodyTime(custody.collectedAt)} />
                ) : null}
                {custody?.collectNotes ? (
                  <p className="text-muted-foreground text-xs">{custody.collectNotes}</p>
                ) : null}
                <ProofPhotoGrid urls={collectPhotos} label="Inspector upload" />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Waiting for the inspector to upload key collection proof…
              </p>
            )}
          </StepCard>

          <StepCard
            icon={FileText}
            title="Outgoing report submitted"
            description="Inspector submits the field report; CROSSUB generates the comparative PDF."
            status={
              reportSubmitted
                ? LEASING_ITEM_STATUS.DONE
                : keyCollected
                  ? LEASING_ITEM_STATUS.IN_PROGRESS
                  : LEASING_ITEM_STATUS.NOT_STARTED
            }
          >
            {reportReady ? (
              <div className="space-y-2">
                <BoolStatus
                  done
                  doneLabel={
                    record?.completedDate
                      ? `Submitted ${formatDateTime(record.completedDate)}`
                      : 'Report submitted'
                  }
                  pendingLabel="Report not yet submitted"
                />
                <InspectionReportDownloadActions
                  inspectionId={inspection.id}
                  reportUrl={reportUrl}
                  propertyLabel={inspection.propertyAddress}
                  inspectionType="outgoing"
                  canDownload
                />
              </div>
            ) : (
              <BoolStatus
                done={false}
                doneLabel="Report submitted"
                pendingLabel={
                  keyCollected
                    ? 'Waiting for the inspector to submit the field report…'
                    : 'Available after key collection proof'
                }
              />
            )}
          </StepCard>

          <StepCard
            icon={KeyRound}
            title="Key return proof"
            description="Keys returned to agency after the outgoing inspection."
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
                {custody?.returnNotes ? (
                  <p className="text-muted-foreground text-xs">{custody.returnNotes}</p>
                ) : null}
                <ProofPhotoGrid urls={returnPhotos} label="Inspector upload" />
              </div>
            ) : reportSubmitted ? (
              <p className="text-muted-foreground text-xs">
                Waiting for the inspector to upload key return proof…
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Available after the inspection report is submitted.
              </p>
            )}
          </StepCard>

          <StepCard
            icon={ClipboardCheck}
            title="Agent acknowledgement"
            description="Agent sign-off on the outgoing comparative inspection report."
            status={
              agentAcked
                ? LEASING_ITEM_STATUS.DONE
                : agentAck.state === 'pending'
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
                    agentAcked ? 'text-emerald-600' : 'text-muted-foreground',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{agentAck.label}</p>
                  {agentAcked && agentAcknowledgedAt ? (
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Confirmed {formatDateTime(agentAcknowledgedAt)}
                    </p>
                  ) : null}
                </div>
              </div>
              {!agentAcked && reportSubmitted && terminationCaseId ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={ackBusy}
                  onClick={() => void confirmAgentAcknowledgement()}
                >
                  {ackBusy ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Confirming…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      Confirm report
                    </>
                  )}
                </Button>
              ) : null}
              {!agentAcked && reportSubmitted && !terminationCaseId ? (
                <p className="text-muted-foreground text-[11px]">
                  Link an end-leasing case to record agent acknowledgement.
                </p>
              ) : null}
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
                No audit events yet. Acceptance, key proof, report, and agent acknowledgement will
                appear here.
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

      {!apiConnected ? (
        <p className="text-muted-foreground text-xs">
          Connect to the API to see live key proof and acknowledgement status.
        </p>
      ) : null}
    </div>
  );
}
