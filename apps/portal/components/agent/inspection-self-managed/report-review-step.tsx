'use client';

import { Download, ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AGENCY_INSPECTION_OWNER_COPY_STATUS,
  AGENCY_INSPECTION_TENANT_COPY_STATUS,
  SELF_MANAGED_INSPECTION_COPY as COPY,
  SELF_MANAGED_INSPECTION_LIMITS,
} from '@/constants/self-managed-inspections';
import type { SelfManagedInspectionRun } from '@/hooks/use-self-managed-inspection';
import {
  agencyInspectionReportPdfUrl,
  rejectAgencyInspectionReport,
  signOffAgencyInspection,
  type AgentInspectionDetail,
} from '@/lib/crossub-api/agent-inspection-client';
import type { SelfManagedInspectionSteps } from '@/lib/inspections/self-managed-inspection-steps';
import { formatDateTime } from '@/lib/utils';

/**
 * Open and download the report PDF (reviewable before sign-off on an agency job). Both are
 * plain links: the API answers a filed report with a redirect to storage, which a browser
 * navigation follows but a credentialed fetch cannot, and a report of hundreds of photos is
 * too large to fetch into the page anyway.
 */
function ReportLinks({ detail }: { detail: AgentInspectionDetail }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <a href={agencyInspectionReportPdfUrl(detail.id)} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-3.5" />
          {COPY.viewReport}
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a href={agencyInspectionReportPdfUrl(detail.id, { download: true })}>
          <Download className="size-3.5" />
          {COPY.downloadReport}
        </a>
      </Button>
    </div>
  );
}

/** The principal reads the agency inspector's report, then signs it off or sends it back. */
export function ReportReviewStep({
  detail,
  steps,
  busy,
  run,
}: {
  detail: AgentInspectionDetail;
  steps: SelfManagedInspectionSteps;
  busy: boolean;
  run: SelfManagedInspectionRun;
}) {
  const id = useId();
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const signOff = async () => {
    const ok = await run(() => signOffAgencyInspection(detail.id), COPY.signedOffToast);
    if (ok) setConfirming(false);
  };

  const reject = async () => {
    const ok = await run(
      () => rejectAgencyInspectionReport(detail.id, { reason: reason.trim() }),
      COPY.rejectedToast,
    );
    if (ok) {
      setRejecting(false);
      setReason('');
    }
  };

  if (steps.awaitingPrincipal) {
    return (
      <StepCard title={COPY.awaitingPrincipalTitle} hint={COPY.awaitingPrincipalHint}>
        {steps.review ? <ReportLinks detail={detail} /> : null}
      </StepCard>
    );
  }

  return (
    <StepCard
      title={COPY.reviewTitle}
      hint={steps.tenantCopyApplies ? COPY.reviewHint : COPY.reviewHintRoutine}
      tone="attention"
    >
      {steps.review ? <ReportLinks detail={detail} /> : null}

      {confirming ? (
        <div className="space-y-2 rounded-md border border-dashed p-2.5">
          <p className="text-sm font-medium">{COPY.signOffConfirmTitle}</p>
          <p className="text-muted-foreground text-xs">
            {steps.tenantCopyApplies ? COPY.signOffConfirmTenantOwner : COPY.signOffConfirmOwner}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void signOff()}>
              {COPY.confirmSignOff}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : rejecting ? (
        <div className="space-y-2">
          <div>
            <FieldLabel htmlFor={`${id}-reason`}>{COPY.rejectReason}</FieldLabel>
            <Textarea
              id={`${id}-reason`}
              rows={3}
              maxLength={SELF_MANAGED_INSPECTION_LIMITS.rejectReasonMax}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={() => void reject()}
            >
              {COPY.rejectSubmit}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => setConfirming(true)}>
            {COPY.signOff}
          </Button>
          {steps.reject ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
              {COPY.reject}
            </Button>
          ) : null}
        </div>
      )}
    </StepCard>
  );
}

function ownerCopyLine(ownerCopy: SelfManagedInspectionSteps['ownerCopy']): string | null {
  if (!ownerCopy) return null;
  if (ownerCopy.status === AGENCY_INSPECTION_OWNER_COPY_STATUS.SENT) {
    return ownerCopy.sentAt ? COPY.ownerCopySent(formatDateTime(ownerCopy.sentAt)) : null;
  }
  if (ownerCopy.status === AGENCY_INSPECTION_OWNER_COPY_STATUS.FAILED) return COPY.ownerCopyFailed;
  return COPY.ownerCopySkipped;
}

function tenantCopyLine(steps: SelfManagedInspectionSteps): string {
  if (steps.tenantCopyStatus === AGENCY_INSPECTION_TENANT_COPY_STATUS.FAILED) {
    return COPY.tenantCopyFailed;
  }
  if (steps.tenantCopyStatus === AGENCY_INSPECTION_TENANT_COPY_STATUS.SKIPPED) {
    return COPY.tenantCopySkipped;
  }
  return steps.tenantSentAt
    ? COPY.tenantCopySent(formatDateTime(steps.tenantSentAt))
    : COPY.tenantCopyPending;
}

/** After sign-off: when it was signed, and where the tenant and owner copies stand. */
export function SignedOffStep({
  detail,
  steps,
}: {
  detail: AgentInspectionDetail;
  steps: SelfManagedInspectionSteps;
}) {
  if (!steps.signedOffAt) return null;
  const owner = ownerCopyLine(steps.ownerCopy);
  const ownerFailed = steps.ownerCopy?.status === AGENCY_INSPECTION_OWNER_COPY_STATUS.FAILED;
  const tenantFailed = steps.tenantCopyStatus === AGENCY_INSPECTION_TENANT_COPY_STATUS.FAILED;
  return (
    <StepCard title={COPY.sentTitle}>
      <ul className="space-y-1 text-xs">
        <li>{COPY.signedOffAt(formatDateTime(steps.signedOffAt))}</li>
        {steps.tenantCopyApplies ? (
          <li className={tenantFailed ? 'text-destructive' : 'text-muted-foreground'}>
            {tenantCopyLine(steps)}
          </li>
        ) : null}
        {owner ? (
          <li className={ownerFailed ? 'text-destructive' : 'text-muted-foreground'}>{owner}</li>
        ) : null}
      </ul>
      {detail.reportPdfPath !== null ? <ReportLinks detail={detail} /> : null}
    </StepCard>
  );
}
