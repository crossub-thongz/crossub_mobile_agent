'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { RENT_REVIEW_LANDLORD_PACK_AUDIT_KIND } from '@/constants/rent-review-recommendation';
import { Button } from '@/components/ui/button';
import { RentReviewEmailToLandlordDialog } from '@/components/rent-review/rent-review-email-to-landlord-dialog';
import { RentReviewNoticePayableFromField } from '@/components/rent-review/rent-review-notice-payable-from-field';
import { RentReviewResearchResultSection } from '@/components/rent-review/rent-review-research-result-section';
import { RentResearchPlatformsPanel } from '@/components/rent-review/rent-research-platforms-panel';
import { buildPropertyWorkflowEmailContacts } from '@/lib/job-case-email-recipients';
import {
  canAdjustRentRecommendation,
  canAgentViewResearchResults,
  hasLandlordPackFallenBehindRecommendation,
  hasMarketResearchComplete,
  hasResearchRequested,
} from '@/lib/rent-review/agent-workflow-model';
import {
  buildLandlordResearchEmailDraft,
  resolveLandlordContact,
} from '@/lib/rent-review/research-landlord-email';
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
  const autoSendLandlordAttempted = useRef<string | null>(null);

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
  const landlordEmailed = detail.auditLog.some(
    (e) => e.kind === RENT_REVIEW_LANDLORD_PACK_AUDIT_KIND,
  );
  // The pack has gone but quotes a rate the agent has since changed. This re-opens the send
  // button; it must never re-open the automatic send above, which stays keyed on
  // `landlordEmailed` so an adjustment can't mail the owner by itself.
  const packBehindRecommendation = hasLandlordPackFallenBehindRecommendation(detail);

  useEffect(() => {
    if (!canViewResults || landlordEmailed || autoSendLandlordAttempted.current === detail.id) {
      return;
    }
    if (!detail.propertyId || !landlordEmail?.includes('@')) return;

    autoSendLandlordAttempted.current = detail.id;
    const contact = resolveLandlordContact(landlordName, landlordEmail);
    const draft = buildLandlordResearchEmailDraft(detail, contact.name, contact.email);

    void runMutation(
      detail.id,
      rentReviewApi.sendEmail(
        detail.id,
        {
          toEmail: contact.email,
          toName: contact.name,
          subject: draft.subject,
          body: draft.body,
          kind: 'landlord_research_email',
          channel: 'email',
        },
        detail.propertyId,
        detail.leaseEndDate,
      ),
    )
      .then((updated) => onUpdated?.(updated))
      .catch(() => {
        autoSendLandlordAttempted.current = null;
      });
  }, [
    canViewResults,
    detail,
    landlordEmailed,
    landlordEmail,
    landlordName,
    onUpdated,
    runMutation,
  ]);

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

      {researchComplete && !canViewResults ? (
        <section className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Market research complete</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Admin is reviewing the research pack. Results will appear here once they send it to
                you.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {researchRequested && !researchComplete && !canViewResults ? (
        <section className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Clock className="text-muted-foreground mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Running market research</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                NSW Fair Trading, RP Data, and REA.com.au are being queried. Results will appear
                here when complete.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {canViewResults ? (
        <>
          <RentReviewNoticePayableFromField
            detail={detail}
            onSave={async (payableFrom) => {
              const updated = await runMutation(
                detail.id,
                rentReviewApi.updateNoticePayableFrom(
                  detail.id,
                  payableFrom,
                  detail.propertyId ?? undefined,
                  detail.leaseEndDate,
                ),
              );
              onUpdated?.(updated);
              return updated;
            }}
          />
          <RentResearchPlatformsPanel platforms={detail.ai.research?.platforms ?? []} readOnly />

          <RentReviewResearchResultSection
            detail={detail}
            researchComplete={researchComplete}
            landlordEmailed={landlordEmailed}
            onEmail={() => setLandlordDialogOpen(true)}
            canAdjustRecommendation={canAdjustRentRecommendation(detail)}
            onAdjustRecommendation={async (weekly) => {
              const updated = await runMutation(
                detail.id,
                rentReviewApi.setRecommendedRent(
                  detail.id,
                  { weekly },
                  detail.propertyId ?? undefined,
                  detail.leaseEndDate,
                ),
              );
              onUpdated?.(updated);
              return updated;
            }}
            emailLabel={
              packBehindRecommendation
                ? 'Email updated pack'
                : landlordEmailed
                  ? 'Sent to landlord'
                  : 'Email landlord'
            }
            emailDisabled={landlordEmailed && !packBehindRecommendation}
            helperText={
              packBehindRecommendation
                ? 'The rate has changed since the landlord was emailed — send them the updated pack.'
                : landlordEmailed
                  ? 'The landlord has been emailed the research pack automatically.'
                  : 'The research pack is emailed to the landlord automatically when research is complete.'
            }
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
