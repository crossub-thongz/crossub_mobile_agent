'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { MaintenanceQuotationReviewActions } from '@/components/maintenance/maintenance-quotation-review-actions';
import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';
import {
  auditEntriesForStep,
  getMaintenanceQuotationsForCase,
  MAINTENANCE_AGENT_STEP,
  maintenanceEmailRecordsForStep,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import {
  resolveInvitedContractorIds,
  resolveMaintenanceResponsibility,
} from '@/lib/maintenance/infer-responsibility';
import {
  fetchMaintenanceContractorSuggestions,
  type MaintenanceContractorSuggestion,
} from '@/lib/crossub-api/maintenance-client';
import type { QuotationReviewRecord } from '@/lib/crossub-api/types';
import {
  reviewMaintenanceQuotationDecisionCase,
  sendMaintenanceContractorFeedbackCase,
  sendMaintenanceQuotationCounterOfferCase,
  sendMaintenanceQuotationToLandlordCase,
} from '@/lib/maintenance/maintenance-case-ops';
import {
  hasPendingAgentCounterOffer,
  isContractorRequotedAwaitingAgent,
  REQUOTED_STATUS_CLASS,
} from '@/lib/maintenance/quotation-review-state';
import {
  latestSubmittedQuoteForContractor,
  resolveContractorDisplayName,
} from '@/lib/maintenance/resolve-contractor-display';
import type { Property } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';

function reviewForContractor(
  reviews: QuotationReviewRecord[] | undefined,
  contractorId: string,
  quotationId?: string,
) {
  return reviews?.find(
    (r) =>
      r.contractorId === contractorId ||
      (quotationId != null && r.quotationId === quotationId),
  );
}

function ContractorQuoteCollapsible({
  contractorName,
  submitted,
  review,
  expanded,
  canReview,
  onToggle,
  onCaseUpdated,
}: {
  contractorName: string;
  submitted?: ReturnType<typeof latestSubmittedQuoteForContractor>;
  review?: QuotationReviewRecord;
  expanded: boolean;
  canReview: boolean;
  onToggle: () => void;
  onCaseUpdated?: () => Promise<void>;
}) {
  const requotedAwaitingAgent = isContractorRequotedAwaitingAgent(review, submitted);
  const pendingAgentCounter = hasPendingAgentCounterOffer(review, review?.decision);

  const statusLabel = requotedAwaitingAgent
    ? 'Contractor requoted — review revised quotation'
    : review?.decision
    ? review.decision === 'approved'
      ? review.landlordEmailSentAt
        ? 'Sent to landlord'
        : 'Approved — send to landlord'
      : review.contractorFeedbackSentAt
        ? 'Feedback sent'
        : 'Declined — send feedback'
    : pendingAgentCounter
      ? 'Awaiting contractor response to counter offer'
    : submitted
      ? `Submitted ${formatDateTime(submitted.submittedAt)}`
      : 'Pending quotation';

  const statusBadgeClass = requotedAwaitingAgent
    ? REQUOTED_STATUS_CLASS
    : review?.decision === 'approved'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : review?.decision === 'declined'
        ? 'bg-red-500/10 text-red-700 dark:text-red-300'
        : pendingAgentCounter
          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
          : submitted
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300';

  const statusBadgeLabel = requotedAwaitingAgent
    ? 'Requoted'
    : review?.decision === 'approved'
      ? 'Approved'
      : review?.decision === 'declined'
        ? 'Declined'
        : pendingAgentCounter
          ? 'Counter sent'
          : submitted
            ? 'Submitted'
            : 'Awaiting';

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
      >
        <span className="min-w-0">
          <p className="truncate text-sm font-semibold">{contractorName}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{statusLabel}</p>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              statusBadgeClass,
            )}
          >
            {statusBadgeLabel}
          </span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </span>
      </button>

      {expanded ? (
        <div className="border-t px-3 py-3">
          {submitted ? (
            <>
              <MaintenanceRepairQuotationPanel quote={submitted} embedded mode="readonly" />
              <MaintenanceQuotationReviewActions
                quote={submitted}
                review={review}
                canReview={canReview}
                onReviewDecision={async (decision, declineReason) => {
                  await reviewMaintenanceQuotationDecisionCase(
                    submitted.id,
                    decision,
                    declineReason,
                    {
                      maintenanceRequestId: submitted.maintenanceRequestId,
                      contractorId: submitted.contractorId,
                      price: submitted.price,
                      currency: submitted.currency,
                      scope: submitted.scope,
                      availableSchedule: submitted.availableSchedule,
                      submittedAt: submitted.submittedAt,
                      status: submitted.status,
                      lineItems: submitted.lineItems,
                      comments: submitted.comments,
                    },
                  );
                  await onCaseUpdated?.();
                }}
                onSendToLandlord={async () => {
                  await sendMaintenanceQuotationToLandlordCase(submitted.id);
                  await onCaseUpdated?.();
                }}
                onSendFeedback={async (message) => {
                  await sendMaintenanceContractorFeedbackCase(submitted.id, message);
                  await onCaseUpdated?.();
                }}
                onCounterOffer={async (counterPrice, message) => {
                  await sendMaintenanceQuotationCounterOfferCase(
                    submitted.id,
                    counterPrice,
                    message,
                  );
                  await onCaseUpdated?.();
                }}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-xs">
              Waiting for {contractorName} to submit a repair quotation via the admin portal.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MaintenanceGetQuotePanel({
  ctx,
  contractors = [],
  onCaseUpdated,
  apiConnected = false,
}: {
  ctx: MaintenanceWorkflowContext;
  property?: Property;
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<MaintenanceContractorSuggestion[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const quotes = getMaintenanceQuotationsForCase(ctx.workspaceCase);
  const invitedIds = resolveInvitedContractorIds(ctx);
  const landlordFlow = requiresContractorFlow(ctx);
  const audit = auditEntriesForStep(ctx, MAINTENANCE_AGENT_STEP.GET_QUOTE);
  const emailRecords = maintenanceEmailRecordsForStep(ctx, MAINTENANCE_AGENT_STEP.GET_QUOTE).filter(
    (record) => record.kind !== 'counter_offer',
  );
  const canReview = apiConnected;

  useEffect(() => {
    if (!landlordFlow) return;
    let cancelled = false;
    void fetchMaintenanceContractorSuggestions(ctx.item.id)
      .then((rows) => {
        if (!cancelled) setSuggestions(rows);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ctx.item.id, landlordFlow]);

  const labelArgs = useMemo(
    () => ({
      contractors,
      suggestions,
      invitedContractors: ctx.workspaceCase.invitedContractors,
      fallbackName: ctx.item.contractorName,
    }),
    [contractors, ctx.item.contractorName, ctx.workspaceCase.invitedContractors, suggestions],
  );

  const contractorLabel = (contractorId: string) =>
    resolveContractorDisplayName(contractorId, labelArgs);

  const toggleExpanded = (contractorId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contractorId)) next.delete(contractorId);
      else next.add(contractorId);
      return next;
    });
  };

  if (!landlordFlow) {
    const responsibility = resolveMaintenanceResponsibility(ctx);
    return (
      <p className="text-muted-foreground rounded-xl border bg-card p-4 text-sm">
        Contractor quotation is not required —{' '}
        <span className="text-foreground font-medium capitalize">
          {responsibility ?? 'this party'}
        </span>{' '}
        is responsible for this repair.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Repair quotations</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Quotations are entered in the admin portal. Expand a contractor to approve, requote, decline, or send emails.
        </p>

        {invitedIds.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-xs">
            No contractors invited yet — complete Review with tradesmen selected for RFQ.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {invitedIds.map((contractorId) => {
              const submitted = latestSubmittedQuoteForContractor(
                quotes,
                ctx.workspaceCase.id,
                contractorId,
              );
              return (
                <ContractorQuoteCollapsible
                  key={contractorId}
                  contractorName={contractorLabel(contractorId)}
                  submitted={submitted}
                  review={reviewForContractor(
                    ctx.workspaceCase.quotationReviews,
                    contractorId,
                    submitted?.id,
                  )}
                  expanded={expandedIds.has(contractorId)}
                  canReview={canReview}
                  onToggle={() => toggleExpanded(contractorId)}
                  onCaseUpdated={onCaseUpdated}
                />
              );
            })}
          </div>
        )}
      </section>

      {emailRecords.length > 0 ? (
        <JobCaseStageEmailHistory emails={emailRecords} title="Email / message history" />
      ) : null}

      {audit.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Quote events
          </p>
          <ol className="space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="text-xs">
                <p className="font-medium">{entry.message}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatDateTime(entry.timestamp)} · {entry.actor}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
