'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { MaintenanceQuotationReviewActions } from '@/components/maintenance/maintenance-quotation-review-actions';
import { ContractorPreviousQuotationPanel } from '@/components/maintenance/contractor-previous-quotation-panel';
import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';
import { RequotedQuotationBadge } from '@/components/maintenance/requoted-quotation-badge';
import {
  getMaintenanceQuotationsForCase,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import {
  resolveMaintenanceResponsibility,
} from '@/lib/maintenance/infer-responsibility';
import { resolveRfqContractorIds } from '@/lib/maintenance/resolve-rfq-contractor-ids';
import {
  fetchMaintenanceContractorSuggestions,
  type MaintenanceContractorSuggestion,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceRequest, ApiMaintenanceState, ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';
import {
  reviewMaintenanceQuotationDecisionCase,
  sendMaintenanceContractorFeedbackCase,
  sendMaintenanceQuotationCounterOfferCase,
  sendMaintenanceQuotationToLandlordCase,
} from '@/lib/maintenance/maintenance-case-ops';
import {
  getContractorQuotationHistory,
  hasPendingAgentCounterOffer,
  isContractorRequotedAwaitingAgent,
  REQUOTED_STATUS_CLASS,
} from '@/lib/maintenance/quotation-review-state';
import {
  contractorIdsMatch,
  latestSubmittedQuoteForContractor,
  resolveContractorDisplayName,
} from '@/lib/maintenance/resolve-contractor-display';
import { maintenanceContractorSelectionKey } from '@/lib/maintenance/maintenance-contractor-key';
import type { Property } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';
import { MaintenanceContractorRfqReminderCountdown } from '@/components/maintenance/maintenance-contractor-rfq-reminder-countdown';
import { MaintenanceQuotationApprovalReminderCountdown } from '@/components/maintenance/maintenance-quotation-approval-reminder-countdown';
import { MaintenanceContractorEvidenceRequestsPanel } from '@/components/maintenance/maintenance-contractor-evidence-requests-panel';
import { mergeQuotationsForCase } from '@/lib/maintenance/fetch-maintenance-case';

function reviewForContractor(
  reviews: QuotationReviewRecord[] | undefined,
  contractorId: string,
  quotationId?: string,
) {
  return reviews?.find(
    (r) =>
      contractorIdsMatch(r.contractorId, contractorId) ||
      (quotationId != null && r.quotationId === quotationId),
  );
}

function normalizeInvitedContractorId(
  contractorId: string,
  suggestions: MaintenanceContractorSuggestion[],
): string {
  const hit = suggestions.find(
    (row) =>
      contractorIdsMatch(maintenanceContractorSelectionKey(row), contractorId) ||
      contractorIdsMatch(row.id, contractorId) ||
      (row.contractorId ? contractorIdsMatch(row.contractorId, contractorId) : false),
  );
  return hit ? maintenanceContractorSelectionKey(hit) : contractorId;
}

function dedupeInvitedContractorIds(
  ids: string[],
  suggestions: MaintenanceContractorSuggestion[],
): string[] {
  const unique: string[] = [];
  for (const rawId of ids) {
    const id = normalizeInvitedContractorId(rawId, suggestions);
    if (!unique.some((existing) => contractorIdsMatch(existing, id))) {
      unique.push(id);
    }
  }
  return unique;
}

function ContractorQuoteCollapsible({
  contractorName,
  contractorId,
  requestId,
  quotations,
  submitted,
  review,
  expanded,
  canReview,
  onToggle,
  onCaseUpdated,
  workflowRequest,
  maintenanceReminders,
}: {
  contractorName: string;
  contractorId: string;
  requestId: string;
  quotations: ApiQuotation[];
  submitted?: ReturnType<typeof latestSubmittedQuoteForContractor>;
  review?: QuotationReviewRecord;
  expanded: boolean;
  canReview: boolean;
  onToggle: () => void;
  onCaseUpdated?: () => Promise<void>;
  workflowRequest?: ApiMaintenanceRequest | null;
  maintenanceReminders?: ApiMaintenanceState['maintenanceReminders'];
}) {
  const [viewingPreviousId, setViewingPreviousId] = useState<string | null>(null);
  const requotedAwaitingAgent = isContractorRequotedAwaitingAgent(review, submitted);
  const pendingAgentCounter = hasPendingAgentCounterOffer(review, review?.decision);
  const { previous: previousQuotes } = getContractorQuotationHistory(
    quotations,
    requestId,
    contractorId,
    submitted?.id,
  );
  const viewingPreviousQuote = viewingPreviousId
    ? quotations.find((quote) => quote.id === viewingPreviousId)
    : undefined;
  const previousVersionLabel = viewingPreviousQuote
    ? `Previous quote ${
        previousQuotes.findIndex((quote) => quote.id === viewingPreviousQuote.id) >= 0
          ? previousQuotes.length -
            previousQuotes.findIndex((quote) => quote.id === viewingPreviousQuote.id)
          : 1
      }`
    : undefined;

  useEffect(() => {
    setViewingPreviousId(null);
  }, [submitted?.id]);

  const statusLabel = requotedAwaitingAgent
    ? 'Contractor requoted — review revised quotation'
    : review?.decision
    ? review.decision === 'approved'
        ? review.agentApprovalEmailSkipped
          ? 'Approved — proceeded without landlord email'
          : review.agentApprovalEmailSentAt || review.landlordEmailSentAt
            ? 'Sent to landlord'
            : 'Approved — sending to landlord'
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
      <div className="flex w-full items-center justify-between gap-3 px-3 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold">{contractorName}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{statusLabel}</p>
          {!submitted && workflowRequest ? (
            <MaintenanceContractorRfqReminderCountdown
              contractorId={contractorId}
              request={workflowRequest}
              reminders={maintenanceReminders ?? []}
              quotations={quotations}
              className="mt-1"
            />
          ) : null}
        </button>
        <span className="flex shrink-0 items-center gap-2">
          {requotedAwaitingAgent ? (
            <RequotedQuotationBadge
              previousQuotes={previousQuotes}
              selectedPreviousId={viewingPreviousId}
              onSelectPrevious={setViewingPreviousId}
            />
          ) : (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                statusBadgeClass,
              )}
            >
              {statusBadgeLabel}
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${contractorName}` : `Expand ${contractorName}`}
            className="text-muted-foreground hover:bg-muted/60 flex size-8 items-center justify-center rounded-md"
          >
            <ChevronDown
              className={cn(
                'size-4 transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </button>
        </span>
      </div>

      {expanded ? (
        <div className="border-t px-3 py-3">
          {submitted ? (
            <>
              {viewingPreviousQuote ? (
                <ContractorPreviousQuotationPanel
                  quote={viewingPreviousQuote}
                  versionLabel={previousVersionLabel}
                />
              ) : null}
              <div className="space-y-2">
                {viewingPreviousQuote ? (
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Current quotation
                  </p>
                ) : null}
                <MaintenanceRepairQuotationPanel quote={submitted} embedded mode="readonly" />
              </div>
              <MaintenanceQuotationReviewActions
                quote={submitted}
                review={review}
                canReview={canReview}
                onReviewDecision={async (decision, declineReason, opts) => {
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
                    opts,
                  );
                  await onCaseUpdated?.();
                }}
                onSendToLandlord={async (opts) => {
                  await sendMaintenanceQuotationToLandlordCase(submitted.id, opts);
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
  maintenanceReminders = [],
  workflowRequest = null,
  quotations: quotationsProp = [],
}: {
  ctx: MaintenanceWorkflowContext;
  property?: Property;
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
  apiConnected?: boolean;
  maintenanceReminders?: ApiMaintenanceState['maintenanceReminders'];
  workflowRequest?: ApiMaintenanceRequest | null;
  quotations?: ApiQuotation[];
}) {
  const [suggestions, setSuggestions] = useState<MaintenanceContractorSuggestion[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const quotes = useMemo(
    () =>
      mergeQuotationsForCase(
        quotationsProp,
        getMaintenanceQuotationsForCase(ctx.workspaceCase),
      ),
    [quotationsProp, ctx.workspaceCase],
  );
  const invitedIds = useMemo(() => {
    const resolved = resolveRfqContractorIds({
      requestId: ctx.workspaceCase.id,
      invitedContractors: ctx.workspaceCase.invitedContractors,
      invitedContractorIds:
        ctx.workspaceCase.invitedContractorIds ?? ctx.item.invitedContractorIds,
      quotations: quotes,
      auditEntries: ctx.workspaceCase.auditEntries,
      assignedContractorId: ctx.workspaceCase.assignedContractorId,
    });
    return dedupeInvitedContractorIds(resolved, suggestions);
  }, [
    ctx.item.invitedContractorIds,
    ctx.workspaceCase.assignedContractorId,
    ctx.workspaceCase.auditEntries,
    ctx.workspaceCase.id,
    ctx.workspaceCase.invitedContractorIds,
    ctx.workspaceCase.invitedContractors,
    quotes,
    suggestions,
  ]);
  const landlordFlow = requiresContractorFlow(ctx);
  const canReview = apiConnected;

  useEffect(() => {
    const withQuotes = invitedIds.filter((id) =>
      Boolean(latestSubmittedQuoteForContractor(quotes, ctx.workspaceCase.id, id)),
    );
    if (withQuotes.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of withQuotes) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [ctx.workspaceCase.id, invitedIds, quotes]);

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
      assignedContractorId: ctx.workspaceCase.assignedContractorId,
      assignedContractorName: ctx.item.contractorName,
      auditEntries: ctx.workspaceCase.auditEntries,
      invitedContractorIds: invitedIds,
    }),
    [
      contractors,
      ctx.item.contractorName,
      ctx.workspaceCase.assignedContractorId,
      ctx.workspaceCase.auditEntries,
      ctx.workspaceCase.invitedContractors,
      invitedIds,
      suggestions,
    ],
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
      {workflowRequest ? (
        <MaintenanceContractorEvidenceRequestsPanel
          request={workflowRequest}
          contractors={contractors}
          onCaseUpdated={onCaseUpdated}
        />
      ) : null}
      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Repair quotations</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Expand a contractor to approve, requote, decline, or send the quotation to the landlord.
          Reminders are sent every 4 hours (up to 3 per contractor) until they respond; if none reply, the system auto-reselects 3 new contractors.
        </p>
        {workflowRequest?.status === 'pending_approval' ? (
          <MaintenanceQuotationApprovalReminderCountdown
            request={workflowRequest}
            reminders={maintenanceReminders}
            quotations={quotes}
            className="mt-2"
          />
        ) : null}

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
                  contractorId={contractorId}
                  requestId={ctx.workspaceCase.id}
                  quotations={quotes}
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
                  workflowRequest={workflowRequest}
                  maintenanceReminders={maintenanceReminders}
                />
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
