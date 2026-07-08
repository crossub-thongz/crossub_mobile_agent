'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  KeyRound,
  Loader2,
  User,
} from 'lucide-react';

import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { CaseContactActions } from '@/components/agent/case-contact-actions';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { StatusBadge } from '@/components/agent/status-badge';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import { LEASING_ITEM_STATUS } from '@/lib/leasing/constants';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import { inspectionsApi } from '@/lib/inspections-api';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import {
  canViewInspectionReport,
  deriveTenantAckState,
  isReportSubmitted,
} from '@/lib/inspections/agent-field-inspection-status';
import type { InspectionRecord, OnSiteProgression } from '@/lib/inspections-types';
import { useLivePoll } from '@/lib/use-live-poll';
import type { Inspection } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

type AgentFieldInspectionSnapshot = {
  record: InspectionRecord | null;
  progression: OnSiteProgression | null;
  signName: string | null;
  signUrl: string | null;
  reportUrl: string | null;
  hasFindings: boolean;
  leasingTenantApproved: boolean;
};

function inspectionReportDownloadType(
  type: Inspection['type'],
): 'ingoing' | 'outgoing' | 'routine' | 'open' {
  if (type === 'INGOING') return 'ingoing';
  if (type === 'OUTGOING') return 'outgoing';
  if (type === 'OPEN') return 'open';
  return 'routine';
}

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

/**
 * Agent read-only ingoing / outgoing inspection view — key collect & return proof,
 * report submitted, and tenant acknowledgement only (matches crossub_web agent scope).
 */
export function AgentFieldInspectionDetail({
  inspection,
  apiConnected,
}: {
  inspection: Inspection;
  apiConnected: boolean;
}) {
  const { leasingCycles } = useAgentData();
  const propertyLeasingCycle = leasingCycles.find(
    (cycle) => cycle.propertyId === inspection.propertyId,
  );

  const [snapshot, setSnapshot] = useState<AgentFieldInspectionSnapshot>({
    record: null,
    progression: null,
    signName: null,
    signUrl: null,
    reportUrl: null,
    hasFindings: false,
    leasingTenantApproved: false,
  });
  const [loading, setLoading] = useState(apiConnected);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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

      let signName: string | null = detail?.signName ?? null;
      let signUrl: string | null = detail?.signUrl ?? null;
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
      if (propertyLeasingCycle?.id) {
        const cycleView = await leasingOpsApi.get(propertyLeasingCycle.id).catch(() => null);
        const ingoingInspectionId =
          cycleView?.onboarding?.ingoingInspection?.inspectionId ?? null;
        if (ingoingInspectionId === inspection.id) {
          leasingTenantApproved =
            cycleView?.onboarding?.ingoingReportApproval?.tenantApproved ?? false;
        }
      }

      setSnapshot({
        record,
        progression,
        signName,
        signUrl,
        reportUrl,
        hasFindings,
        leasingTenantApproved,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inspection');
    } finally {
      setLoading(false);
    }
  }, [apiConnected, inspection.id, inspection.propertyId, inspection.reportUrl, propertyLeasingCycle?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLivePoll(refresh, apiConnected);

  const { record, progression, signName, signUrl, reportUrl, hasFindings, leasingTenantApproved } =
    snapshot;
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

  const TypeIcon = inspection.type === 'OUTGOING' ? KeyRound : Home;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
            <TypeIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-secondary rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {INSPECTION_TYPE_LABEL[inspection.type]}
              </span>
              <StatusBadge label={inspection.status} />
            </div>
            <h1 className="text-base font-semibold leading-snug">{inspection.propertyAddress}</h1>
            <p className="text-muted-foreground text-xs">Case ref {inspection.trackingNumber}</p>
            {inspection.propertyId && (
              <Link
                href={propertyDetail(inspection.propertyId)}
                className="text-primary inline-flex text-xs font-medium hover:underline"
              >
                View property
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-secondary/30 rounded-xl px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Scheduled
            </p>
            <p className="mt-1 font-semibold">
              {inspection.scheduledAt ? formatDateTime(inspection.scheduledAt) : 'Not set'}
            </p>
          </div>
          <div className="bg-secondary/30 rounded-xl px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Inspector
            </p>
            <p className="mt-1 font-semibold">{inspection.inspector ?? 'Unassigned'}</p>
          </div>
        </div>

        {!apiConnected && (
          <p className="text-muted-foreground mt-3 text-xs">
            Connect to the API to see live key proof and acknowledgement status.
          </p>
        )}
      </section>

      {loading && apiConnected ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Syncing inspection status…
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {!loading && (
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
            description={
              inspection.type === 'OUTGOING'
                ? 'Keys returned to agency after the outgoing inspection.'
                : 'Keys returned after the ingoing report is filed.'
            }
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
                  inspectionType={inspectionReportDownloadType(inspection.type)}
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
      )}

      {inspection.propertyId && (
        <CaseContactActions
          propertyId={inspection.propertyId}
          caseLabel={`${inspection.type} inspection`}
        />
      )}
    </div>
  );
}
