'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, FileText, ImageIcon } from 'lucide-react';

import { MaintenanceRepairQuotationPanel } from '@/components/maintenance/maintenance-repair-quotation-panel';
import type {
  ApiMaintenanceAttachment,
  ApiQuotation,
  QuotationReviewRecord,
} from '@/lib/crossub-api/types';
import { resolveContractorDisplayName } from '@/lib/maintenance/resolve-contractor-display';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

type AttachmentKind = ApiMaintenanceAttachment['kind'];

const ATTACHMENT_KIND_LABEL: Record<AttachmentKind, string> = {
  initial_evidence: 'Intake photos & videos',
  evidence: 'Completion evidence',
  invoice: 'Invoice',
  quote: 'Contractor quote files',
};

function attachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
}

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

function AttachmentGrid({
  attachments,
  onPreview,
}: {
  attachments: ApiMaintenanceAttachment[];
  onPreview: (att: ApiMaintenanceAttachment) => void;
}) {
  if (attachments.length === 0) {
    return <p className="text-muted-foreground text-xs">No files uploaded.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
      {attachments.map((att) => {
        const previewUrl = attachmentPreviewUrl(att);
        const isImage = att.mimeType.startsWith('image/');
        return (
          <button
            key={att.id}
            type="button"
            onClick={() => onPreview(att)}
            className="relative h-14 overflow-hidden rounded-md border bg-muted text-left hover:bg-secondary/20"
            title={att.fileName}
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={att.fileName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-0.5 px-1">
                <FileText className="text-muted-foreground/60 size-4" />
                <span className="text-muted-foreground line-clamp-2 text-[9px]">{att.fileName}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
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
  attachments,
  quotations,
  contractors,
  invitedContractors,
  assignedContractorId,
  assignedContractorName,
  quotationReviews,
  onPreviewAttachment,
}: {
  requestId: string;
  attachments: ApiMaintenanceAttachment[];
  quotations: ApiQuotation[];
  contractors: Array<{ id: string; name: string }>;
  invitedContractors?: Array<{ id: string; name: string }>;
  assignedContractorId?: string;
  assignedContractorName?: string;
  quotationReviews?: QuotationReviewRecord[];
  onPreviewAttachment?: (att: ApiMaintenanceAttachment) => void;
}) {
  const [expandedContractorId, setExpandedContractorId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ApiMaintenanceAttachment | null>(null);

  const caseAttachments = useMemo(
    () => attachments.filter((a) => a.maintenanceRequestId === requestId),
    [attachments, requestId],
  );

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

  const attachmentsByKind = useMemo(() => {
    const groups: Record<AttachmentKind, ApiMaintenanceAttachment[]> = {
      initial_evidence: [],
      evidence: [],
      invoice: [],
      quote: [],
    };
    for (const att of caseAttachments) {
      groups[att.kind].push(att);
    }
    return groups;
  }, [caseAttachments]);

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

  const handlePreview = (att: ApiMaintenanceAttachment) => {
    if (onPreviewAttachment) {
      onPreviewAttachment(att);
      return;
    }
    setPreviewAttachment(att);
  };

  const hasQuotes = caseQuotations.length > 0;
  const hasAttachments = caseAttachments.length > 0;

  if (!hasQuotes && !hasAttachments) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
        <ImageIcon className="text-muted-foreground/40 mx-auto size-8" />
        <p className="text-muted-foreground mt-2 text-sm">No attachments or quotations recorded.</p>
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

      {hasQuotes ? (
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
      ) : null}

      {hasAttachments ? (
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Uploaded attachments
            </p>
          </div>
          <div className="space-y-4 p-4">
            {(Object.keys(attachmentsByKind) as AttachmentKind[]).map((kind) => {
              const items = attachmentsByKind[kind];
              if (items.length === 0) return null;
              return (
                <div key={kind}>
                  <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
                    {ATTACHMENT_KIND_LABEL[kind]} ({items.length})
                  </p>
                  <AttachmentGrid attachments={items} onPreview={handlePreview} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {previewAttachment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewAttachment(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] max-w-3xl overflow-auto rounded-lg bg-background p-2"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            {previewAttachment.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachmentPreviewUrl(previewAttachment)}
                alt={previewAttachment.fileName}
                className="max-h-[80vh] w-full object-contain"
              />
            ) : (
              <iframe
                src={attachmentPreviewUrl(previewAttachment)}
                title={previewAttachment.fileName}
                className="h-[80vh] w-full min-w-[min(90vw,640px)]"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
