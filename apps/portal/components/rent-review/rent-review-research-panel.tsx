'use client';

import { useState } from 'react';
import { ArrowRight, Bell, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { RentReviewEmailToLandlordDialog } from '@/components/rent-review/rent-review-email-to-landlord-dialog';
import { RentReviewNoticePayableFromField } from '@/components/rent-review/rent-review-notice-payable-from-field';
import { RentReviewResearchResultSection } from '@/components/rent-review/rent-review-research-result-section';
import { RentResearchPlatformsPanel } from '@/components/rent-review/rent-research-platforms-panel';
import {
  buildPropertyWorkflowEmailContacts,
  landlordWorkflowEmailContacts,
} from '@/lib/job-case-email-recipients';
import {
  canAdjustRentRecommendation,
  canAgentViewResearchResults,
  hasLandlordPackFallenBehindRecommendation,
  hasLandlordResearchPackSent,
  hasLandlordResearchPackSkipped,
  hasMarketResearchComplete,
  hasResearchRequested,
  needsRentReviewPathwayConfirm,
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
  const [confirmingPathway, setConfirmingPathway] = useState(false);
  const [skippingLandlordEmail, setSkippingLandlordEmail] = useState(false);

  const property = properties.find((p) => p.id === detail.propertyId);
  const recipientContacts = buildPropertyWorkflowEmailContacts(property, {
    tenantName: detail.tenantName,
  });
  const [landlordFromContacts] = landlordWorkflowEmailContacts(recipientContacts);
  const landlordEmail =
    property?.homeOwnerContact?.email?.trim() || landlordFromContacts?.email;
  const landlordName =
    property?.homeOwnerName && property.homeOwnerName !== '—'
      ? property.homeOwnerName
      : landlordFromContacts?.name;

  const researchRequested = hasResearchRequested(detail);
  const researchComplete = hasMarketResearchComplete(detail);
  const canViewResults = canAgentViewResearchResults(detail);
  const landlordEmailed = hasLandlordResearchPackSent(detail);
  const landlordSkipped = hasLandlordResearchPackSkipped(detail);
  // The pack has gone but quotes a rate the agent has since changed. This re-opens the send
  // button; it must never re-open the automatic send above, which stays keyed on
  // `landlordEmailed` so an adjustment can't mail the owner by itself.
  const packBehindRecommendation = hasLandlordPackFallenBehindRecommendation(detail);
  const needsPathwayConfirm = needsRentReviewPathwayConfirm(detail);

  /**
   * An effect here used to write to the owner the moment this card could be seen.
   *
   * It never once worked: the API stopped accepting `landlord_research_email` on 15 Jul and
   * the rejection landed in a bare `.catch`, so for a month opening a case produced a silent
   * 400 while the card's own copy told the agent the owner had been written to. Restoring
   * that kind would have brought it to life — and what it does is write to an owner from a
   * draft nobody read, at an address nobody confirmed, triggered by a page render.
   *
   * The owner relationship belongs to the agent, which is the entire reason CROSSUB is
   * allowed to carry this message at all. So the agent presses Send: the dialog below is the
   * only path, and it shows the recipient, the body and the attachments first.
   */


  const skipLandlordEmail = async () => {
    if (!detail.propertyId) {
      toast.error('No property linked to this rent review');
      return;
    }
    setSkippingLandlordEmail(true);
    try {
      let updated = await runMutation(
        detail.id,
        rentReviewApi.sendEmail(
          detail.id,
          {
            kind: 'landlord_research_email',
            skipRecipientEmail: true,
          },
          detail.propertyId,
          detail.leaseEndDate,
        ),
      );
      try {
        updated = await runMutation(
          detail.id,
          rentReviewApi.confirmPathwayIfPending(updated),
        );
      } catch {
        // Skip already stamped the pack step. Continue is offered if confirm failed.
      }
      onUpdated?.(updated);
      toast.success('Proceeded without sending landlord email');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSkippingLandlordEmail(false);
    }
  };

  const confirmPathway = async () => {
    setConfirmingPathway(true);
    try {
      const updated = await runMutation(
        detail.id,
        rentReviewApi.confirmPathwayIfPending(detail),
      );
      onUpdated?.(updated);
      toast.success('Rent-review pathway confirmed — continue to agent decision');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setConfirmingPathway(false);
    }
  };

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
            landlordSkipped={landlordSkipped}
            skipBusy={skippingLandlordEmail}
            onEmail={() => setLandlordDialogOpen(true)}
            onSkip={() => void skipLandlordEmail()}
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
                ? 'The rate has changed since you emailed the landlord — send them the updated pack.'
                : needsPathwayConfirm
                  ? landlordSkipped && !landlordEmailed
                    ? 'You skipped the landlord email. Confirm the rent-review pathway to set the new rent and notify the tenant.'
                    : 'You have sent the landlord the research pack. Confirm the rent-review pathway to set the new rent and notify the tenant.'
                  : landlordEmailed
                    ? 'You have sent the landlord the research pack.'
                    : landlordSkipped
                      ? 'You proceeded without sending the landlord email. You can still send the pack later if needed.'
                      : 'Review the recommended rate, then send the research pack to the landlord — or proceed without sending.'
            }
          />

          {needsPathwayConfirm ? (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Continue to agent decision</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    This review was opened from admin. Sending the research pack does not unlock
                    the next step until the rent-review pathway is confirmed.
                  </p>
                </div>
                <Button
                  type="button"
                  className="gap-2 shrink-0"
                  disabled={confirmingPathway}
                  onClick={() => void confirmPathway()}
                >
                  {confirmingPathway ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  Continue to agent decision
                </Button>
              </div>
            </section>
          ) : null}
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
