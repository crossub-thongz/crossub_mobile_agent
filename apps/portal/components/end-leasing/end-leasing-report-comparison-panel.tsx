'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AddHandymanDialog } from '@/components/end-leasing/add-handyman-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { communicationsThread } from '@/constants/routes';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionDetail } from '@/lib/inspections-types';
import type {
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

type MaintenanceColumnMode = 'hidden' | 'pending_ack';

function MaintenancePendingAckCell() {
  return (
    <td className="px-2 py-2">
      <span className="text-muted-foreground text-[10px] leading-snug">
        Pending Tenant Acknowledgement
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

function TenantBondDeductionAckSentPanel({
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
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Bond deduction acknowledgement sent to tenant</p>
        <p className="text-muted-foreground mt-1 text-xs">
          CROSSUB sent this quote summary to the tenant
          {sentAt ? ` on ${formatDateTime(sentAt)}` : ''}. Bond deduct shows whether each item
          may be taken from the rental bond.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border text-xs">
        <table className="w-full table-fixed text-left">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="w-28 px-3 py-2 font-semibold">Bond deduct</th>
              <th className={`${REPAIR_COL_AREA} px-3 py-2 font-semibold`}>Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>Quote</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={`bond-ack-sent-${index}`} className="border-t align-top">
                <td className="px-3 py-2">
                  {row.bondDeductible === true ? 'Yes' : 'No'}
                </td>
                <td className={`${REPAIR_COL_AREA} px-3 py-2`}>{row.area || '—'}</td>
                <td className="px-3 py-2 whitespace-pre-wrap">{row.description || '—'}</td>
                <td className={`${REPAIR_COL_QUOTE} px-3 py-2 tabular-nums`}>
                  <MaintenanceQuoteCell row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {settlementSummary ? <SettlementSummaryPanel summary={settlementSummary} /> : null}
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
    </section>
  );
}

function SettlementSummaryPanel({ summary }: { summary: ReportComparisonSettlementSummary }) {
  const totalDeductions =
    summary.unpaidRent + summary.unpaidBills + summary.maintenanceCost;

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Bond settlement summary</p>
      <p className="text-muted-foreground text-xs">
        Total bond less unpaid rent, unpaid bills, and tenant maintenance costs.
      </p>
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
    </section>
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

function CompareReportPdfRow({
  outgoingDetail,
  ingoingDetail,
  loading,
}: {
  outgoingDetail: InspectionDetail | null;
  ingoingDetail: InspectionDetail | null;
  loading: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
        <span className="text-sm font-semibold">Ingoing Report:</span>
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="size-3 animate-spin" />
            Loading…
          </span>
        ) : ingoingDetail && isInspectionReportReadyForView(ingoingDetail) ? (
          <InspectionReportDownloadActions
            inspectionId={ingoingDetail.id}
            reportUrl={ingoingDetail.reportUrl}
            propertyLabel={
              ingoingDetail.propertyFullAddress ?? ingoingDetail.propertyAddress ?? 'Property'
            }
            inspectionType="ingoing"
            variant="inline"
            size="sm"
          />
        ) : (
          <span className="text-muted-foreground text-xs">
            {ingoingDetail ? 'Report not available yet' : 'Not linked yet'}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
        <span className="text-sm font-semibold">Outgoing Report:</span>
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="size-3 animate-spin" />
            Loading…
          </span>
        ) : outgoingDetail && isInspectionReportReadyForView(outgoingDetail) ? (
          <InspectionReportDownloadActions
            inspectionId={outgoingDetail.id}
            reportUrl={outgoingDetail.reportUrl}
            propertyLabel={
              outgoingDetail.propertyFullAddress ?? outgoingDetail.propertyAddress ?? 'Property'
            }
            inspectionType="outgoing"
            variant="inline"
            size="sm"
          />
        ) : (
          <span className="text-muted-foreground text-xs">
            {outgoingDetail ? 'Report not available yet' : 'Not scheduled yet'}
          </span>
        )}
      </div>
    </div>
  );
}

function CompareReportsSection({
  outgoingDetail,
  ingoingDetail,
  loading,
  agentAcknowledged,
  agentAcknowledgedAt,
  actionBusy,
  onConfirm,
}: {
  outgoingDetail: InspectionDetail | null;
  ingoingDetail: InspectionDetail | null;
  loading: boolean;
  agentAcknowledged: boolean;
  agentAcknowledgedAt?: string | null;
  actionBusy: boolean;
  onConfirm: () => void;
}) {
  const hasOutgoingReport = isInspectionReportReadyForView(outgoingDetail);
  const hasIngoingReport = isInspectionReportReadyForView(ingoingDetail);

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Ingoing / outgoing comparison</h3>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            Open the reports when available, compare condition changes, then confirm as the
            managing agent.
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
        loading={loading}
      />
      {!agentAcknowledged && !loading && (!hasOutgoingReport || !hasIngoingReport) ? (
        <p className="text-muted-foreground text-[11px]">
          {!hasOutgoingReport && !hasIngoingReport
            ? 'Reports are not linked yet — you can still confirm once you have reviewed the comparison.'
            : !hasIngoingReport
              ? 'Ingoing report is not linked yet — confirm when you are satisfied with the comparison.'
              : 'Outgoing report is not available yet — confirm when you are satisfied with the comparison.'}
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
}: {
  label: string;
  savedComment: string;
  emptyLabel: string;
  canEdit: boolean;
  onSend?: (message: string) => void | Promise<void>;
  actionBusy?: boolean;
  placeholder?: string;
  tone?: 'staff' | 'agent' | 'default';
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
  hideQuoteColumns = false,
  maintenanceColumnMode = 'hidden',
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
  maintenanceColumnMode?: MaintenanceColumnMode;
}) {
  const showQuoteCols = hideQuoteColumns === true ? false : showQuoteColumns !== false;
  const showMaintenanceColumn = maintenanceColumnMode === 'pending_ack';

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
          maintenanceColumnMode={maintenanceColumnMode}
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
  return `Quoted from ${row.handymanName.trim()} (maintenance job)`;
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
  hideTitle = false,
  showAddRow = true,
  busy = false,
  maintenanceColumnMode = 'hidden',
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
  hideTitle?: boolean;
  showAddRow?: boolean;
  busy?: boolean;
  maintenanceColumnMode?: MaintenanceColumnMode;
}) {
  const showMaintenanceColumn = maintenanceColumnMode === 'pending_ack';

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
                  <th className={`${REPAIR_COL_QUOTE} px-3 py-2 font-semibold`}>$</th>
                  <th className={`${REPAIR_COL_COMPANY} px-3 py-2 font-semibold`}>Company</th>
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
                    (hideQuoteColumns ? 3 : 5) +
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
                          <td className={`${REPAIR_COL_QUOTE} px-3 py-2`}>
                            <MaintenanceQuoteCell row={row} />
                          </td>
                          <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>
                            {row.handymanName || '—'}
                          </td>
                        </>
                      ) : null}
                      {showMaintenanceColumn ? <MaintenancePendingAckCell /> : null}
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
                          value={row.description}
                          placeholder="Description"
                          disabled={busy}
                          onChange={(e) => updateRow(index, { description: e.target.value })}
                        />
                      </td>
                      {!hideQuoteColumns ? (
                        <>
                          <td className={`${REPAIR_COL_QUOTE} px-3 py-2`}>
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
                          </td>
                          <td className={`${REPAIR_COL_COMPANY} px-3 py-2`}>
                            <HandymanField
                              row={row}
                              contractors={contractors}
                              agencyId={agencyId}
                              onContractorsChange={onContractorsChange}
                              onChange={(patch) => updateRow(index, patch)}
                            />
                          </td>
                        </>
                      ) : null}
                      {showMaintenanceColumn ? <MaintenancePendingAckCell /> : null}
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
  const tenantQuoteEmailSent = Boolean(rc.tenantRepairQuoteEmail?.sentAt);
  const tenantBondAckSent = Boolean(rc.tenantBondDeductionAckEmail?.sentAt);
  const tenantAgreed = rc.tenantQuoteResponse === 'accepted';
  const showCompare = mode === 'compare';
  const showQuote = mode === 'quote';
  const showTenantResponse = mode === 'tenant-response';
  const showInspectorReadonly = mode === 'inspector-readonly';

  const inspectorReadOnlyItems = useMemo(() => {
    const saved = caseData.reportComparison.tenantResponsibility;
    if (!outgoingDetail) return saved;
    return mergeInspectionResponsibilityItems(
      saved,
      extractTenantResponsibilityFromOutgoing(outgoingDetail),
    );
  }, [caseData.reportComparison.tenantResponsibility, outgoingDetail]);

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
          loading={loadingReports}
          agentAcknowledged={rc.agentAcknowledged}
          agentAcknowledgedAt={rc.agentAcknowledgedAt}
          actionBusy={busy}
          onConfirm={() => void confirmAgentComparison()}
        />
        <CompareResponsibilitySection
          title="Tenant responsibility"
          description="Recorded by CROSSUB staff. Acknowledge each responsibility list (Yes/No), add comments, then email when ready."
          items={tenantItems}
          onChange={setTenantItems}
          readOnly
          actionBusy={busy}
          emptyReadOnlyMessage="No items recorded yet — CROSSUB staff will add these from the admin portal."
          staffComment={tenantStaffComment}
          agentComment={tenantAgentComment}
          onSendAgentComment={(message) => sendAgentComment('tenant', message)}
          canEditAgentComment
          responsibilityAcknowledged={rc.tenantResponsibilityAgentAcknowledged ?? null}
          responsibilityAcknowledgedAt={rc.tenantResponsibilityAgentAcknowledgedAt}
          canAcknowledgeResponsibility
          onAcknowledgeResponsibility={(accepted) =>
            acknowledgeResponsibility('tenant', accepted)
          }
          emailHint="Send tenant responsibility summary to the tenant"
          emailButtonLabel="Email to Tenant"
          emailSentLabel="Email to Tenant sent"
          emailSent={Boolean(rc.tenantComparisonSummaryEmail?.sentAt)}
          onEmail={() => void sendComparisonSummary('tenant')}
        />
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
    const tenantResponsibilityReviewStatus =
      rc.tenantResponsibilityAgentAcknowledged === true &&
      (rc.tenantResponsibility?.length ?? 0) > 0
        ? rc.tenantResponsibilityReviewStatus === 'accepted' ||
          rc.tenantResponsibilityReviewStatus === 'declined' ||
          rc.tenantResponsibilityReviewStatus === 'pending'
          ? rc.tenantResponsibilityReviewStatus
          : 'pending'
        : 'none';

    return (
      <div className="space-y-4">
        <CompareReportPdfRow
          outgoingDetail={outgoingDetail}
          ingoingDetail={ingoingDetail}
          loading={loadingReports}
        />
        {tenantResponsibilityReviewStatus !== 'none' ? (
          <section className="space-y-2 rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold">Tenant responsibility review</p>
            <p className="text-muted-foreground text-xs">
              {tenantResponsibilityReviewStatus === 'pending'
                ? 'Awaiting tenant review in the Make-good step.'
                : tenantResponsibilityReviewStatus === 'accepted'
                  ? 'Tenant acknowledged — pending quotation from CROSSUB.'
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
        <QuoteResponsibilitySection
          title="Tenant Responsibility"
          items={tenantItems}
          contractors={contractors}
          agencyId={agencyId}
          onContractorsChange={setContractors}
          onChange={setTenantItems}
          readOnly
          showQuoteColumns
          busy={busy}
          staffComment={tenantStaffComment}
          agentComment={tenantAgentComment}
          onSendAgentComment={(message) => sendAgentComment('tenant', message)}
          canEditAgentComment
          maintenanceColumnMode={
            tenantResponsibilityReviewStatus !== 'none' &&
            tenantResponsibilityReviewStatus !== 'accepted'
              ? 'pending_ack'
              : 'hidden'
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
          showQuoteColumns
          busy={busy}
          staffComment={landlordStaffComment}
          agentComment={landlordAgentComment}
          onSendAgentComment={(message) => sendAgentComment('landlord', message)}
          canEditAgentComment
        />
        <section className="rounded-xl border bg-card p-4 text-right">
          <p className="text-sm font-semibold">Maintenance quotation</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {rc.tenantRepairQuoteEmail?.sentAt
              ? rc.tenantQuoteResponse === 'accepted'
                ? 'Tenant accepted the End of Lease maintenance quotation.'
                : rc.tenantQuoteResponse === 'declined'
                  ? 'Tenant disagreed with the quotation — CROSSUB staff will revise and re-send.'
                  : 'Quotation sent to tenant — awaiting reply.'
              : tenantResponsibilityReviewStatus === 'accepted'
                ? 'CROSSUB staff obtain contractor quotes via End of Lease Maintenance, then send the quotation to the tenant.'
                : 'Awaiting tenant acknowledgement of the responsibility list.'}
          </p>
        </section>
        {tenantBondAckSent || rc.tenantRepairQuoteEmail?.sentAt ? (
          <TenantBondDeductionAckSentPanel
            items={tenantItems}
            settlementSummary={rc.settlementSummary}
            sentAt={rc.tenantBondDeductionAckEmail?.sentAt}
            tenantQuoteResponse={rc.tenantQuoteResponse}
            tenantQuoteResponseAt={rc.tenantQuoteResponseAt}
            declineReason={rc.tenantQuoteDeclineReason}
          />
        ) : null}
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
