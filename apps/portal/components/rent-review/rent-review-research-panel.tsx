'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { RentReviewEmailToLandlordDialog } from '@/components/rent-review/rent-review-email-to-landlord-dialog';
import { RentReviewResearchResultSection } from '@/components/rent-review/rent-review-research-result-section';
import {
  RentResearchPlatformsPanel,
  RentResearchRunningBanner,
} from '@/components/rent-review/rent-research-platforms-panel';
import { buildPropertyWorkflowEmailContacts } from '@/lib/job-case-email-recipients';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

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
  const landlordEmail = property?.homeOwnerContact?.email?.trim() || undefined;
  const landlordName = property?.homeOwnerName;
  const recipientContacts = buildPropertyWorkflowEmailContacts(property, {
    tenantName: detail.tenantName,
  });

  const researchComplete = hasResearchComplete(detail);
  const landlordEmailed = detail.auditLog.some((e) => e.kind === 'landlord_research_email');

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
            Confirms the review pathway and runs research across NSW Fair Trading, RP Data, and
            REA.com.au.
          </p>
        </div>
      ) : null}

      {researchComplete ? (
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
      ) : null}

      <RentReviewResearchResultSection
        detail={detail}
        researchComplete={researchComplete}
        landlordEmailed={landlordEmailed}
        emailBusy={busy}
        onEmail={() => setLandlordDialogOpen(true)}
      />

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
