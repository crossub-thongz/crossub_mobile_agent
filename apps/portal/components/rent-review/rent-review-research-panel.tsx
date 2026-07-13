'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { RentReviewActivityLog } from '@/components/rent-review/rent-review-activity-log';
import { RentReviewEmailToLandlordDialog } from '@/components/rent-review/rent-review-email-to-landlord-dialog';
import {
  RentResearchPlatformsPanel,
  RentResearchRunningBanner,
} from '@/components/rent-review/rent-research-platforms-panel';
import {
  RENT_RESEARCH_PLATFORMS,
  auditEntriesForStep,
  RENT_REVIEW_AGENT_STEP,
} from '@/lib/rent-review/agent-workflow-model';
import { buildPropertyWorkflowEmailContacts } from '@/lib/job-case-email-recipients';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { formatCurrency } from '@/lib/utils';

function hasResearchComplete(detail: RentReviewWorkflowDetail): boolean {
  return (
    detail.auditLog.some((e) => e.kind === 'ai_report_ready') ||
    detail.workflowState !== 'pending_confirmation' ||
    detail.ai.suggestedWeekly != null
  );
}

export function RentReviewResearchPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const { properties } = useAgentData();
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [busy, setBusy] = useState(false);
  const [researchRunning, setResearchRunning] = useState(false);
  const [researchStartedAt, setResearchStartedAt] = useState<number | null>(null);
  const [researchElapsedSec, setResearchElapsedSec] = useState(0);
  const [landlordDialogOpen, setLandlordDialogOpen] = useState(false);

  useEffect(() => {
    if (!researchRunning || researchStartedAt == null) {
      setResearchElapsedSec(0);
      return;
    }
    const tick = () => setResearchElapsedSec(Math.floor((Date.now() - researchStartedAt) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [researchRunning, researchStartedAt]);

  const property = properties.find((p) => p.id === detail.propertyId);
  const landlordEmail =
    property?.homeOwnerContact?.email?.trim() || undefined;
  const landlordName = property?.homeOwnerName;
  const recipientContacts = buildPropertyWorkflowEmailContacts(property, {
    tenantName: detail.tenantName,
  });

  const auditEntries = auditEntriesForStep(detail, RENT_REVIEW_AGENT_STEP.RENT_RESEARCH);
  const suggested = detail.ai.suggestedWeekly;
  const researchComplete = hasResearchComplete(detail);
  const landlordEmailed = detail.auditLog.some((e) => e.kind === 'landlord_research_email');

  const run = async (action: () => Promise<RentReviewWorkflowDetail>, success: string) => {
    setBusy(true);
    try {
      const updated = await runMutation(detail.id, action());
      onUpdated?.(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const runResearch = async (
    action: () => Promise<RentReviewWorkflowDetail>,
    success: string,
  ) => {
    setBusy(true);
    setResearchRunning(true);
    setResearchStartedAt(Date.now());
    try {
      const updated = await runMutation(detail.id, action());
      onUpdated?.(updated);
      toast.success(success);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setResearchRunning(false);
      setResearchStartedAt(null);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {researchRunning ? <RentResearchRunningBanner elapsedSeconds={researchElapsedSec} /> : null}

      <RentResearchPlatformsPanel
        platforms={detail.ai.research?.platforms ?? []}
        loading={researchRunning}
      />

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Rent research</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Blended summary from {RENT_RESEARCH_PLATFORMS.join(', ')}. Recommended rent reflects
          completed sources; NSW Fair Trading uses public bond data, while RP Data and REA Group Ltd
          need API credentials on the server.
        </p>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Current rent</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(detail.currentWeeklyRent)}/wk</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Recommended rent</dt>
            <dd className="text-primary font-medium tabular-nums">
              {suggested != null ? `${formatCurrency(suggested)}/wk` : 'Pending research'}
              {detail.ai.increasePercent != null ? ` (+${detail.ai.increasePercent}%)` : ''}
            </dd>
          </div>
        </dl>
        {detail.ai.rationale ? (
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{detail.ai.rationale}</p>
        ) : null}
      </section>

      {detail.workflowState === 'pending_confirmation' ? (
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            disabled={busy}
            onClick={() =>
              void runResearch(
                () => rentReviewApi.confirm(detail.id, { type: 'rent_review' }),
                'Rent review confirmed — market research complete',
              )
            }
          >
            {researchRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {researchRunning ? 'Running market research…' : 'Confirm rent review & run market research'}
          </Button>
          <p className="text-muted-foreground text-[11px]">
            Confirms the review pathway and runs research across NSW Fair Trading, RP Data, and REA
            Group Ltd.
          </p>
        </div>
      ) : null}

      {researchComplete ? (
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void runResearch(
                () => rentReviewApi.runAiAnalysis(detail.id),
                'Market research rerun complete',
              )
            }
          >
            {researchRunning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {researchRunning ? 'Running market research…' : 'Rerun market research'}
          </Button>
        </div>
      ) : null}

      {researchComplete && !landlordEmailed ? (
        <div className="space-y-2">
          <Button
            className="w-full gap-2"
            variant="default"
            disabled={busy}
            onClick={() => setLandlordDialogOpen(true)}
          >
            <Mail className="size-4" />
            Email to landlord
          </Button>
          <p className="text-muted-foreground text-[11px]">
            Sends the research report and NSW Fair Trading reference for landlord approval. The
            landlord email is auto-filled from the property record.
          </p>
        </div>
      ) : null}

      <RentReviewActivityLog entries={auditEntries} />

      <RentReviewEmailToLandlordDialog
        open={landlordDialogOpen}
        onOpenChange={setLandlordDialogOpen}
        detail={detail}
        landlordName={landlordName}
        landlordEmail={landlordEmail}
        recipientContacts={recipientContacts}
        onUpdated={onUpdated}
      />
    </div>
  );
}
