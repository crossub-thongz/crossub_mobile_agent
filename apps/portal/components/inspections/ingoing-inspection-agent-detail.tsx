'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
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
import { WorkflowCaseDeleteDialog } from '@/components/agent/workflow-case-delete-dialog';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { LEASING_AGENT_DECISION, LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import { inspectionEmailRecordsForStep } from '@/lib/inspection/agent-workflow-email';
import { inspectionsApi } from '@/lib/inspections-api';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import {
  canViewInspectionReport,
  deriveTenantAckState,
  isReportSubmitted,
} from '@/lib/inspections/agent-field-inspection-status';
import {
  AGENT_INGOING_GATE_LABEL,
  canCancelIngoingInspection,
  deriveAgentIngoingGateStatus,
} from '@/lib/ingoing-inspection-display';
import { cancelIngoingInspectionJob } from '@/lib/ingoing-inspection-cancel';
import type { InspectionRecord, OnSiteProgression } from '@/lib/inspections-types';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Timeline } from '@/components/agent/timeline';

type IngoingSnapshot = {
  record: InspectionRecord | null;
  progression: OnSiteProgression | null;
  signName: string | null;
  signUrl: string | null;
  reportUrl: string | null;
  hasFindings: boolean;
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
  const { leasingCycles, refresh } = useAgentData();
  const propertyLeasingCycle = leasingCycles.find(
    (cycle) => cycle.propertyId === inspection.propertyId,
  );

  const [snapshot, setSnapshot] = useState<IngoingSnapshot>({
    record: null,
    progression: null,
    signName: null,
    signUrl: null,
    reportUrl: null,
    hasFindings: false,
    leasingTenantApproved: false,
    tenantName: null,
    tenantEmail: null,
    tenantPhone: null,
    moveInDate: null,
  });
  const [loading, setLoading] = useState(apiConnected);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

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
      let reportUrl: string | null =
        detail?.reportUrl ?? progression?.reportUrl ?? record?.reportUrl ?? inspection.reportUrl ?? null;
      let hasFindings = Boolean(
        record && ((record.areaCount ?? 0) > 0 || (record.photoCount ?? 0) > 0),
      );

      if (detail) {
        hasFindings =
          hasFindings ||
          Boolean(
            detail.areas.length > 0 ||
              detail.inspectionPhotos.length > 0 ||
              detail.areaCount > 0 ||
              detail.photoCount > 0,
          );
      }

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
        // Prefer the cycle that owns this ingoing job; otherwise use any approved tenant on the property.
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

      setSnapshot({
        record,
        progression,
        signName,
        signUrl,
        reportUrl,
        hasFindings,
        leasingTenantApproved,
        tenantName,
        tenantEmail,
        tenantPhone,
        moveInDate,
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
    inspection.propertyId,
    inspection.reportUrl,
    leasingCycles,
    propertyLeasingCycle?.id,
  ]);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  useLivePoll(refreshSnapshot, apiConnected);

  const { record, progression, signName, signUrl, reportUrl, hasFindings, leasingTenantApproved } =
    snapshot;
  const gateStatus = deriveAgentIngoingGateStatus({ inspection, record });
  const canCancel = canCancelIngoingInspection(inspection, record);
  const stageEmails = useMemo(() => inspectionEmailRecordsForStep(inspection), [inspection]);

  const custody = progression?.keyCustody;
  const collectPhotos = custody?.collectPhotos ?? [];
  const returnPhotos = custody?.returnPhotos ?? [];
  const keyCollected = custody?.collectComplete ?? collectPhotos.length > 0;
  const keyReturned = custody?.returnComplete ?? returnPhotos.length > 0;
  const reportSubmitted = isReportSubmitted(record, progression);
  const reportReady = canViewInspectionReport(record, progression, { reportUrl, hasFindings });
  const tenantAck = deriveTenantAckState(record, signName, signUrl, {
    tenantReportSigned: record?.tenantReportSigned,
    leasingTenantApproved,
  });

  const tenantName = snapshot.tenantName?.trim() || '—';
  const tenantEmail = snapshot.tenantEmail?.trim() || '—';
  const tenantPhone = snapshot.tenantPhone?.trim() || '—';
  const moveInDate = snapshot.moveInDate ? formatDate(snapshot.moveInDate) : '—';
  const inspectionDate = record?.scheduledDate ?? inspection.scheduledAt;
  const inspectorLabel =
    record?.inspectorName ?? inspection.inspector ?? 'Unassigned';

  const handleCancel = async (reason: string) => {
    await cancelIngoingInspectionJob(inspection, reason);
    toast.success('Ingoing inspection cancelled');
    await refresh();
    onCancelled?.();
  };

  return (
    <div className="space-y-4">
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
                  {AGENT_INGOING_GATE_LABEL[gateStatus]}
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
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Ingoing inspection date
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
        </dl>
      </section>

      {loading && apiConnected ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Syncing inspection status…
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {!loading ? (
        <>
          <section className="rounded-2xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Ingoing report</p>
            {reportReady ? (
              <InspectionReportDownloadActions
                inspectionId={inspection.id}
                reportUrl={reportUrl}
                propertyLabel={inspection.propertyAddress}
                inspectionType="ingoing"
                canDownload
              />
            ) : (
              <p className="text-muted-foreground text-xs">
                Report will be available after the inspector submits the field report.
              </p>
            )}
          </section>

          <div className="space-y-3">
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
              icon={KeyRound}
              title="Key return proof"
              description="Keys returned after the ingoing report is filed."
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
              icon={FileText}
              title="Report submitted"
              description="CROSSUB processes the field report before tenant acknowledgement."
              status={reportSubmitted ? LEASING_ITEM_STATUS.DONE : LEASING_ITEM_STATUS.IN_PROGRESS}
            >
              <BoolStatus
                done={reportSubmitted}
                doneLabel={
                  record?.completedDate
                    ? `Submitted ${formatDateTime(record.completedDate)}`
                    : 'Report submitted'
                }
                pendingLabel="Report not yet submitted"
              />
            </StepCard>

            <StepCard
              icon={ClipboardCheck}
              title="Tenant acknowledgement"
              description="Tenant sign-off on the inspection report."
              status={
                tenantAck.state === 'confirmed'
                  ? LEASING_ITEM_STATUS.DONE
                  : tenantAck.state === 'pending' || tenantAck.state === 'expired'
                    ? LEASING_ITEM_STATUS.WAITING
                    : LEASING_ITEM_STATUS.NOT_STARTED
              }
            >
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <User
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      tenantAck.state === 'confirmed'
                        ? 'text-emerald-600'
                        : 'text-muted-foreground',
                    )}
                  />
                  <div>
                    <p className="font-medium">{tenantAck.label}</p>
                    {tenantAck.state === 'confirmed' && signUrl ? (
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
        </>
      ) : null}

      {inspection.timeline.length > 0 ? (
        <section className="rounded-2xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Audit history</p>
          <Timeline entries={inspection.timeline} />
        </section>
      ) : null}

      <JobCaseStageEmailHistory emails={stageEmails} title="Message history" />

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
