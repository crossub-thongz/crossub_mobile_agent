'use client';

import { useState } from 'react';
import { Bell, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { RentReviewEmailToLandlordDialog } from '@/components/rent-review/rent-review-email-to-landlord-dialog';
import { RentReviewResearchResultSection } from '@/components/rent-review/rent-review-research-result-section';
import { RentResearchPlatformsPanel } from '@/components/rent-review/rent-research-platforms-panel';
import { buildPropertyWorkflowEmailContacts } from '@/lib/job-case-email-recipients';
import {
  canAgentViewResearchResults,
  hasMarketResearchComplete,
  hasResearchRequested,
} from '@/lib/rent-review/agent-workflow-model';
import { rentReviewApi } from '@/lib/rent-review-api';
import { useRentReviewStore } from '@/lib/rent-review/store';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function RentReviewResearchPanel({
  detail,
  onUpdated,
}: {
  detail: RentReviewWorkflowDetail;
  onUpdated?: (detail: RentReviewWorkflowDetail) => void;
}) {
  const { properties } = useAgentData();
  const runMutation = useRentReviewStore((s) => s.runMutation);
  const [landlordDialogOpen, setLandlordDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const property = properties.find((p) => p.id === detail.propertyId);
  const recipientContacts = buildPropertyWorkflowEmailContacts(property, {
    tenantName: detail.tenantName,
  });
  const landlordFromContacts = recipientContacts.find((c) =>
    c.role.toLowerCase().startsWith('landlord'),
  );
  const landlordEmail =
    property?.homeOwnerContact?.email?.trim() || landlordFromContacts?.email;
  const landlordName =
    property?.homeOwnerName && property.homeOwnerName !== '—'
      ? property.homeOwnerName
      : landlordFromContacts?.name;

  const researchRequested = hasResearchRequested(detail);
  const researchComplete = hasMarketResearchComplete(detail);
  const canViewResults = canAgentViewResearchResults(detail);
  const landlordEmailed = detail.auditLog.some((e) => e.kind === 'landlord_research_email');

  const requestResearch = async () => {
    if (!detail.propertyId) {
      toast.error('No property linked to this rent review');
      return;
    }
    setRequesting(true);
    try {
      const updated = await runMutation(
        detail.id,
        rentReviewApi.requestMarketResearch(detail.id, detail.propertyId!, detail.leaseEndDate),
      );
      onUpdated?.(updated);
      toast.success('Admin notified to conduct market research');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!researchRequested && !researchComplete ? (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Request market research</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Notify the admin portal to run NSW Fair Trading, RP Data, and REA.com.au research for
                this property.
              </p>
            </div>
            <Button
              type="button"
              className="gap-2 shrink-0"
              disabled={requesting}
              onClick={() => void requestResearch()}
            >
              {requesting ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
              Notify admin
            </Button>
          </div>
        </section>
      ) : null}

      {researchRequested && !canViewResults ? (
        <section className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {researchComplete ? 'Waiting for research pack' : 'Waiting for market research'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {researchComplete
                  ? 'Admin has completed research. You will see results here once they send the research pack to you.'
                  : 'Admin has been notified. Research results will appear here after admin completes the review and sends them to you.'}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {canViewResults ? (
        <>
          <RentResearchPlatformsPanel platforms={detail.ai.research?.platforms ?? []} readOnly />

          <RentReviewResearchResultSection
            detail={detail}
            researchComplete={researchComplete}
            landlordEmailed={landlordEmailed}
            onEmail={() => setLandlordDialogOpen(true)}
            helperText="Review the research pack, then email the landlord to confirm the recommended rent."
          />
        </>
      ) : null}

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
