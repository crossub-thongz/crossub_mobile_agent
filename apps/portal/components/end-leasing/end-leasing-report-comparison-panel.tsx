'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AddHandymanDialog } from '@/components/end-leasing/add-handyman-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { communicationsThread } from '@/constants/routes';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionDetail } from '@/lib/inspections-types';
import type {
  EndLeasingManualInspectionReport,
  ReportComparisonRepairItem,
  ReportComparisonSettlementSummary,
  TenantQuoteResponse,
  TerminationCaseDetail,
} from '@/lib/end-leasing/types';
import {
  extractTenantResponsibilityFromOutgoing,
  mergeInspectionResponsibilityItems,
} from '@/lib/end-leasing/outgoing-inspection-sync';
import { resolveCompareIngoingDetail } from '@/lib/end-leasing/resolve-compare-ingoing';
import { deriveTenantResponsibilityReviewStatus } from '@/lib/end-leasing/tenant-responsibility-review.util';
import {
  canAgentSendTenantQuotation,
  deriveAgentLandlordQuoteResponse,
  quoteStepHasLandlordItems,
  quoteStepLandlordQuoteSentToAgent,
  type AgentLandlordQuoteResponse,
} from '@/lib/end-leasing/quote-step-gates.util';
import {
  endLeasingSendCtaClassName,
  endLeasingSendCtaVariant,
} from '@/lib/end-leasing/end-leasing-send-cta.util';
import { isInspectionReportReadyForView } from '@/lib/inspections/inspection-report-ready';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { ReportComparisonRepairItemInput } from '@/lib/termination-case-types';
import { terminationApi } from '@/lib/termination-case-api';
import {
  fetchPreferredContractors,
  type PreferredContractor,
} from '@/lib/crossub-api/agent-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { fileToBase64, MAX_UPLOAD_BYTES } from '@/lib/file-upload';

const TENANT_QUOTE_RESPONSE_LABEL: Record<TenantQuoteResponse, string> = {
  pending: 'Awaiting response',
  accepted: 'Yes — tenant agrees',
  declined: 'No — tenant disagrees',
};

const REPAIR_COL_INDEX = 'w-10';
const REPAIR_COL_AREA = 'w-28';
const REPAIR_COL_QUOTE = 'w-28';
const REPAIR_COL_COMPANY = 'w-44';
const REPAIR_COL_ACTION = 'w-10';

type MaintenanceColumnMode = 'hidden' | 'pending_ack' | 'actions';

function MaintenanceReviewStatusCell({
  row,
  reviewPending,
}: {
  row: ReportComparisonRepairItem;
  reviewPending: boolean;
}) {
  return (
    <td className="px-2 py-2">
      <span className="text-muted-foreground text-[10px] leading-snug">
        {row.maintenanceRequestId
          ? 'End of Lease job opened'
          : row.handymanName
            ? `${row.handymanName} selected`
            : reviewPending
              ? 'CROSSUB assigning contractor'
              : '—'}
      </span>
    </td>
  );
}

function TenantQuoteResponsePanel({
  response,
  responseAt,
  declineReason,
  replyExcerpt,
  commConversationId,
  busy,
  onCheckReply,
  onAgree,
  onDisagree,
}: {
  response: TenantQuoteResponse | null | undefined;
  responseAt?: string | null;
  declineReason?: string | null;
  replyExcerpt?: string | null;
  commConversationId?: string | null;
  busy: boolean;
  onCheckReply: () => void;
  onAgree: () => void;
  onDisagree: () => void;
}) {
  const status = response ?? 'pending';
  const recorded = status === 'accepted' || status === 'declined';

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Tenant quote response</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Record whether the tenant agrees with the repair quote — answer on their behalf.
          </p>
        </div>
        {commConversationId ? (
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Link href={communicationsThread(commConversationId)}>
              <ExternalLink className="size-3.5" />
              Open email thread
            </Link>
          </Button>
        ) : null}
      </div>

      {!recorded ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 min-w-[4.5rem] px-4 text-sm font-semibold"
            disabled={busy}
            onClick={onAgree}
          >
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 min-w-[4.5rem] px-4 text-sm font-semibold"
            disabled={busy}
            onClick={onDisagree}
          >
            No
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-9 gap-1.5 text-xs"
            disabled={busy}
            onClick={onCheckReply}
          >
            <RefreshCw className="size-3.5" />
            Check email for reply
          </Button>
        </div>
      ) : (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            status === 'accepted'
              ? 'border-primary/30 bg-primary/5'
              : 'border-destructive/30 bg-destructive/5'
          }`}
        >
          <p className="font-semibold">{TENANT_QUOTE_RESPONSE_LABEL[status]}</p>
          {responseAt ? (
            <p className="text-muted-foreground mt-1">Recorded {formatDateTime(responseAt)}</p>
          ) : null}
          {replyExcerpt ? (
            <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
              Email reply: {replyExcerpt}
            </p>
          ) : null}
          {declineReason ? (
            <p className="mt-2 whitespace-pre-wrap">{declineReason}</p>
          ) : null}
        </div>
      )}

      {recorded ? (
        <div className="flex flex-wrap gap-2">
          {status !== 'accepted' ? (
            <Button
              type="button"
              size="sm"
              className="h-8 min-w-[3.5rem] px-3 text-xs font-semibold"
              disabled={busy}
              onClick={onAgree}
            >
              Yes
            </Button>
          ) : null}
          {status !== 'declined' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 min-w-[3.5rem] px-3 text-xs font-semibold"
              disabled={busy}
              onClick={onDisagree}
            >
              No
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={onCheckReply}
          >
            <RefreshCw className="size-3.5" />
            Check email for reply
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function TenantQuotationSentBody({
  items,
  settlementSummary,
  sentAt,
  tenantQuoteResponse,
  tenantQuoteResponseAt,
  declineReason,
}: {
  items: ReportComparisonRepairItem[];
  settlementSummary: ReportComparisonSettlementSummary | null | undefined;
  sentAt?: string | null;
  tenantQuoteResponse?: TenantQuoteResponse | null;
  tenantQuoteResponseAt?: string | null;
  declineReason?: string | null;
}) {
  const response = tenantQuoteResponse ?? 'pending';

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Sent to the tenant
        {sentAt ? ` on ${formatDateTime(sentAt)}` : ''}. Bond deduct shows whether each item may
        be taken from the rental bond.
      </p>
      <div className="overflow-x-auto rounded-xl border text-xs">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="w-24 px-3 py-2 font-semibold">Bond deduct</th>
              <th className="w-28 px-3 py-2 font-semibold">Landlord waivable</th>
              <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
              <th className="min-w-[120px] px-3 py-2 font-semibold">Description</th>
              <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
              <th className="min-w-[160px] px-3 py-2 font-semibold">Comments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={`bond-ack-sent-${index}`} className="border-t align-top">
                <td className="px-3 py-2">{row.bondDeductible === true ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{row.landlordWaivable === true ? 'Yes' : 'No'}</td>
                <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area || '—'}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{row.description || '—'}</td>
                <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                  <MaintenanceQuoteCell row={row} />
                </td>
                <td className="px-3 py-2 whitespace-pre-wrap">
                  {row.bondDeductionStaffComment?.trim() ? (
                    <p>
                      <span className="font-medium">CROSSUB:</span> {row.bondDeductionStaffComment}
                    </p>
                  ) : null}
                  {row.bondDeductionAgentComment?.trim() ? (
                    <p className={row.bondDeductionStaffComment?.trim() ? 'mt-1' : undefined}>
                      <span className="font-medium">Agent:</span> {row.bondDeductionAgentComment}
                    </p>
                  ) : null}
                  {!row.bondDeductionStaffComment?.trim() &&
                  !row.bondDeductionAgentComment?.trim()
                    ? '—'
                    : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {settlementSummary ? <SettlementSummaryPanel summary={settlementSummary} compact /> : null}
      {response === 'pending' ? (
        <p className="text-muted-foreground text-xs">Awaiting tenant response in the Tenant app.</p>
      ) : (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            response === 'accepted'
              ? 'border-primary/30 bg-primary/5'
              : 'border-destructive/30 bg-destructive/5'
          }`}
        >
          <p className="font-semibold">{TENANT_QUOTE_RESPONSE_LABEL[response]}</p>
          {tenantQuoteResponseAt ? (
            <p className="text-muted-foreground mt-1">Recorded {formatDateTime(tenantQuoteResponseAt)}</p>
          ) : null}
          {declineReason ? (
            <p className="mt-2 whitespace-pre-wrap">
              <span className="font-medium">Tenant reason:</span> {declineReason}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TenantQuotationSentDialog({
  open,
  onOpenChange,
  items,
  settlementSummary,
  sentAt,
  tenantQuoteResponse,
  tenantQuoteResponseAt,
  declineReason,
  replyExcerpt,
  commConversationId,
  busy,
  onCheckReply,
  onAgree,
  onDisagree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReportComparisonRepairItem[];
  settlementSummary: ReportComparisonSettlementSummary | null | undefined;
  sentAt?: string | null;
  tenantQuoteResponse?: TenantQuoteResponse | null;
  tenantQuoteResponseAt?: string | null;
  declineReason?: string | null;
  replyExcerpt?: string | null;
  commConversationId?: string | null;
  busy: boolean;
  onCheckReply: () => void;
  onAgree: () => void;
  onDisagree: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" elevated>
        <DialogHeader>
          <DialogTitle>Quotation sent to tenant</DialogTitle>
          <DialogDescription>
            Bond deduction acknowledgement and maintenance quotation delivered to the tenant.
          </DialogDescription>
        </DialogHeader>
        <TenantQuotationSentBody
          items={items}
          settlementSummary={settlementSummary}
          sentAt={sentAt}
          tenantQuoteResponse={tenantQuoteResponse}
          tenantQuoteResponseAt={tenantQuoteResponseAt}
          declineReason={declineReason}
        />
        <TenantQuoteResponsePanel
          response={tenantQuoteResponse}
          responseAt={tenantQuoteResponseAt}
          declineReason={declineReason}
          replyExcerpt={replyExcerpt}
          commConversationId={commConversationId}
          busy={busy}
          onCheckReply={onCheckReply}
          onAgree={onAgree}
          onDisagree={onDisagree}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettlementSummaryPanel({
  summary,
  compact = false,
}: {
  summary: ReportComparisonSettlementSummary;
  compact?: boolean;
}) {
  const totalDeductions =
    summary.unpaidRent + summary.unpaidBills + summary.maintenanceCost;

  const inner = (
    <>
      {!compact ? (
        <p className="text-muted-foreground text-xs">
          Total bond less unpaid rent, unpaid bills, and tenant maintenance costs.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border text-xs">
        <div className="divide-y">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-muted-foreground">Unpaid rent</span>
            <span className="font-medium tabular-nums">{formatCurrency(summary.unpaidRent)}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-muted-foreground">Unpaid bills</span>
            <span className="font-medium tabular-nums">{formatCurrency(summary.unpaidBills)}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-muted-foreground">Maintenance (tenant)</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(summary.maintenanceCost)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-muted/30 px-3 py-2">
            <span className="font-semibold">Total bond held</span>
            <span className="font-semibold tabular-nums">{formatCurrency(summary.bondHeld)}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-muted-foreground">Less deductions</span>
            <span className="font-medium tabular-nums text-destructive">
              −{formatCurrency(totalDeductions)}
            </span>
          </div>
          <div className="flex items-center justify-between bg-primary/5 px-3 py-2">
            <span className="font-semibold">
              {summary.debtAmount > 0 ? 'Debt owing' : 'Refund to tenant'}
            </span>
            <span className="text-primary font-semibold tabular-nums">
              {summary.debtAmount > 0
                ? formatCurrency(summary.debtAmount)
                : formatCurrency(summary.netRefund)}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Bond settlement summary</p>
        {inner}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Bond settlement summary</p>
      {inner}
    </section>
  );
}

function parseQuoteAmount(quote: string | undefined | null): number {
  if (!quote?.trim()) return 0;
  const normalized = quote.replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

function isEffectiveTenantBondDeduction(item: ReportComparisonRepairItem): boolean {
  return item.bondDeductible === true && item.landlordWaivable !== true;
}

function AgentLandlordQuoteReviewPanel({
  items,
  sentAt,
  response,
  respondedAt,
  declineReason,
  busy,
  onApprove,
  onDecline,
}: {
  items: ReportComparisonRepairItem[];
  sentAt?: string | null;
  response: AgentLandlordQuoteResponse;
  respondedAt?: string | null;
  declineReason?: string | null;
  busy: boolean;
  onApprove: () => void;
  onDecline: (reason: string) => void;
}) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineDraft, setDeclineDraft] = useState('');

  return (
    <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold">Landlord quotation from CROSSUB</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Review the landlord-responsibility maintenance quotes
          {sentAt ? ` sent ${formatDateTime(sentAt)}` : ''}. Approve to unlock sending the tenant
          quotation, or decline with a reason so CROSSUB can update and re-send.
        </p>
        {response === 'approved' ? (
          <p className="mt-2 text-xs font-medium text-emerald-700">
            Approved
            {respondedAt ? ` · ${formatDateTime(respondedAt)}` : ''}
          </p>
        ) : null}
        {response === 'declined' ? (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-destructive">
              Declined{respondedAt ? ` · ${formatDateTime(respondedAt)}` : ''}
            </p>
            {declineReason ? (
              <p className="text-muted-foreground text-xs whitespace-pre-wrap">{declineReason}</p>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Awaiting an updated quotation from CROSSUB before you can approve again.
            </p>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card text-xs">
        <table className="w-full table-fixed text-left">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
              <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Contractor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={`agent-landlord-quote-${index}`} className="border-t align-top">
                <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area || '—'}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{row.description || '—'}</td>
                <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                  <MaintenanceQuoteCell row={row} />
                </td>
                <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>{row.handymanName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {response === 'pending' ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 text-xs"
            disabled={busy}
            onClick={() => {
              setDeclineDraft('');
              setDeclineOpen(true);
            }}
          >
            <XCircle className="size-3.5" />
            Decline
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 bg-primary text-xs font-semibold text-primary-foreground shadow-md ring-2 ring-primary/25 hover:bg-primary/90"
            disabled={busy}
            onClick={onApprove}
          >
            <CheckCircle2 className="size-3.5" />
            Approve quotation
          </Button>
        </div>
      ) : null}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline landlord quotation</DialogTitle>
            <DialogDescription>
              Tell CROSSUB why this quotation cannot proceed. They will update and re-send.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            inputKind="contractor_quote_note"
            value={declineDraft}
            onChange={(event) => setDeclineDraft(event.target.value)}
            placeholder="Reason for declining…"
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !declineDraft.trim()}
              onClick={() => {
                onDecline(declineDraft.trim());
                setDeclineOpen(false);
              }}
            >
              Decline quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AgentTenantBondSendDialog({
  open,
  onOpenChange,
  items,
  bondHeld,
  settlementSummary,
  busy,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReportComparisonRepairItem[];
  bondHeld: number;
  settlementSummary: ReportComparisonSettlementSummary | null | undefined;
  busy: boolean;
  onSend: (items: ReportComparisonRepairItem[]) => void | Promise<void>;
}) {
  const [draftItems, setDraftItems] = useState<ReportComparisonRepairItem[]>(items);

  useEffect(() => {
    if (open) {
      setDraftItems(
        items.map((item) => ({
          ...item,
          bondDeductible: item.bondDeductible === true,
          landlordWaivable: item.landlordWaivable === true,
          bondDeductionStaffComment: item.bondDeductionStaffComment ?? '',
          bondDeductionAgentComment: item.bondDeductionAgentComment ?? '',
        })),
      );
    }
  }, [open, items]);

  const maintenanceCost = draftItems
    .filter(isEffectiveTenantBondDeduction)
    .reduce((sum, item) => sum + parseQuoteAmount(item.quote), 0);
  const unpaidRent = settlementSummary?.unpaidRent ?? 0;
  const unpaidBills = settlementSummary?.unpaidBills ?? 0;
  const totalDeductions = unpaidRent + unpaidBills + maintenanceCost;
  const netRefund = Math.max(0, bondHeld - totalDeductions);
  const debtAmount = Math.max(0, totalDeductions - bondHeld);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[min(96vw,1280px)] overflow-y-auto sm:max-w-[min(96vw,1280px)]"
        elevated
      >
        <DialogHeader>
          <DialogTitle>Send quotation to tenant</DialogTitle>
          <DialogDescription>
            Review CROSSUB&apos;s bond deduction proposal. You may adjust bond deduction, mark any
            line as landlord waivable (even when not bond deductible), and add agent comments before
            sending the final quotation to the tenant app and email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border text-xs">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="w-24 px-3 py-2 font-semibold">Bond deduct</th>
                  <th className="w-28 px-3 py-2 font-semibold">Landlord waivable</th>
                  <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
                  <th className="min-w-[120px] px-3 py-2 font-semibold">Description</th>
                  <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
                  <th className="min-w-[140px] px-3 py-2 font-semibold">CROSSUB comment</th>
                  <th className="min-w-[140px] px-3 py-2 font-semibold">Agent comment</th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((row, index) => (
                  <tr key={`bond-ack-${index}`} className="border-t align-top">
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={row.bondDeductible === true}
                          onChange={(event) => {
                            setDraftItems((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, bondDeductible: event.target.checked }
                                  : item,
                              ),
                            );
                          }}
                        />
                        <span className="sr-only">Deduct from bond</span>
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4 rounded border"
                          checked={row.landlordWaivable === true}
                          onChange={(event) => {
                            setDraftItems((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, landlordWaivable: event.target.checked }
                                  : item,
                              ),
                            );
                          }}
                        />
                        <span className="sr-only">Waivable by landlord</span>
                      </label>
                    </td>
                    <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{row.description}</td>
                    <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                      {row.quote || '—'}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 whitespace-pre-wrap">
                      {row.bondDeductionStaffComment?.trim() || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        inputKind="inspection_comment"
                        value={row.bondDeductionAgentComment ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setDraftItems((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, bondDeductionAgentComment: value } : item,
                            ),
                          );
                        }}
                        placeholder="Note for the tenant…"
                        rows={2}
                        className="min-h-[52px] resize-y text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SettlementSummaryPanel
            summary={{
              unpaidRent,
              unpaidBills,
              maintenanceCost,
              bondHeld,
              netRefund,
              debtAmount,
            }}
            compact
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary font-semibold text-primary-foreground shadow-md ring-2 ring-primary/25 hover:bg-primary/90"
            disabled={busy || draftItems.length === 0}
            onClick={() => void onSend(draftItems)}
          >
            {busy ? 'Sending…' : 'Send quotation to tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LandlordSendQuotationDialog({
  open,
  onOpenChange,
  items,
  busy,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReportComparisonRepairItem[];
  busy: boolean;
  onSend: () => void | Promise<void>;
}) {
  const totalQuoted = items.reduce((sum, item) => sum + parseQuoteAmount(item.quote), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" elevated>
        <DialogHeader>
          <DialogTitle>Send quotation to landlord</DialogTitle>
          <DialogDescription>
            Review landlord-responsibility quotes before emailing the property owner. They will
            receive the summary via email and the Landlord app.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border text-xs">
            <table className="w-full table-fixed text-left">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
                  <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Contractor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={`landlord-quote-${index}`} className="border-t align-top">
                    <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area || '—'}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{row.description || '—'}</td>
                    <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                      {row.quote || '—'}
                    </td>
                    <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>
                      {row.handymanName || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Total quoted
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(totalQuoted)}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || items.length === 0} onClick={() => void onSend()}>
            {busy ? 'Sending…' : 'Send quotation to landlord'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LandlordQuotationSentDialog({
  open,
  onOpenChange,
  items,
  sentAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReportComparisonRepairItem[];
  sentAt?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" elevated>
        <DialogHeader>
          <DialogTitle>Quotation sent to landlord</DialogTitle>
          <DialogDescription>
            Sent to the property owner
            {sentAt ? ` on ${formatDateTime(sentAt)}` : ''} via email and the Landlord app.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto rounded-xl border text-xs">
          <table className="w-full table-fixed text-left">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
                <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Contractor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, index) => (
                <tr key={`landlord-quote-sent-${index}`} className="border-t align-top">
                  <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area || '—'}</td>
                  <td className="px-3 py-2 whitespace-pre-wrap">{row.description || '—'}</td>
                  <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                    <MaintenanceQuoteCell row={row} />
                  </td>
                  <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>{row.handymanName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceQuotationPanel({ items }: { items: ReportComparisonRepairItem[] }) {
  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Maintenance quotation (tenant agreed)</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className={`${REPAIR_COL_INDEX} px-3 py-2 font-semibold`}>#</th>
              <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
              <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Handyman</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={`quote-${index}`} className="border-t align-top">
                <td className={`${REPAIR_COL_INDEX} px-3 py-2 tabular-nums`}>{index + 1}</td>
                <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{row.description}</td>
                <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                  <MaintenanceQuoteCell row={row} />
                </td>
                <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>{row.handymanName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function openManualReportBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadManualReportBlob(blob: Blob, fileName: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CompareReportColumn({
  kind,
  title,
  inspectionDetail,
  manualReports,
  loading,
  emptyLabel,
  caseId,
  allowUpload,
  actionBusy,
  onUploaded,
}: {
  kind: 'ingoing' | 'outgoing';
  title: string;
  inspectionDetail: InspectionDetail | null;
  manualReports: EndLeasingManualInspectionReport[];
  loading: boolean;
  emptyLabel: string;
  caseId: string;
  allowUpload: boolean;
  actionBusy: boolean;
  onUploaded: (updated: TerminationCaseDetail) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const hasSystemReport = isInspectionReportReadyForView(inspectionDetail);

  const handleUpload = async (file: File) => {
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('PDF is too large.');
      return;
    }
    try {
      const contentBase64 = await fileToBase64(file);
      const updated = await terminationApi.uploadManualInspectionReport(caseId, {
        kind,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        contentBase64,
      });
      onUploaded(updated);
      toast.success(`${title} uploaded`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const viewManualReport = async (report: EndLeasingManualInspectionReport) => {
    try {
      const blob = await terminationApi.downloadManualInspectionReport(caseId, report.id);
      openManualReportBlob(blob);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const downloadManualReport = async (report: EndLeasingManualInspectionReport) => {
    try {
      const blob = await terminationApi.downloadManualInspectionReport(caseId, report.id);
      await downloadManualReportBlob(blob, report.fileName);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const deleteManualReport = async (report: EndLeasingManualInspectionReport) => {
    if (
      !window.confirm(
        `Remove "${report.fileName}"? This only deletes the manual upload — inspector reports are unchanged.`,
      )
    ) {
      return;
    }
    setDeletingReportId(report.id);
    try {
      const updated = await terminationApi.deleteManualInspectionReport(caseId, report.id);
      onUploaded(updated);
      toast.success('Manual report removed');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeletingReportId(null);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {allowUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                void handleUpload(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[11px]"
              disabled={actionBusy || deletingReportId !== null}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3" />
              Upload PDF
            </Button>
          </>
        ) : null}
      </div>
      {loading ? (
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Loader2 className="size-3 animate-spin" />
          Loading…
        </span>
      ) : (
        <div className="space-y-2">
          {hasSystemReport && inspectionDetail ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px]">Inspector report (system)</p>
              <InspectionReportDownloadActions
                inspectionId={inspectionDetail.id}
                reportUrl={inspectionDetail.reportUrl}
                propertyLabel={
                  inspectionDetail.propertyFullAddress ??
                  inspectionDetail.propertyAddress ??
                  'Property'
                }
                inspectionType={kind}
                variant="inline"
                size="sm"
              />
            </div>
          ) : null}
          {manualReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-background/70 px-2 py-1.5 text-xs"
            >
              <span className="font-medium">{report.fileName}</span>
              <span className="text-muted-foreground">
                Uploaded by {report.uploadedByName} (
                {report.uploadedByRole === 'agent' ? 'Agent' : 'Admin'})
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={() => void viewManualReport(report)}
                >
                  <Eye className="size-3" />
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[11px]"
                  disabled={deletingReportId === report.id}
                  onClick={() => void downloadManualReport(report)}
                >
                  <Download className="size-3" />
                  Download
                </Button>
                {allowUpload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
                    disabled={deletingReportId === report.id || actionBusy}
                    onClick={() => void deleteManualReport(report)}
                  >
                    {deletingReportId === report.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!hasSystemReport && manualReports.length === 0 ? (
            <span className="text-muted-foreground text-xs">{emptyLabel}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CompareReportPdfRow({
  outgoingDetail,
  ingoingDetail,
  manualReports,
  loading,
  caseId,
  allowUpload = false,
  actionBusy = false,
  onUploaded,
}: {
  outgoingDetail: InspectionDetail | null;
  ingoingDetail: InspectionDetail | null;
  manualReports: EndLeasingManualInspectionReport[];
  loading: boolean;
  caseId: string;
  allowUpload?: boolean;
  actionBusy?: boolean;
  onUploaded?: (updated: TerminationCaseDetail) => void;
}) {
  const ingoingManual = manualReports.filter((row) => row.kind === 'ingoing');
  const outgoingManual = manualReports.filter((row) => row.kind === 'outgoing');

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CompareReportColumn
        kind="ingoing"
        title="Ingoing Report"
        inspectionDetail={ingoingDetail}
        manualReports={ingoingManual}
        loading={loading}
        emptyLabel={ingoingDetail ? 'Report not available yet' : 'Not linked yet'}
        caseId={caseId}
        allowUpload={allowUpload}
        actionBusy={actionBusy}
        onUploaded={onUploaded ?? (() => undefined)}
      />
      <CompareReportColumn
        kind="outgoing"
        title="Outgoing Report"
        inspectionDetail={outgoingDetail}
        manualReports={outgoingManual}
        loading={loading}
        emptyLabel={outgoingDetail ? 'Report not available yet' : 'Not scheduled yet'}
        caseId={caseId}
        allowUpload={allowUpload}
        actionBusy={actionBusy}
        onUploaded={onUploaded ?? (() => undefined)}
      />
    </div>
  );
}

function CompareReportsSection({
  outgoingDetail,
  ingoingDetail,
  manualReports,
  loading,
  agentAcknowledged,
  agentAcknowledgedAt,
  actionBusy,
  caseId,
  onConfirm,
  onCaseUpdated,
}: {
  outgoingDetail: InspectionDetail | null;
  ingoingDetail: InspectionDetail | null;
  manualReports: EndLeasingManualInspectionReport[];
  loading: boolean;
  agentAcknowledged: boolean;
  agentAcknowledgedAt?: string | null;
  actionBusy: boolean;
  caseId: string;
  onConfirm: () => void;
  onCaseUpdated: (updated: TerminationCaseDetail) => void;
}) {
  const ingoingManual = manualReports.filter((row) => row.kind === 'ingoing');
  const outgoingManual = manualReports.filter((row) => row.kind === 'outgoing');
  const hasOutgoingReport =
    isInspectionReportReadyForView(outgoingDetail) || outgoingManual.length > 0;
  const hasIngoingReport =
    isInspectionReportReadyForView(ingoingDetail) || ingoingManual.length > 0;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Ingoing / outgoing comparison</h3>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Open inspector reports when available, upload PDFs manually if needed, compare condition
            changes, then confirm as the managing agent.
          </p>
        </div>
        {agentAcknowledged ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="size-3.5" />
            Agent confirmed
            {agentAcknowledgedAt ? (
              <span className="text-muted-foreground font-normal">
                · {formatDateTime(agentAcknowledgedAt)}
              </span>
            ) : null}
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={actionBusy || loading}
            onClick={onConfirm}
          >
            Confirm comparison
          </Button>
        )}
      </div>
      <CompareReportPdfRow
        outgoingDetail={outgoingDetail}
        ingoingDetail={ingoingDetail}
        manualReports={manualReports}
        loading={loading}
        caseId={caseId}
        allowUpload
        actionBusy={actionBusy}
        onUploaded={onCaseUpdated}
      />
      {!agentAcknowledged && !loading && (!hasOutgoingReport || !hasIngoingReport) ? (
        <p className="text-muted-foreground text-[11px]">
          {!hasOutgoingReport && !hasIngoingReport
            ? 'Reports are not linked yet — upload PDFs manually or confirm once you have reviewed the comparison.'
            : !hasIngoingReport
              ? 'Ingoing report is not linked yet — upload manually or confirm when you are satisfied with the comparison.'
              : 'Outgoing report is not available yet — upload manually or confirm when you are satisfied with the comparison.'}
        </p>
      ) : null}
    </section>
  );
}

function appendCommentLine(existing: string, message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return existing;
  return existing.trim() ? `${existing.trim()}\n${trimmed}` : trimmed;
}

function CommentField({
  label,
  savedComment,
  emptyLabel,
  canEdit,
  onSend,
  actionBusy,
  placeholder,
  tone = 'default',
  inputKind = 'inspection_comment',
}: {
  label: string;
  savedComment: string;
  emptyLabel: string;
  canEdit: boolean;
  onSend?: (message: string) => void | Promise<void>;
  actionBusy?: boolean;
  placeholder?: string;
  tone?: 'staff' | 'agent' | 'default';
  inputKind?: 'internal_note' | 'inspection_comment';
}) {
  const [draft, setDraft] = useState('');

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || actionBusy || !onSend) return;
    await onSend(trimmed);
    setDraft('');
  };

  const toneClasses =
    tone === 'staff'
      ? 'border-sky-200/80 bg-sky-50/50'
      : tone === 'agent'
        ? 'border-emerald-200/80 bg-emerald-50/40'
        : 'border-border/60 bg-muted/20';

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${toneClasses}`}>
      <p className="text-[11px] font-semibold tracking-tight text-foreground/90">{label}</p>
      <p
        className={`mt-1.5 min-h-[2.5rem] text-xs leading-relaxed whitespace-pre-wrap ${
          savedComment.trim() ? 'text-foreground/80' : 'text-muted-foreground italic'
        }`}
      >
        {savedComment.trim() || emptyLabel}
      </p>
      {canEdit ? (
        <div className="mt-2.5 flex gap-2 border-t border-border/40 pt-2.5">
          <Input
            className="h-9 flex-1 border-border/60 bg-background text-xs shadow-sm"
            inputKind={inputKind}
            value={draft}
            placeholder={placeholder}
            disabled={actionBusy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 shrink-0 gap-1 border-border/60 text-xs shadow-sm"
            disabled={actionBusy || !draft.trim()}
            onClick={() => void handleSend()}
          >
            <Send className="size-3.5" />
            Send
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ResponsibilityAgentAcknowledgment({
  acknowledged,
  acknowledgedAt,
  canAcknowledge = false,
  onAcknowledge,
  actionBusy = false,
}: {
  acknowledged?: boolean | null;
  acknowledgedAt?: string | null;
  canAcknowledge?: boolean;
  onAcknowledge?: (accepted: boolean) => void | Promise<void>;
  actionBusy?: boolean;
}) {
  const answered = typeof acknowledged === 'boolean';

  const containerClass = !answered
    ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-200/60'
    : acknowledged
      ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-200/60'
      : 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-200/60';

  return (
    <div className={`mt-3 rounded-xl border-2 px-4 py-3 ${containerClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-tight">Agent acknowledgment</p>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Confirm whether you agree with this responsibility list (Yes or No).
          </p>
          {answered && acknowledgedAt ? (
            <p className="mt-1.5 text-[10px] font-medium">
              {acknowledged ? 'Agreed' : 'Disagreed'} · {formatDateTime(acknowledgedAt)}
            </p>
          ) : null}
        </div>
        {canAcknowledge ? (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant={acknowledged === true ? 'default' : 'outline'}
              className={
                acknowledged === true
                  ? 'h-9 gap-1.5 border-transparent bg-emerald-600 px-4 text-xs text-white hover:bg-emerald-600'
                  : 'h-9 gap-1.5 px-4 text-xs'
              }
              disabled={actionBusy}
              onClick={() => void onAcknowledge?.(true)}
            >
              <CheckCircle2 className="size-3.5" />
              Yes
            </Button>
            <Button
              type="button"
              size="sm"
              variant={acknowledged === false ? 'default' : 'outline'}
              className={
                acknowledged === false
                  ? 'h-9 gap-1.5 border-transparent bg-rose-600 px-4 text-xs text-white hover:bg-rose-600'
                  : 'h-9 gap-1.5 px-4 text-xs'
              }
              disabled={actionBusy}
              onClick={() => void onAcknowledge?.(false)}
            >
              <XCircle className="size-3.5" />
              No
            </Button>
          </div>
        ) : answered ? (
          <span
            className={
              acknowledged
                ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm'
                : 'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-600 bg-rose-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm'
            }
          >
            {acknowledged ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Yes — Agreed
              </>
            ) : (
              <>
                <XCircle className="size-3.5" />
                No — Disagreed
              </>
            )}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full border-2 border-amber-500 bg-amber-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-900 shadow-sm">
            Pending agent response
          </span>
        )}
      </div>
    </div>
  );
}

function ResponsibilityCommentsBlock({
  staffComment = '',
  agentComment = '',
  onSendStaffComment,
  onSendAgentComment,
  canEditStaffComment = false,
  canEditAgentComment = false,
  actionBusy = false,
  agentCommentLabel = 'Agent comments',
}: {
  staffComment?: string;
  agentComment?: string;
  onSendStaffComment?: (message: string) => void | Promise<void>;
  onSendAgentComment?: (message: string) => void | Promise<void>;
  canEditStaffComment?: boolean;
  canEditAgentComment?: boolean;
  actionBusy?: boolean;
  agentCommentLabel?: string;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <MessageSquare className="text-muted-foreground size-3.5" />
        <p className="text-xs font-semibold text-foreground/80">Comments</p>
      </div>
      <CommentField
        label="CROSSUB staff notes"
        savedComment={staffComment}
        emptyLabel="No staff notes yet."
        canEdit={canEditStaffComment}
        onSend={onSendStaffComment}
        actionBusy={actionBusy}
        placeholder="Add a staff note…"
        tone="staff"
        inputKind="internal_note"
      />
      <CommentField
        label={agentCommentLabel}
        savedComment={agentComment}
        emptyLabel="No agent comments yet."
        canEdit={canEditAgentComment}
        onSend={onSendAgentComment}
        actionBusy={actionBusy}
        placeholder="Add a comment…"
        tone="agent"
        inputKind="inspection_comment"
      />
    </div>
  );
}

function CompareResponsibilitySection({
  title,
  description,
  items,
  onChange,
  onEmail,
  emailHint,
  emailButtonLabel = 'Email',
  emailSentLabel = 'Email sent',
  emailSent = false,
  actionBusy = false,
  readOnly = false,
  emptyReadOnlyMessage = 'No items recorded yet.',
  staffComment = '',
  agentComment = '',
  onSendStaffComment,
  onSendAgentComment,
  canEditStaffComment = false,
  canEditAgentComment = false,
  showEmailButton = true,
  responsibilityAcknowledged = null,
  responsibilityAcknowledgedAt = null,
  canAcknowledgeResponsibility = false,
  onAcknowledgeResponsibility,
  showResponsibilityAcknowledgment = true,
}: {
  title: string;
  description?: string;
  items: ReportComparisonRepairItem[];
  onChange: (items: ReportComparisonRepairItem[]) => void;
  onEmail: () => void;
  emailHint: string;
  emailButtonLabel?: string;
  emailSentLabel?: string;
  emailSent?: boolean;
  actionBusy?: boolean;
  readOnly?: boolean;
  emptyReadOnlyMessage?: string;
  staffComment?: string;
  agentComment?: string;
  onSendStaffComment?: (message: string) => void | Promise<void>;
  onSendAgentComment?: (message: string) => void | Promise<void>;
  canEditStaffComment?: boolean;
  canEditAgentComment?: boolean;
  showEmailButton?: boolean;
  responsibilityAcknowledged?: boolean | null;
  responsibilityAcknowledgedAt?: string | null;
  canAcknowledgeResponsibility?: boolean;
  onAcknowledgeResponsibility?: (accepted: boolean) => void | Promise<void>;
  showResponsibilityAcknowledgment?: boolean;
}) {
  const updateRow = (index: number, patch: Partial<ReportComparisonRepairItem>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...items, emptyRepairItem()]);
  };

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-[11px]">{description}</p>
        ) : null}
      </div>
      <div className="p-4">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className={`${REPAIR_COL_INDEX} px-3 py-2 font-semibold`}>#</th>
                <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className={REPAIR_COL_ACTION} />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-3 py-4 text-center">
                    {readOnly ? emptyReadOnlyMessage : 'No items yet.'}
                  </td>
                </tr>
              ) : readOnly ? (
                items.map((row, index) => (
                  <tr key={repairRowKey(row, `${title}-${index}`)} className="border-t align-top">
                    <td className={`${REPAIR_COL_INDEX} px-3 py-2 tabular-nums`}>{index + 1}</td>
                    <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{row.description}</td>
                    <td className={REPAIR_COL_ACTION} />
                  </tr>
                ))
              ) : (
                items.map((row, index) => (
                  <tr key={repairRowKey(row, `${title}-${index}`)} className="border-t align-top">
                    <td className={`${REPAIR_COL_INDEX} px-3 py-2 tabular-nums`}>{index + 1}</td>
                    <td className={`${REPAIR_COL_AREA} px-3 py-2`}>
                      <Input
                        className="h-8 text-xs"
                        value={row.area}
                        placeholder="Area"
                        onChange={(e) => updateRow(index, { area: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Textarea
                        className="min-h-[4.5rem] text-xs leading-relaxed"
                        inputKind="contractor_quote_note"
                        value={row.description}
                        placeholder="Description"
                        onChange={(e) => updateRow(index, { description: e.target.value })}
                      />
                    </td>
                    <td className={`${REPAIR_COL_ACTION} px-2 py-2`}>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled={actionBusy}
                        onClick={() => removeRow(index)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!readOnly ? (
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              disabled={actionBusy}
              onClick={addRow}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-[10px]">View only — maintained by CROSSUB staff</p>
        )}
        {showResponsibilityAcknowledgment ? (
          <ResponsibilityAgentAcknowledgment
            acknowledged={responsibilityAcknowledged}
            acknowledgedAt={responsibilityAcknowledgedAt}
            canAcknowledge={canAcknowledgeResponsibility}
            onAcknowledge={onAcknowledgeResponsibility}
            actionBusy={actionBusy}
          />
        ) : null}
        <ResponsibilityCommentsBlock
          staffComment={staffComment}
          agentComment={agentComment}
          onSendStaffComment={onSendStaffComment}
          onSendAgentComment={onSendAgentComment}
          canEditStaffComment={canEditStaffComment}
          canEditAgentComment={canEditAgentComment}
          actionBusy={actionBusy}
          agentCommentLabel={canEditAgentComment ? 'Your comments' : 'Agent comments'}
        />
        {showEmailButton ? (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant={emailSent ? 'default' : 'secondary'}
              className={
                emailSent
                  ? 'h-8 gap-1.5 border-transparent bg-emerald-600 text-xs text-white hover:bg-emerald-600 disabled:opacity-100'
                  : 'h-8 gap-1.5 text-xs'
              }
              disabled={actionBusy || emailSent}
              onClick={onEmail}
              title={emailSent ? 'Email already sent' : emailHint}
            >
              <Mail className="size-3.5" />
              {emailSent ? emailSentLabel : emailButtonLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function QuoteResponsibilitySection({
  title,
  items,
  contractors,
  agencyId,
  onContractorsChange,
  onChange,
  readOnly = false,
  lockedHint,
  busy = false,
  staffComment = '',
  agentComment = '',
  onSendStaffComment,
  onSendAgentComment,
  canEditStaffComment = false,
  canEditAgentComment = false,
  showQuoteColumns = true,
  hideQuoteColumns = false,
  hideQuoteAmountColumn = false,
  maintenanceColumnMode = 'hidden',
  tenantReviewPending = false,
  tableFooter,
}: {
  title: string;
  items: ReportComparisonRepairItem[];
  contractors: PreferredContractor[];
  agencyId: string | null | undefined;
  onContractorsChange: (contractors: PreferredContractor[]) => void;
  onChange: (items: ReportComparisonRepairItem[]) => void;
  readOnly?: boolean;
  lockedHint?: string;
  busy?: boolean;
  staffComment?: string;
  agentComment?: string;
  onSendStaffComment?: (message: string) => void | Promise<void>;
  onSendAgentComment?: (message: string) => void | Promise<void>;
  canEditStaffComment?: boolean;
  canEditAgentComment?: boolean;
  /** @deprecated Prefer `hideQuoteColumns`. */
  showQuoteColumns?: boolean;
  hideQuoteColumns?: boolean;
  hideQuoteAmountColumn?: boolean;
  maintenanceColumnMode?: MaintenanceColumnMode;
  tenantReviewPending?: boolean;
  tableFooter?: ReactNode;
}) {
  const showQuoteCols = hideQuoteColumns === true ? false : showQuoteColumns !== false;
  const showMaintenanceColumn = maintenanceColumnMode !== 'hidden';

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {readOnly && lockedHint ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
            <Lock className="size-3" />
            {lockedHint}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <RepairItemsTable
          title=""
          hideTitle
          showAddRow={false}
          items={items}
          contractors={contractors}
          agencyId={agencyId}
          onContractorsChange={onContractorsChange}
          onChange={onChange}
          readOnly={readOnly}
          busy={busy}
          hideQuoteColumns={!showQuoteCols}
          hideQuoteAmountColumn={hideQuoteAmountColumn}
          maintenanceColumnMode={maintenanceColumnMode}
          tenantReviewPending={tenantReviewPending}
        />
        {readOnly ? (
          <p className="text-muted-foreground mt-2 text-[10px]">
            {lockedHint ?? 'View only — quotes maintained by CROSSUB staff'}
          </p>
        ) : null}
        <ResponsibilityCommentsBlock
          staffComment={staffComment}
          agentComment={agentComment}
          onSendStaffComment={onSendStaffComment}
          onSendAgentComment={onSendAgentComment}
          canEditStaffComment={canEditStaffComment}
          canEditAgentComment={canEditAgentComment}
          actionBusy={busy}
          agentCommentLabel={canEditAgentComment ? 'Your comments' : 'Agent comments'}
        />
        {tableFooter ? (
          <div className="mt-3 flex justify-end">{tableFooter}</div>
        ) : null}
      </div>
    </section>
  );
}

function emptyRepairItem(): ReportComparisonRepairItem {
  return {
    area: '',
    description: '',
    quote: '',
    handymanId: null,
    handymanName: '',
    localKey: crypto.randomUUID(),
  };
}

function maintenanceQuoteNote(row: ReportComparisonRepairItem): string | null {
  if (!row.maintenanceRequestId?.trim() || !row.quote?.trim() || !row.handymanName?.trim()) {
    return null;
  }
  return `Quoted from (maintenance job)`;
}

function rowUsesMaintenanceBackedQuote(row: ReportComparisonRepairItem): boolean {
  return Boolean(row.maintenanceRequestId?.trim());
}

function MaintenanceQuoteCell({ row }: { row: ReportComparisonRepairItem }) {
  const note = maintenanceQuoteNote(row);
  return (
    <div>
      <span className="tabular-nums">{row.quote || '—'}</span>
      {note ? (
        <p className="text-muted-foreground mt-1 text-[10px] leading-snug">{note}</p>
      ) : null}
    </div>
  );
}

type RepairRow = ReportComparisonRepairItem & { localKey?: string };

function repairRowKey(row: RepairRow, fallback: string): string {
  return row.localKey ?? fallback;
}

function withRepairRowKeys(items: ReportComparisonRepairItem[]): RepairRow[] {
  return items.map((item) =>
    (item as RepairRow).localKey
      ? (item as RepairRow)
      : { ...item, localKey: crypto.randomUUID() },
  );
}

function hasRepairContent(item: ReportComparisonRepairItem): boolean {
  return Boolean(
    item.area.trim() ||
      item.description.trim() ||
      item.quote?.trim() ||
      item.handymanName?.trim() ||
      item.handymanId,
  );
}

function normalizeRepairItems(
  items: ReportComparisonRepairItem[],
  contractors: PreferredContractor[] = [],
): ReportComparisonRepairItemInput[] {
  return items.filter(hasRepairContent).map((item) => {
    const handymanId = item.handymanId || undefined;
    let handymanName = item.handymanName?.trim() || undefined;
    if (!handymanName && handymanId) {
      handymanName = contractors.find((c) => c.id === handymanId)?.name.trim() || undefined;
    }
    return {
      area: item.area.trim(),
      description: item.description.trim(),
      quote: item.quote?.trim() || undefined,
      handymanId,
      handymanName,
    };
  });
}

function normalizeBondAckRepairItems(
  items: ReportComparisonRepairItem[],
  contractors: PreferredContractor[] = [],
): ReportComparisonRepairItemInput[] {
  return items.filter(hasRepairContent).map((item) => ({
    ...normalizeRepairItems([item], contractors)[0]!,
    bondDeductible: item.bondDeductible === true,
    landlordWaivable: item.landlordWaivable === true,
    bondDeductionStaffComment: item.bondDeductionStaffComment?.trim() || undefined,
    bondDeductionAgentComment: item.bondDeductionAgentComment?.trim() || undefined,
  }));
}

/** Prefer local draft rows while the user is still typing (autosave responses can be stale). */
function mergeRepairItemsAfterSave(
  local: ReportComparisonRepairItem[],
  server: ReportComparisonRepairItem[],
): ReportComparisonRepairItem[] {
  if (local.length === 0) return withRepairRowKeys(server);
  if (server.length === 0) return local;

  const serverKeys = new Set(
    server.map((item) => `${item.area.trim()}|${item.description.trim()}`),
  );
  const unmatchedLocal = local.filter((item) => {
    const key = `${item.area.trim()}|${item.description.trim()}`;
    if (!hasRepairContent(item)) return true;
    return !serverKeys.has(key);
  });

  return [...withRepairRowKeys(server), ...unmatchedLocal];
}

function contractorOptionLabel(contractor: PreferredContractor): string {
  const parts = [contractor.name];
  if (contractor.phone?.trim()) parts.push(contractor.phone.trim());
  else if (contractor.email?.trim()) parts.push(contractor.email.trim());
  if (contractor.serviceTypes.length > 0) {
    parts.push(contractor.serviceTypes.slice(0, 2).join(', '));
  }
  return parts.join(' · ');
}

function HandymanField({
  row,
  contractors,
  agencyId,
  onContractorsChange,
  onChange,
}: {
  row: ReportComparisonRepairItem;
  contractors: PreferredContractor[];
  agencyId: string | null | undefined;
  onContractorsChange: (contractors: PreferredContractor[]) => void;
  onChange: (patch: Partial<ReportComparisonRepairItem>) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const matchedById = row.handymanId
    ? contractors.find((c) => c.id === row.handymanId)
    : null;
  const matchedByName =
    !matchedById && row.handymanName?.trim()
      ? contractors.find(
          (c) => c.name.trim().toLowerCase() === row.handymanName!.trim().toLowerCase(),
        )
      : null;
  const selectValue = matchedById?.id ?? matchedByName?.id ?? (row.handymanId || '');

  const handleCreated = (contractor: PreferredContractor) => {
    const exists = contractors.some((c) => c.id === contractor.id);
    onContractorsChange(exists ? contractors : [...contractors, contractor]);
    onChange({ handymanId: contractor.id, handymanName: contractor.name });
  };

  return (
    <>
      <select
        className="border-input bg-background h-8 w-full min-w-[160px] rounded-md border px-2 text-xs"
        value={selectValue}
        onChange={(e) => {
          const value = e.target.value;
          if (value === '__add_new__') {
            setAddOpen(true);
            return;
          }
          if (!value) {
            onChange({ handymanId: null, handymanName: '' });
            return;
          }
          const contractor = contractors.find((c) => c.id === value);
          onChange({
            handymanId: value,
            handymanName: contractor?.name ?? '',
          });
        }}
      >
        <option value="">Select handyman</option>
        {contractors.map((contractor) => (
          <option key={contractor.id} value={contractor.id}>
            {contractorOptionLabel(contractor)}
          </option>
        ))}
        <option value="__add_new__">Add new handyman…</option>
      </select>
      {!selectValue && row.handymanName?.trim() ? (
        <p className="text-muted-foreground text-[10px]">Saved as: {row.handymanName}</p>
      ) : null}
      <AddHandymanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        agencyId={agencyId}
        onCreated={handleCreated}
      />
    </>
  );
}

function RepairItemsTable({
  title,
  items,
  contractors,
  agencyId,
  onContractorsChange,
  onChange,
  footerAction,
  readOnly = false,
  lockedHint,
  hideQuoteColumns = false,
  hideQuoteAmountColumn = false,
  hideTitle = false,
  showAddRow = true,
  busy = false,
  maintenanceColumnMode = 'hidden',
  tenantReviewPending = false,
}: {
  title: string;
  items: ReportComparisonRepairItem[];
  contractors: PreferredContractor[];
  agencyId: string | null | undefined;
  onContractorsChange: (contractors: PreferredContractor[]) => void;
  onChange: (items: ReportComparisonRepairItem[]) => void;
  footerAction?: React.ReactNode;
  readOnly?: boolean;
  lockedHint?: string;
  hideQuoteColumns?: boolean;
  hideQuoteAmountColumn?: boolean;
  hideTitle?: boolean;
  showAddRow?: boolean;
  busy?: boolean;
  maintenanceColumnMode?: MaintenanceColumnMode;
  tenantReviewPending?: boolean;
}) {
  const showMaintenanceColumn = maintenanceColumnMode !== 'hidden';
  const showQuoteAmountColumn = !hideQuoteColumns && !hideQuoteAmountColumn;
  const showCompanyColumn = !hideQuoteColumns;
  const quoteColumnCount = showQuoteAmountColumn && showCompanyColumn ? 2 : showCompanyColumn ? 1 : 0;

  const updateRow = (index: number, patch: Partial<ReportComparisonRepairItem>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...items, emptyRepairItem()]);
  };

  return (
    <div className="space-y-2">
      {!hideTitle ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          {readOnly && lockedHint ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
              <Lock className="size-3" />
              {lockedHint}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className={`${REPAIR_COL_INDEX} px-3 py-2 font-semibold`}>#</th>
              <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              {!hideQuoteColumns ? (
                <>
                  {showQuoteAmountColumn ? (
                    <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>$</th>
                  ) : null}
                  {showCompanyColumn ? (
                    <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Contractor</th>
                  ) : null}
                </>
              ) : null}
              {showMaintenanceColumn ? (
                <th className="px-3 py-2 font-semibold">Maintenance</th>
              ) : null}
              {!readOnly ? <th className={REPAIR_COL_ACTION} /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    3 +
                    quoteColumnCount +
                    (showMaintenanceColumn ? 1 : 0) +
                    (readOnly ? 0 : 1)
                  }
                  className="text-muted-foreground px-3 py-4 text-center"
                >
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t align-top">
                  <td className={`${REPAIR_COL_INDEX} px-3 py-2 tabular-nums`}>{index + 1}</td>
                  {readOnly ? (
                    <>
                      <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area || '—'}</td>
                      <td className="px-3 py-2 whitespace-pre-wrap leading-relaxed">
                        {row.description || '—'}
                      </td>
                      {!hideQuoteColumns ? (
                        <>
                          {showQuoteAmountColumn ? (
                            <td className={`${REPAIR_COL_QUOTE} px-3 py-2`}>
                              <MaintenanceQuoteCell row={row} />
                            </td>
                          ) : null}
                          {showCompanyColumn ? (
                            <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>
                              {row.handymanName || '—'}
                            </td>
                          ) : null}
                        </>
                      ) : null}
                      {showMaintenanceColumn ? (
                        <MaintenanceReviewStatusCell row={row} reviewPending={tenantReviewPending} />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <td className={`${REPAIR_COL_AREA} px-3 py-2`}>
                        <Input
                          className="h-8 text-xs"
                          value={row.area}
                          placeholder="Area"
                          disabled={busy}
                          onChange={(e) => updateRow(index, { area: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Textarea
                          className="min-h-[4.5rem] text-xs leading-relaxed"
                          inputKind="contractor_quote_note"
                          value={row.description}
                          placeholder="Description"
                          disabled={busy}
                          onChange={(e) => updateRow(index, { description: e.target.value })}
                        />
                      </td>
                      {!hideQuoteColumns ? (
                        <>
                          {showQuoteAmountColumn ? (
                            <td className={`${REPAIR_COL_QUOTE} px-3 py-2`}>
                              {rowUsesMaintenanceBackedQuote(row) ? (
                                <MaintenanceQuoteCell row={row} />
                              ) : (
                                <>
                                  <Input
                                    className="h-8 text-xs"
                                    value={row.quote ?? ''}
                                    placeholder="$0.00"
                                    disabled={busy}
                                    onChange={(e) => updateRow(index, { quote: e.target.value })}
                                  />
                                  {maintenanceQuoteNote(row) ? (
                                    <p className="text-muted-foreground mt-1 text-[10px] leading-snug">
                                      {maintenanceQuoteNote(row)}
                                    </p>
                                  ) : null}
                                </>
                              )}
                            </td>
                          ) : null}
                          {showCompanyColumn ? (
                            <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>
                              {rowUsesMaintenanceBackedQuote(row) ? (
                                <span className="text-muted-foreground">{row.handymanName || '—'}</span>
                              ) : (
                                <HandymanField
                                  row={row}
                                  contractors={contractors}
                                  agencyId={agencyId}
                                  onContractorsChange={onContractorsChange}
                                  onChange={(patch) => updateRow(index, patch)}
                                />
                              )}
                            </td>
                          ) : null}
                        </>
                      ) : null}
                      {showMaintenanceColumn ? (
                        <MaintenanceReviewStatusCell row={row} reviewPending={tenantReviewPending} />
                      ) : null}
                      <td className={`${REPAIR_COL_ACTION} px-2 py-2`}>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          disabled={busy}
                          onClick={() => removeRow(index)}
                          aria-label="Remove row"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && showAddRow ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            disabled={busy}
            onClick={addRow}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        ) : null}
        {footerAction}
      </div>
    </div>
  );
}

function InspectorSyncedResponsibilityTable({
  title,
  items,
  showQuoteColumns = false,
}: {
  title: string;
  items: ReportComparisonRepairItem[];
  showQuoteColumns?: boolean;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          Synced from the inspector outgoing report — read only.
        </p>
      </div>
      <div className="p-4">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className={`${REPAIR_COL_INDEX} px-3 py-2 font-semibold`}>#</th>
                <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                {showQuoteColumns ? (
                  <>
                    <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
                    <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Company</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={showQuoteColumns ? 5 : 3}
                    className="text-muted-foreground px-3 py-4 text-center"
                  >
                    No tenant-responsible items on the outgoing inspection report yet.
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr key={repairRowKey(row, `inspector-${index}`)} className="border-t align-top">
                    <td className={`${REPAIR_COL_INDEX} px-3 py-2 tabular-nums`}>{index + 1}</td>
                    <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{row.description}</td>
                    {showQuoteColumns ? (
                      <>
                        <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                          {row.quote || '—'}
                        </td>
                        <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>
                          {row.handymanName || '—'}
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function EndLeasingReportComparisonPanel({
  caseData,
  mode = 'compare',
}: {
  caseData: TerminationCaseDetail;
  mode?: 'compare' | 'quote' | 'tenant-response' | 'inspector-readonly';
}) {
  const { apiConnected, properties } = useAgentData();
  const applyCase = useEndLeasingStore((s) => s.applyCase);

  const property = useMemo(
    () => properties.find((p) => p.id === caseData.propertyId) ?? null,
    [properties, caseData.propertyId],
  );
  const agencyId = property?.agencyId;

  const [contractors, setContractors] = useState<PreferredContractor[]>([]);

  const outgoingId = caseData.inspection.inspectionId ?? null;
  const ingoingId = caseData.inspection.ingoingInspectionId ?? null;

  const [outgoingDetail, setOutgoingDetail] = useState<InspectionDetail | null>(null);
  const [ingoingDetail, setIngoingDetail] = useState<InspectionDetail | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const [tenantItems, setTenantItems] = useState<ReportComparisonRepairItem[]>(
    caseData.reportComparison.tenantResponsibility,
  );
  const [landlordItems, setLandlordItems] = useState<ReportComparisonRepairItem[]>(
    caseData.reportComparison.landlordResponsibility,
  );
  const [tenantStaffComment, setTenantStaffComment] = useState(
    caseData.reportComparison.tenantResponsibilityStaffComment ?? '',
  );
  const [landlordStaffComment, setLandlordStaffComment] = useState(
    caseData.reportComparison.landlordResponsibilityStaffComment ?? '',
  );
  const [tenantAgentComment, setTenantAgentComment] = useState(
    caseData.reportComparison.tenantResponsibilityAgentComment ?? '',
  );
  const [landlordAgentComment, setLandlordAgentComment] = useState(
    caseData.reportComparison.landlordResponsibilityAgentComment ?? '',
  );
  const [busy, setBusy] = useState(false);
  const [sendQuotationDialogOpen, setSendQuotationDialogOpen] = useState(false);
  const [sendLandlordQuotationDialogOpen, setSendLandlordQuotationDialogOpen] = useState(false);
  const [tenantQuotationSentDialogOpen, setTenantQuotationSentDialogOpen] = useState(false);
  const [landlordQuotationSentDialogOpen, setLandlordQuotationSentDialogOpen] = useState(false);

  const refreshReports = useCallback(async () => {
    if (!apiConnected) return;
    setLoadingReports(true);
    try {
      const [outgoing, ingoing] = await Promise.all([
        outgoingId ? inspectionsApi.getDetail(outgoingId).catch(() => null) : Promise.resolve(null),
        resolveCompareIngoingDetail({
          ingoingInspectionId: ingoingId,
          propertyId: caseData.propertyId,
        }),
      ]);
      setOutgoingDetail(outgoing);
      setIngoingDetail(ingoing);
    } finally {
      setLoadingReports(false);
    }
  }, [apiConnected, caseData.propertyId, outgoingId, ingoingId]);

  useEffect(() => {
    void refreshReports();
  }, [refreshReports]);

  useEffect(() => {
    if (!apiConnected || !agencyId) {
      setContractors([]);
      return;
    }
    void fetchPreferredContractors(agencyId)
      .then(setContractors)
      .catch(() => setContractors([]));
  }, [apiConnected, agencyId]);

  useEffect(() => {
    setTenantItems(withRepairRowKeys(caseData.reportComparison.tenantResponsibility));
    setLandlordItems(withRepairRowKeys(caseData.reportComparison.landlordResponsibility));
    setTenantStaffComment(caseData.reportComparison.tenantResponsibilityStaffComment ?? '');
    setLandlordStaffComment(caseData.reportComparison.landlordResponsibilityStaffComment ?? '');
    setTenantAgentComment(caseData.reportComparison.tenantResponsibilityAgentComment ?? '');
    setLandlordAgentComment(caseData.reportComparison.landlordResponsibilityAgentComment ?? '');
    // Only reset draft rows when opening a different case — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caseData.reportComparison is read at case switch
  }, [caseData.id]);

  const saveAgentComments = async (
    comments: { tenant: string; landlord: string },
    silent = false,
  ) => {
    if (!silent) setBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(caseData.id, {
        tenantResponsibilityAgentComment: comments.tenant,
        landlordResponsibilityAgentComment: comments.landlord,
      });
      applyCase(updated);
      if (!silent) toast.success('Comments saved');
      return updated;
    } catch (err) {
      if (!silent) toast.error(apiErrorMessage(err));
      throw err;
    } finally {
      if (!silent) setBusy(false);
    }
  };

  const sendAgentComment = async (section: 'tenant' | 'landlord', message: string) => {
    const current = section === 'tenant' ? tenantAgentComment : landlordAgentComment;
    const next = appendCommentLine(current, message);
    const nextTenant = section === 'tenant' ? next : tenantAgentComment;
    const nextLandlord = section === 'landlord' ? next : landlordAgentComment;
    if (section === 'tenant') setTenantAgentComment(next);
    else setLandlordAgentComment(next);
    setBusy(true);
    try {
      await saveAgentComments({ tenant: nextTenant, landlord: nextLandlord }, true);
    } catch {
      if (section === 'tenant') setTenantAgentComment(current);
      else setLandlordAgentComment(current);
    } finally {
      setBusy(false);
    }
  };

  const acknowledgeResponsibility = async (section: 'tenant' | 'landlord', accepted: boolean) => {
    setBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(caseData.id, {
        ...(section === 'tenant'
          ? { tenantResponsibilityAgentAcknowledged: accepted }
          : { landlordResponsibilityAgentAcknowledged: accepted }),
      });
      applyCase(updated);
      toast.success(
        accepted
          ? `${section === 'tenant' ? 'Tenant' : 'Landlord'} responsibility agreed`
          : `${section === 'tenant' ? 'Tenant' : 'Landlord'} responsibility marked as disagreed`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const persist = async (
    patch: Parameters<typeof terminationApi.updateReportComparison>[1],
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent ?? false;
    if (!silent) setBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(caseData.id, patch);
      applyCase(updated);
      if (!silent) {
        setTenantItems((prev) =>
          mergeRepairItemsAfterSave(prev, updated.reportComparison.tenantResponsibility),
        );
        setLandlordItems((prev) =>
          mergeRepairItemsAfterSave(prev, updated.reportComparison.landlordResponsibility),
        );
      }
      if (!silent) toast.success('Comparison updated');
      return updated;
    } catch (err) {
      if (!silent) toast.error(apiErrorMessage(err));
      throw err;
    } finally {
      if (!silent) setBusy(false);
    }
  };

  const saveRepairItems = async (silent = false, includeComments = false) => {
    const rcNow = caseData.reportComparison;
    const tenantLocked =
      Boolean(rcNow.tenantRepairQuoteEmail?.sentAt) &&
      (rcNow.tenantQuoteResponse === 'pending' ||
        rcNow.tenantQuoteResponse === 'accepted' ||
        !rcNow.tenantQuoteResponse);
    const patch: Parameters<typeof terminationApi.updateReportComparison>[1] = {
      landlordResponsibility: normalizeRepairItems(landlordItems, contractors),
    };
    if (!tenantLocked) {
      patch.tenantResponsibility = normalizeRepairItems(tenantItems, contractors);
    }
    if (includeComments) {
      patch.tenantResponsibilityAgentComment = tenantAgentComment;
      patch.landlordResponsibilityAgentComment = landlordAgentComment;
    }
    await persist(patch, { silent });
  };

  const confirmAgentComparison = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(caseData.id, {
        agentAcknowledged: true,
      });
      applyCase(updated);
      toast.success('Ingoing/outgoing comparison confirmed');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendComparisonSummary = async (
    audience: 'tenant' | 'landlord_property_update',
  ) => {
    setBusy(true);
    try {
      await saveAgentComments(
        { tenant: tenantAgentComment, landlord: landlordAgentComment },
        true,
      );
      const updated = await terminationApi.sendComparisonSummaryEmail(caseData.id, audience);
      applyCase(updated);
      setTenantItems((prev) =>
        mergeRepairItemsAfterSave(prev, updated.reportComparison.tenantResponsibility),
      );
      setLandlordItems((prev) =>
        mergeRepairItemsAfterSave(prev, updated.reportComparison.landlordResponsibility),
      );
      toast.success(
        audience === 'tenant'
          ? 'Tenant responsibility summary sent'
          : 'Property update sent to landlord',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendTenantBondAcknowledgement = async (ackItems: ReportComparisonRepairItem[]) => {
    setBusy(true);
    try {
      const updated = await terminationApi.sendTenantBondDeductionAcknowledgement(
        caseData.id,
        normalizeBondAckRepairItems(ackItems, contractors),
      );
      applyUpdatedCase(updated);
      setSendQuotationDialogOpen(false);
      setTenantQuotationSentDialogOpen(true);
      toast.success('Quotation sent to tenant');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const respondAgentLandlordQuote = async (
    response: 'approved' | 'declined',
    reason?: string,
  ) => {
    setBusy(true);
    try {
      const updated = await terminationApi.respondAgentLandlordQuote(caseData.id, {
        response,
        reason,
      });
      applyUpdatedCase(updated);
      toast.success(
        response === 'approved'
          ? 'Landlord quotation approved — you can send to tenant'
          : 'Landlord quotation declined — CROSSUB will re-send',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openSendQuotationDialog = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.syncMaintenanceQuotesFromJobs(caseData.id);
      applyUpdatedCase(updated);
      setSendQuotationDialogOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openSendLandlordQuotationDialog = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.syncMaintenanceQuotesFromJobs(caseData.id);
      applyUpdatedCase(updated);
      setSendLandlordQuotationDialogOpen(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendLandlordQuotation = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.sendRepairQuoteEmail(caseData.id, 'landlord');
      applyUpdatedCase(updated);
      setSendLandlordQuotationDialogOpen(false);
      setLandlordQuotationSentDialogOpen(true);
      toast.success('Landlord quotation sent');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyUpdatedCase = (updated: TerminationCaseDetail) => {
    applyCase(updated);
    setTenantItems((prev) =>
      mergeRepairItemsAfterSave(prev, updated.reportComparison.tenantResponsibility),
    );
    setLandlordItems((prev) =>
      mergeRepairItemsAfterSave(prev, updated.reportComparison.landlordResponsibility),
    );
  };

  const checkTenantReply = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.syncTenantQuoteResponse(caseData.id);
      applyUpdatedCase(updated);
      const response = updated.reportComparison.tenantQuoteResponse;
      if (response === 'accepted') {
        toast.success('Tenant replied Yes — maintenance quotation and bond summary updated');
      } else if (response === 'declined') {
        toast.message('Tenant replied No — tenant items are editable again');
      } else {
        toast.message('No Yes/No reply found in the email thread yet');
      }
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const recordTenantAgree = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.acceptTenantRepairQuote(caseData.id);
      applyUpdatedCase(updated);
      toast.success('Recorded Yes — tenant agrees with repair quote');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const recordTenantDisagree = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.declineTenantRepairQuote(caseData.id);
      applyUpdatedCase(updated);
      toast.message('Recorded No — tenant items are editable again');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const rc = caseData.reportComparison;
  const tenantBondAckSent = Boolean(rc.tenantBondDeductionAckEmail?.sentAt);
  const agentBondProposalSent = Boolean(rc.agentBondDeductionProposalEmail?.sentAt);
  const tenantQuoteEmailSent =
    Boolean(rc.tenantRepairQuoteEmail?.sentAt) || tenantBondAckSent;
  const tenantAgreed = rc.tenantQuoteResponse === 'accepted';
  const showCompare = mode === 'compare';
  const showQuote = mode === 'quote';
  const showTenantResponse = mode === 'tenant-response';
  const showInspectorReadonly = mode === 'inspector-readonly';

  const tenantResponsibilityReviewStatus = deriveTenantResponsibilityReviewStatus(rc);
  const tenantMaintenanceReady = tenantResponsibilityReviewStatus === 'accepted';
  const landlordMaintenanceReady = rc.landlordResponsibilityAgentAcknowledged === true;
  const endLeasingQuotesReadyForTenant =
    tenantItems.length > 0 &&
    tenantItems.every(
      (item) =>
        Boolean(
          item.maintenanceRequestId?.trim() &&
            item.quote?.trim() &&
            item.handymanName?.trim(),
        ),
    );
  const endLeasingLandlordQuotesReady =
    landlordItems.length > 0 &&
    landlordItems.every(
      (item) =>
        Boolean(
          item.maintenanceRequestId?.trim() &&
            item.quote?.trim() &&
            item.handymanName?.trim(),
        ),
    );
  const landlordQuotationSent = Boolean(rc.landlordRepairQuoteEmail?.sentAt);
  const tenantQuotationSent = tenantBondAckSent || Boolean(rc.tenantRepairQuoteEmail?.sentAt);
  const agentLandlordQuoteResponse = deriveAgentLandlordQuoteResponse(rc);
  const landlordQuoteFromAdmin =
    quoteStepHasLandlordItems(rc) && quoteStepLandlordQuoteSentToAgent(rc);
  const canSendQuotationToTenant =
    canAgentSendTenantQuotation(rc) &&
    endLeasingQuotesReadyForTenant &&
    (!tenantBondAckSent || rc.tenantQuoteResponse === 'declined');
  const canSendLandlordQuotation =
    landlordMaintenanceReady && endLeasingLandlordQuotesReady && !landlordQuotationSent;
  const tenantQuotationButtonEnabled =
    tenantResponsibilityReviewStatus === 'accepted' &&
    (canSendQuotationToTenant ||
      (tenantQuotationSent && rc.tenantQuoteResponse !== 'declined'));
  const landlordQuotationButtonEnabled =
    landlordMaintenanceReady && (canSendLandlordQuotation || landlordQuotationSent);
  const sendQuotationButtonLabel = tenantQuotationSent
    ? rc.tenantQuoteResponse === 'pending'
      ? 'Quotation sent — awaiting tenant'
      : rc.tenantQuoteResponse === 'accepted'
        ? 'Quotation accepted by tenant'
        : rc.tenantQuoteResponse === 'declined'
          ? 'Re-send quotation to tenant'
          : 'Quotation sent to tenant'
    : !agentBondProposalSent
      ? 'Awaiting bond deduction from CROSSUB'
      : quoteStepHasLandlordItems(rc) && !quoteStepLandlordQuoteSentToAgent(rc)
        ? 'Awaiting landlord quotation from CROSSUB'
        : agentLandlordQuoteResponse === 'pending'
          ? 'Approve landlord quotation first'
          : agentLandlordQuoteResponse === 'declined'
            ? 'Awaiting updated landlord quotation'
            : !endLeasingQuotesReadyForTenant
              ? 'Complete maintenance quotes first'
              : 'Send quotation to tenant';
  const sendLandlordQuotationButtonLabel = landlordQuotationSent
    ? 'Quotation sent to landlord'
    : !landlordMaintenanceReady
      ? 'Agree landlord responsibilities first'
      : !endLeasingLandlordQuotesReady
        ? 'Complete maintenance quotes first'
        : 'Send quotation to landlord';

  const handleTenantQuotationButtonClick = () => {
    if (tenantQuotationSent && rc.tenantQuoteResponse !== 'declined') {
      setTenantQuotationSentDialogOpen(true);
      return;
    }
    void openSendQuotationDialog();
  };

  const handleLandlordQuotationButtonClick = () => {
    if (landlordQuotationSent) {
      setLandlordQuotationSentDialogOpen(true);
      return;
    }
    void openSendLandlordQuotationDialog();
  };

  const inspectorReadOnlyItems = useMemo(() => {
    const saved = caseData.reportComparison.tenantResponsibility;
    if (!outgoingDetail) return saved;
    return mergeInspectionResponsibilityItems(
      saved,
      extractTenantResponsibilityFromOutgoing(outgoingDetail),
    );
  }, [caseData.reportComparison.tenantResponsibility, outgoingDetail]);

  useEffect(() => {
    if (!showQuote || !apiConnected) return;
    const tenantSync = tenantResponsibilityReviewStatus === 'accepted';
    const landlordSync = rc.landlordResponsibilityAgentAcknowledged === true;
    if (!tenantSync && !landlordSync) return;
    void terminationApi
      .syncMaintenanceQuotesFromJobs(caseData.id)
      .then((updated) => applyUpdatedCase(updated))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh quotes when entering quote step
  }, [
    apiConnected,
    caseData.id,
    showQuote,
    tenantResponsibilityReviewStatus,
    rc.landlordResponsibilityAgentAcknowledged,
  ]);

  useEffect(() => {
    if (!apiConnected || !tenantQuoteEmailSent || rc.tenantQuoteResponse !== 'pending') return;
    void terminationApi
      .syncTenantQuoteResponse(caseData.id)
      .then((updated) => {
        if (updated.reportComparison.tenantQuoteResponse !== 'pending') {
          applyUpdatedCase(updated);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync once when awaiting reply
  }, [apiConnected, caseData.id, tenantQuoteEmailSent, rc.tenantQuoteResponse]);

  if (showInspectorReadonly) {
    return (
      <InspectorSyncedResponsibilityTable
        title="Tenant responsibility"
        items={inspectorReadOnlyItems}
        showQuoteColumns
      />
    );
  }

  if (showCompare) {
    return (
      <div className="space-y-4">
        <CompareReportsSection
          outgoingDetail={outgoingDetail}
          ingoingDetail={ingoingDetail}
          manualReports={rc.manualInspectionReports ?? []}
          loading={loadingReports}
          agentAcknowledged={rc.agentAcknowledged}
          agentAcknowledgedAt={rc.agentAcknowledgedAt}
          actionBusy={busy}
          caseId={caseData.id}
          onConfirm={() => void confirmAgentComparison()}
          onCaseUpdated={applyUpdatedCase}
        />
        <CompareResponsibilitySection
          title="Tenant responsibility"
          description="Recorded by CROSSUB staff. Email the tenant when ready — they acknowledge the comparison in the tenant app."
          items={tenantItems}
          onChange={setTenantItems}
          readOnly
          actionBusy={busy}
          emptyReadOnlyMessage="No items recorded yet — CROSSUB staff will add these from the admin portal."
          staffComment={tenantStaffComment}
          agentComment={tenantAgentComment}
          onSendAgentComment={(message) => sendAgentComment('tenant', message)}
          canEditAgentComment
          showResponsibilityAcknowledgment={false}
          emailHint="Send tenant responsibility summary to the tenant"
          emailButtonLabel="Email to Tenant"
          emailSentLabel="Email to Tenant sent"
          emailSent={Boolean(rc.tenantComparisonSummaryEmail?.sentAt)}
          onEmail={() => void sendComparisonSummary('tenant')}
        />
        {tenantResponsibilityReviewStatus !== 'none' ? (
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Tenant responsibility review</p>
            <p className="text-muted-foreground text-xs">
              {tenantResponsibilityReviewStatus === 'pending'
                ? 'Awaiting tenant acknowledgement in the tenant app.'
                : tenantResponsibilityReviewStatus === 'accepted'
                  ? 'Tenant acknowledged — CROSSUB can proceed to quotes.'
                  : 'Tenant disagreed — CROSSUB staff will send an updated list.'}
            </p>
            {rc.tenantResponsibilityDeclineReason ? (
              <p className="text-xs whitespace-pre-wrap">
                <span className="font-medium">Tenant reason:</span>{' '}
                {rc.tenantResponsibilityDeclineReason}
              </p>
            ) : null}
          </section>
        ) : null}
        <CompareResponsibilitySection
          title="Landlord responsibility"
          description="Recorded by CROSSUB staff. Acknowledge this list (Yes/No), add comments, then email the landlord property update when ready."
          items={landlordItems}
          onChange={setLandlordItems}
          readOnly
          actionBusy={busy}
          emptyReadOnlyMessage="No items recorded yet — CROSSUB staff will add these from the admin portal."
          staffComment={landlordStaffComment}
          agentComment={landlordAgentComment}
          onSendAgentComment={(message) => sendAgentComment('landlord', message)}
          canEditAgentComment
          responsibilityAcknowledged={rc.landlordResponsibilityAgentAcknowledged ?? null}
          responsibilityAcknowledgedAt={rc.landlordResponsibilityAgentAcknowledgedAt}
          canAcknowledgeResponsibility
          onAcknowledgeResponsibility={(accepted) =>
            acknowledgeResponsibility('landlord', accepted)
          }
          showEmailButton={false}
          emailHint=""
          onEmail={() => undefined}
        />
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            size="sm"
            variant={
              rc.landlordPropertyUpdateEmail?.sentAt ? 'default' : 'secondary'
            }
            className={
              rc.landlordPropertyUpdateEmail?.sentAt
                ? 'h-9 gap-1.5 border-transparent bg-emerald-600 text-xs text-white hover:bg-emerald-600 disabled:opacity-100'
                : 'h-9 gap-1.5 text-xs'
            }
            disabled={busy || Boolean(rc.landlordPropertyUpdateEmail?.sentAt)}
            onClick={() => void sendComparisonSummary('landlord_property_update')}
          >
            <Mail className="size-3.5" />
            {rc.landlordPropertyUpdateEmail?.sentAt
              ? 'Property update sent to landlord'
              : 'Email property update to Landlord'}
          </Button>
          {!rc.landlordPropertyUpdateEmail?.sentAt ? (
            <p className="text-muted-foreground max-w-md text-right text-[10px]">
              Attaches ingoing and outgoing reports, responsibility summary, and all staff and agent
              comments.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (showQuote) {
    return (
      <div className="space-y-4">
        <CompareReportPdfRow
          outgoingDetail={outgoingDetail}
          ingoingDetail={ingoingDetail}
          manualReports={rc.manualInspectionReports ?? []}
          loading={loadingReports}
          caseId={caseData.id}
        />
        {tenantResponsibilityReviewStatus !== 'none' ? (
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Tenant responsibility review</p>
            <p className="text-muted-foreground text-xs">
              {tenantResponsibilityReviewStatus === 'pending'
                ? 'Awaiting tenant acknowledgement in the tenant app.'
                : tenantResponsibilityReviewStatus === 'accepted'
                  ? 'Tenant acknowledged — send the maintenance quotation when quotes are ready.'
                  : 'Tenant disagreed with the responsibility list.'}
            </p>
            {rc.tenantResponsibilityDeclineReason ? (
              <p className="text-xs whitespace-pre-wrap">
                <span className="font-medium">Tenant reason:</span>{' '}
                {rc.tenantResponsibilityDeclineReason}
              </p>
            ) : null}
          </section>
        ) : null}
        {landlordQuoteFromAdmin ? (
          <AgentLandlordQuoteReviewPanel
            items={landlordItems}
            sentAt={rc.agentRepairQuoteEmail?.sentAt}
            response={agentLandlordQuoteResponse}
            respondedAt={rc.agentLandlordQuoteRespondedAt}
            declineReason={rc.agentLandlordQuoteDeclineReason}
            busy={busy}
            onApprove={() => void respondAgentLandlordQuote('approved')}
            onDecline={(reason) => void respondAgentLandlordQuote('declined', reason)}
          />
        ) : null}
        <QuoteResponsibilitySection
          title="Tenant Responsibility"
          items={tenantItems}
          contractors={contractors}
          agencyId={agencyId}
          onContractorsChange={setContractors}
          onChange={setTenantItems}
          readOnly
          lockedHint={
            !tenantMaintenanceReady
              ? 'Awaiting tenant responsibility review'
              : !agentBondProposalSent
                ? 'Awaiting bond deduction proposal from CROSSUB'
                : quoteStepHasLandlordItems(rc) && !quoteStepLandlordQuoteSentToAgent(rc)
                  ? 'Awaiting landlord maintenance quotation from CROSSUB'
                  : agentLandlordQuoteResponse === 'pending'
                    ? 'Approve the landlord quotation from CROSSUB, then mark landlord-waivable items and send to tenant'
                    : agentLandlordQuoteResponse === 'declined'
                      ? 'Landlord quotation declined — await an updated quotation from CROSSUB'
                      : !endLeasingQuotesReadyForTenant
                        ? 'Complete End of Lease maintenance quotes, then send the quotation to the tenant'
                        : 'Mark landlord-waivable items, then send the quotation to the tenant app and email'
          }
          showQuoteColumns
          hideQuoteAmountColumn={tenantResponsibilityReviewStatus === 'pending'}
          tenantReviewPending={tenantResponsibilityReviewStatus === 'pending'}
          busy={busy}
          staffComment={tenantStaffComment}
          agentComment={tenantAgentComment}
          onSendAgentComment={(message) => sendAgentComment('tenant', message)}
          canEditAgentComment
          maintenanceColumnMode={
            tenantResponsibilityReviewStatus === 'pending' ||
            tenantResponsibilityReviewStatus === 'accepted'
              ? 'actions'
              : 'hidden'
          }
          tableFooter={
            tenantResponsibilityReviewStatus === 'accepted' ? (
              <Button
                type="button"
                size="sm"
                variant={endLeasingSendCtaVariant(
                  tenantQuotationSent && rc.tenantQuoteResponse !== 'declined',
                  tenantQuotationButtonEnabled && canSendQuotationToTenant,
                )}
                className={endLeasingSendCtaClassName(
                  tenantQuotationSent && rc.tenantQuoteResponse !== 'declined',
                  tenantQuotationButtonEnabled && canSendQuotationToTenant,
                )}
                disabled={busy || !tenantQuotationButtonEnabled}
                onClick={() => handleTenantQuotationButtonClick()}
              >
                <Send className="size-3.5" />
                {sendQuotationButtonLabel}
              </Button>
            ) : null
          }
        />
        <QuoteResponsibilitySection
          title="Landlord Responsibility"
          items={landlordItems}
          contractors={contractors}
          agencyId={agencyId}
          onContractorsChange={setContractors}
          onChange={setLandlordItems}
          readOnly
          lockedHint={
            !landlordMaintenanceReady
              ? 'Agree with the landlord responsibility list first'
              : !endLeasingLandlordQuotesReady
                ? 'Complete End of Lease maintenance quotes, then send the quotation to the landlord'
                : 'Send landlord-responsibility quotes to the owner via email and Landlord app'
          }
          showQuoteColumns
          hideQuoteAmountColumn={false}
          tenantReviewPending={false}
          busy={busy}
          staffComment={landlordStaffComment}
          agentComment={landlordAgentComment}
          onSendAgentComment={(message) => sendAgentComment('landlord', message)}
          canEditAgentComment
          maintenanceColumnMode={landlordMaintenanceReady ? 'actions' : 'hidden'}
          tableFooter={
            landlordMaintenanceReady ? (
              <Button
                type="button"
                size="sm"
                variant={endLeasingSendCtaVariant(landlordQuotationSent, canSendLandlordQuotation)}
                className={endLeasingSendCtaClassName(
                  landlordQuotationSent,
                  canSendLandlordQuotation,
                )}
                disabled={busy || !landlordQuotationButtonEnabled}
                onClick={() => handleLandlordQuotationButtonClick()}
              >
                <Send className="size-3.5" />
                {sendLandlordQuotationButtonLabel}
              </Button>
            ) : null
          }
        />
        <AgentTenantBondSendDialog
          open={sendQuotationDialogOpen}
          onOpenChange={setSendQuotationDialogOpen}
          items={tenantItems}
          bondHeld={caseData.settlement.bondHeld ?? 0}
          settlementSummary={rc.settlementSummary}
          busy={busy}
          onSend={(items) => void sendTenantBondAcknowledgement(items)}
        />
        <LandlordSendQuotationDialog
          open={sendLandlordQuotationDialogOpen}
          onOpenChange={setSendLandlordQuotationDialogOpen}
          items={landlordItems}
          busy={busy}
          onSend={() => void sendLandlordQuotation()}
        />
        <TenantQuotationSentDialog
          open={tenantQuotationSentDialogOpen}
          onOpenChange={setTenantQuotationSentDialogOpen}
          items={tenantItems}
          settlementSummary={rc.settlementSummary}
          sentAt={rc.tenantBondDeductionAckEmail?.sentAt ?? rc.tenantRepairQuoteEmail?.sentAt}
          tenantQuoteResponse={rc.tenantQuoteResponse}
          tenantQuoteResponseAt={rc.tenantQuoteResponseAt}
          declineReason={rc.tenantQuoteDeclineReason}
          replyExcerpt={rc.tenantQuoteReplyExcerpt}
          commConversationId={
            rc.tenantBondDeductionAckEmail?.commConversationId ??
            rc.tenantRepairQuoteEmail?.commConversationId
          }
          busy={busy}
          onCheckReply={() => void checkTenantReply()}
          onAgree={() => void recordTenantAgree()}
          onDisagree={() => void recordTenantDisagree()}
        />
        <LandlordQuotationSentDialog
          open={landlordQuotationSentDialogOpen}
          onOpenChange={setLandlordQuotationSentDialogOpen}
          items={landlordItems}
          sentAt={rc.landlordRepairQuoteEmail?.sentAt}
        />
      </div>
    );
  }

  if (showTenantResponse) {
    return (
      <div className="space-y-4">
        {tenantQuoteEmailSent ? (
          <TenantQuoteResponsePanel
            response={rc.tenantQuoteResponse}
            responseAt={rc.tenantQuoteResponseAt}
            declineReason={rc.tenantQuoteDeclineReason}
            replyExcerpt={rc.tenantQuoteReplyExcerpt}
            commConversationId={rc.tenantRepairQuoteEmail?.commConversationId}
            busy={busy}
            onCheckReply={() => void checkTenantReply()}
            onAgree={() => void recordTenantAgree()}
            onDisagree={() => void recordTenantDisagree()}
          />
        ) : null}
        {tenantAgreed ? <MaintenanceQuotationPanel items={tenantItems} /> : null}
        {tenantAgreed && rc.settlementSummary ? (
          <SettlementSummaryPanel summary={rc.settlementSummary} />
        ) : null}
      </div>
    );
  }

  return null;
}
