'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  KeyRound,
  Loader2,
  User,
} from 'lucide-react';

import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { OutgoingInspectionCaseSection } from '@/components/inspections/outgoing-inspection-case-section';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import type { TenantOutgoingAttendanceStatus } from '@/lib/end-leasing/types';
import { inspectionEmailRecordsForStep } from '@/lib/inspection/agent-workflow-email';
import {
  canViewInspectionReport,
  deriveTenantAckState,
  isReportSubmitted,
} from '@/lib/inspections/agent-field-inspection-status';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionRecord, OnSiteProgression } from '@/lib/inspections-types';
import { terminationApi } from '@/lib/termination-case-api';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

type OutgoingSnapshot = {
  record: InspectionRecord | null;
  progression: OnSiteProgression | null;
  signName: string | null;
  signUrl: string | null;
  reportUrl: string | null;
  hasFindings: boolean;
  tenantAttendance: TenantOutgoingAttendanceStatus;
  terminationCaseId: string | null;
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

function isOutgoingJobCompleted(
  inspection: Inspection,
  record: InspectionRecord | null,
  reportSubmitted: boolean,
): boolean {
  if (reportSubmitted || record?.completedDate) return true;
  const status = (record?.status ?? inspection.apiStatus ?? '').toUpperCase();
  return ['COMPLETED', 'PUBLISHED', 'FIRST_REVIEW', 'SECOND_REVIEW'].includes(status);
}

/** Outgoing inspection job case — manager layout + field workflow status. */
export function OutgoingFieldInspectionDetail({
  inspection,
  apiConnected,
}: {
  inspection: Inspection;
  apiConnected: boolean;
}) {
  const { vacating } = useAgentData();
  const linkedVacating = vacating.find((v) => v.propertyId === inspection.propertyId);

  const [snapshot, setSnapshot] = useState<OutgoingSnapshot>({
    record: null,
    progression: null,
    signName: null,
    signUrl: null,
    reportUrl: null,
    hasFindings: false,
    tenantAttendance: 'pending',
    terminationCaseId: linkedVacating?.id ?? null,
  });
  const [loading, setLoading] = useState(apiConnected);
  const [error, setError] = useState<string | null>(null);

  const stageEmails = useMemo(() => inspectionEmailRecordsForStep(inspection), [inspection]);
  const emailTitle =
    inspection.apiStatus === 'PUBLISHED' || inspection.reportStatus === 'sent'
      ? 'All e-mail'
      : 'Email history';

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

      const signName = detail?.signName ?? null;
      const signUrl = detail?.signUrl ?? null;
      const reportUrl =
        detail?.reportUrl ??
        progression?.reportUrl ??
        record?.reportUrl ??
        inspection.reportUrl ??
        null;
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

      const terminationCaseId =
        terminationCase?.inspection.inspectionId === inspection.id
          ? terminationCase.id
          : terminationCase?.id ?? linkedVacating?.id ?? null;

      setSnapshot({
        record,
        progression,
        signName,
        signUrl,
        reportUrl,
        hasFindings,
        tenantAttendance: terminationCase?.inspection.tenantAttendance ?? 'pending',
        terminationCaseId,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inspection');
    } finally {
      setLoading(false);
    }
  }, [apiConnected, inspection.id, inspection.reportUrl, linkedVacating?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLivePoll(refresh, apiConnected);

  const {
    record,
    progression,
    signName,
    signUrl,
    reportUrl,
    hasFindings,
    tenantAttendance,
    terminationCaseId,
  } = snapshot;

  const custody = progression?.keyCustody;
  const collectPhotos = custody?.collectPhotos ?? [];
  const returnPhotos = custody?.returnPhotos ?? [];
  const keyCollected = custody?.collectComplete ?? collectPhotos.length > 0;
  const keyReturned = custody?.returnComplete ?? returnPhotos.length > 0;
  const reportSubmitted = isReportSubmitted(record, progression);
  const reportReady = canViewInspectionReport(record, progression, { reportUrl, hasFindings });
  const statusCompleted = isOutgoingJobCompleted(inspection, record, reportSubmitted);
  const tenantAck = deriveTenantAckState(record, signName, signUrl, {
    tenantReportSigned: record?.tenantReportSigned,
    leasingTenantApproved: false,
  });

  const inspectionDate =
    inspection.scheduledAt ?? record?.scheduledDate ?? record?.inspectionDate ?? null;
  const inspectorName = record?.inspectorName ?? inspection.inspector ?? 'Unassigned';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-base font-semibold leading-snug">{inspection.propertyAddress}</p>
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

      <OutgoingInspectionCaseSection
        inspectionDate={inspectionDate}
        inspectorName={inspectorName}
        tenantAttendance={tenantAttendance}
        statusCompleted={statusCompleted}
        terminationCaseId={terminationCaseId}
        onAttendanceChange={(attendance) =>
          setSnapshot((current) => ({ ...current, tenantAttendance: attendance }))
        }
        emails={stageEmails}
        emailTitle={emailTitle}
      />

      {!apiConnected ? (
        <p className="text-muted-foreground text-xs">
          Connect to the API to see live key proof and acknowledgement status.
        </p>
      ) : null}

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Syncing inspection status…
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {!loading ? (
        <div className="space-y-3 border-t pt-4">
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
            {reportReady ? (
              <div className="mt-3">
                <InspectionReportDownloadActions
                  inspectionId={inspection.id}
                  reportUrl={reportUrl}
                  propertyLabel={inspection.propertyAddress}
                  inspectionType="outgoing"
                  canDownload
                />
              </div>
            ) : null}
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
              {record?.tenantName ? (
                <StepFact label="Tenant" value={record.tenantName} className="col-span-2" />
              ) : null}
            </div>
          </StepCard>
        </div>
      ) : null}

      {inspection.propertyId ? (
        <CaseContactActions
          propertyId={inspection.propertyId}
          caseLabel="Outgoing inspection"
        />
      ) : null}
    </div>
  );
}
