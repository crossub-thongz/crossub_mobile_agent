'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ImageIcon } from 'lucide-react';

import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';
import type { ApiQuotation, QuotationReviewRecord } from '@/lib/crossub-api/types';
import { resolveContractorDisplayName } from '@/lib/maintenance/resolve-contractor-display';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

function quoteStatusLabel(status: ApiQuotation['status']): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'declined':
      return 'Declined';
    default:
      return 'Submitted';
  }
}

function quoteStatusClass(status: ApiQuotation['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'declined':
      return 'bg-red-500/10 text-red-700 dark:text-red-300';
    default:
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-200';
  }
}

function ContractorQuotesCollapsible({
  contractorName,
  quotes,
  review,
  expanded,
  onToggle,
  isApprovedContractor,
}: {
  contractorName: string;
  quotes: ApiQuotation[];
  review?: QuotationReviewRecord;
  expanded: boolean;
  onToggle: () => void;
  isApprovedContractor: boolean;
}) {
  const latest = quotes[0];
  const approved = quotes.find((q) => q.status === 'approved');

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-background',
        isApprovedContractor && 'border-emerald-500/40 ring-1 ring-emerald-500/20',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40"
      >
        <ChevronDown
          className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{contractorName}</p>
          <p className="text-muted-foreground text-xs">
            {quotes.length} quote{quotes.length === 1 ? '' : 's'}
            {latest ? ` · Latest ${formatCurrency(latest.price)}` : ''}
          </p>
        </div>
        {isApprovedContractor ? (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Selected
          </span>
        ) : null}
        {approved ? (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Approved
          </span>
        ) : latest ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              quoteStatusClass(latest.status),
            )}
          >
            {quoteStatusLabel(latest.status)}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="space-y-3 border-t px-3 py-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    quoteStatusClass(quote.status),
                  )}
                >
                  {quoteStatusLabel(quote.status)}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(quote.price)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTime(quote.submittedAt)}
                </span>
              </div>
              {quote.scope ? (
                <p className="text-muted-foreground text-xs whitespace-pre-wrap">{quote.scope}</p>
              ) : null}
              <MaintenanceRepairQuotationPanel
                quote={quote}
                contractorName={contractorName}
                mode="readonly"
                embedded
              />
            </div>
          ))}
          {review?.decidedAt ? (
            <p className="text-muted-foreground text-[11px]">
              Decision recorded {formatDateTime(review.decidedAt)}
              {review.decidedBy ? ` · ${review.decidedBy}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function MaintenanceCompletedCaseArchive({
  requestId,
  quotations,
  contractors,
  invitedContractors,
  assignedContractorId,
  assignedContractorName,
  quotationReviews,
}: {
  requestId: string;
  quotations: ApiQuotation[];
  contractors: Array<{ id: string; name: string }>;
  invitedContractors?: Array<{ id: string; name: string }>;
  assignedContractorId?: string;
  assignedContractorName?: string;
  quotationReviews?: QuotationReviewRecord[];
}) {
  const [expandedContractorId, setExpandedContractorId] = useState<string | null>(null);

  const caseQuotations = useMemo(
    () =>
      [...quotations]
        .filter((q) => q.maintenanceRequestId === requestId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [quotations, requestId],
  );

  const approvedQuotation = useMemo(
    () => caseQuotations.find((q) => q.status === 'approved'),
    [caseQuotations],
  );

  const contractorGroups = useMemo(() => {
    const ids = new Set<string>();
    for (const q of caseQuotations) ids.add(q.contractorId);
    invitedContractors?.forEach((c) => ids.add(c.id));
    if (assignedContractorId) ids.add(assignedContractorId);

    return Array.from(ids).map((contractorId) => {
      const quotes = caseQuotations.filter((q) => q.contractorId === contractorId);
      const review = quotationReviews?.find(
        (r) => r.contractorId === contractorId || quotes.some((q) => q.id === r.quotationId),
      );
      return {
        contractorId,
        contractorName: resolveContractorDisplayName(contractorId, {
          contractors,
          invitedContractors,
          fallbackName:
            contractorId === assignedContractorId ? assignedContractorName : undefined,
        }),
        quotes,
        review,
        isApprovedContractor: approvedQuotation?.contractorId === contractorId,
      };
    });
  }, [
    assignedContractorId,
    assignedContractorName,
    caseQuotations,
    contractors,
    invitedContractors,
    approvedQuotation?.contractorId,
    quotationReviews,
  ]);

  const hasQuotes = caseQuotations.length > 0;

  if (!hasQuotes) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
        <ImageIcon className="text-muted-foreground/40 mx-auto size-8" />
        <p className="text-muted-foreground mt-2 text-sm">No quotations recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approvedQuotation ? (
        <section className="overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04]">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Approved quotation
              </p>
              <p className="text-sm font-semibold">
                {resolveContractorDisplayName(approvedQuotation.contractorId, {
                  contractors,
                  invitedContractors,
                  fallbackName:
                    approvedQuotation.contractorId === assignedContractorId
                      ? assignedContractorName
                      : undefined,
                })}{' '}
                · {formatCurrency(approvedQuotation.price)}
              </p>
            </div>
          </div>
          <div className="p-4">
            <MaintenanceRepairQuotationPanel
              quote={approvedQuotation}
              contractorName={resolveContractorDisplayName(approvedQuotation.contractorId, {
                contractors,
                invitedContractors,
                fallbackName:
                  approvedQuotation.contractorId === assignedContractorId
                    ? assignedContractorName
                    : undefined,
              })}
              mode="readonly"
              embedded
            />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Contractor quotations
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            All quotes received for this job, including declined submissions.
          </p>
        </div>
        <div className="space-y-2 p-3">
          {contractorGroups.length === 0 ? (
            <p className="text-muted-foreground px-1 text-xs">No contractor quotes on file.</p>
          ) : (
            contractorGroups.map((group) => (
              <ContractorQuotesCollapsible
                key={group.contractorId}
                contractorName={group.contractorName}
                quotes={group.quotes}
                review={group.review}
                expanded={expandedContractorId === group.contractorId}
                onToggle={() =>
                  setExpandedContractorId((current) =>
                    current === group.contractorId ? null : group.contractorId,
                  )
                }
                isApprovedContractor={group.isApprovedContractor}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
