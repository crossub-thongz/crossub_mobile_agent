'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { ConductedByStep } from '@/components/agent/inspection-self-managed/conducted-by-step';
import {
  OwnerCopyStep,
  ReportReviewStep,
  SignedOffStep,
} from '@/components/agent/inspection-self-managed/report-review-step';
import { StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { SELF_MANAGED_INSPECTION_COPY as COPY } from '@/constants/self-managed-inspections';
import { useSelfManagedInspection } from '@/hooks/use-self-managed-inspection';
import { selfManagedInspectionSteps } from '@/lib/inspections/self-managed-inspection-steps';
import { propertyIdFromInspection } from '@/utils/email-download-link';

/**
 * Self-Manage inspection actions on one agency-conducted job (Phase 1): who attends, review and
 * sign-off of the report (the tenant copy), and Send to owner. Shows nothing on a CROSSUB-conducted
 * job or off Self-Manage — the server refuses these actions there.
 */
export function SelfManagedInspectionPanel({
  inspectionId,
  onChanged,
}: {
  inspectionId: string;
  onChanged?: () => void;
}) {
  const { inspections } = useAgentData();
  const { detail, error, busy, reload, run } = useSelfManagedInspection(inspectionId, onChanged);
  const [linkEmailed, setLinkEmailed] = useState({ tenant: false, owner: false });
  const listedPropertyId = inspections.find(
    (row) => row.id === inspectionId || row.inspectionRecordId === inspectionId,
  )?.propertyId;

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-destructive text-xs">{error || COPY.loadFailed}</p>
        <Button size="sm" variant="outline" onClick={reload}>
          {COPY.retry}
        </Button>
      </div>
    );
  }
  if (!detail) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        {COPY.loading}
      </p>
    );
  }

  const steps = selfManagedInspectionSteps(detail);
  const propertyId = propertyIdFromInspection(detail, listedPropertyId);
  if (!steps.agencyJob) return null;

  return (
    <div className="space-y-3">
      <ConductedByStep detail={detail} canReassign={steps.reassign} busy={busy} run={run} />

      {steps.declineReason ? (
        <StepCard title={COPY.declinedTitle} tone="attention">
          <p className="text-xs">{COPY.declinedReason(steps.declineReason)}</p>
        </StepCard>
      ) : null}

      {steps.awaitingReport && !steps.declineReason ? (
        <StepCard title={COPY.awaitingReportTitle}>
          <p className="text-muted-foreground text-xs">
            {detail.conductedByName
              ? COPY.awaitingReportHint(detail.conductedByName)
              : COPY.awaitingReportNoName}
          </p>
        </StepCard>
      ) : null}

      {steps.signOff || steps.awaitingPrincipal ? (
        <ReportReviewStep
          detail={detail}
          steps={steps}
          busy={busy}
          run={run}
          propertyId={propertyId}
          onLinkEmailed={() => setLinkEmailed((current) => ({ ...current, tenant: true }))}
        />
      ) : null}

      <SignedOffStep
        detail={detail}
        steps={steps}
        propertyId={propertyId}
        linkEmailed={linkEmailed.tenant}
        onLinkEmailed={() => setLinkEmailed((current) => ({ ...current, tenant: true }))}
      />

      <OwnerCopyStep
        detail={detail}
        steps={steps}
        busy={busy}
        run={run}
        propertyId={propertyId}
        linkEmailed={linkEmailed.owner}
        onLinkEmailed={() => setLinkEmailed((current) => ({ ...current, owner: true }))}
      />
    </div>
  );
}
