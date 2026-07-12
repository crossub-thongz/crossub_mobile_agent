'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
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
  responsibilityItemsEqual,
} from '@/lib/end-leasing/outgoing-inspection-sync';
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
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">Quote</th>
              <th className="px-3 py-2 font-semibold">Handyman</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={`quote-${index}`} className="border-t">
                <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                <td className="px-3 py-2">{row.area}</td>
                <td className="px-3 py-2">{row.description}</td>
                <td className="px-3 py-2 tabular-nums">{row.quote || '—'}</td>
                <td className="px-3 py-2">{row.handymanName || '—'}</td>
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
        ) : ingoingDetail ? (
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
          <span className="text-muted-foreground text-xs">Not linked yet</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
        <span className="text-sm font-semibold">Outgoing Report:</span>
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Loader2 className="size-3 animate-spin" />
            Loading…
          </span>
        ) : outgoingDetail ? (
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
          <span className="text-muted-foreground text-xs">Not scheduled yet</span>
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
  const hasOutgoingReport = Boolean(outgoingDetail?.reportUrl || outgoingDetail?.id);
  const hasIngoingReport = Boolean(ingoingDetail?.reportUrl || ingoingDetail?.id);

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

function CompareResponsibilitySection({
  title,
  description,
  items,
  onChange,
  onEmail,
  emailHint,
  actionBusy = false,
  readOnly = false,
}: {
  title: string;
  description?: string;
  items: ReportComparisonRepairItem[];
  onChange: (items: ReportComparisonRepairItem[]) => void;
  onEmail: () => void;
  emailHint: string;
  /** Disables email/actions only — not row inputs (avoids flicker during autosave). */
  actionBusy?: boolean;
  readOnly?: boolean;
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
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Area</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground px-3 py-4 text-center">
                    {readOnly
                      ? 'No tenant-responsible items on the outgoing inspection report yet.'
                      : 'No items yet.'}
                  </td>
                </tr>
              ) : readOnly ? (
                items.map((row, index) => (
                  <tr key={repairRowKey(row, `${title}-${index}`)} className="border-t align-top">
                    <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2">{row.area}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{row.description}</td>
                    <td className="px-2 py-2" />
                  </tr>
                ))
              ) : (
                items.map((row, index) => (
                  <tr key={repairRowKey(row, `${title}-${index}`)} className="border-t align-top">
                    <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2">
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
                    <td className="px-2 py-2">
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {!readOnly ? (
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
          ) : (
            <span className="text-muted-foreground text-[10px]">
              Synced from inspector outgoing report
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 text-xs"
            disabled={actionBusy}
            onClick={onEmail}
            title={emailHint}
          >
            <Mail className="size-3.5" />
            Email
          </Button>
        </div>
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
}) {
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
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              {!hideQuoteColumns ? (
                <>
                  <th className="px-3 py-2 font-semibold">$</th>
                  <th className="px-3 py-2 font-semibold">Company</th>
                </>
              ) : null}
              {!readOnly ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={(hideQuoteColumns ? 3 : 5) + (readOnly ? 0 : 1)}
                  className="text-muted-foreground px-3 py-4 text-center"
                >
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t align-top">
                  <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                  {readOnly ? (
                    <>
                      <td className="px-3 py-2">{row.area || '—'}</td>
                      <td className="max-w-md px-3 py-2 whitespace-pre-wrap leading-relaxed">
                        {row.description || '—'}
                      </td>
                      {!hideQuoteColumns ? (
                        <>
                          <td className="px-3 py-2 tabular-nums">{row.quote || '—'}</td>
                          <td className="px-3 py-2">{row.handymanName || '—'}</td>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">
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
                          <td className="px-3 py-2">
                            <Input
                              className="h-8 text-xs"
                              value={row.quote ?? ''}
                              placeholder="$0.00"
                              disabled={busy}
                              onChange={(e) => updateRow(index, { quote: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2">
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
                      <td className="px-2 py-2">
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
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Area</th>
                <th className="px-3 py-2 font-semibold">Description</th>
                {showQuoteColumns ? (
                  <>
                    <th className="px-3 py-2 font-semibold">Quote</th>
                    <th className="px-3 py-2 font-semibold">Company</th>
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
                  <tr key={repairRowKey(row, `inspector-${index}`)} className="border-t">
                    <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                    <td className="px-3 py-2">{row.area}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap">{row.description}</td>
                    {showQuoteColumns ? (
                      <>
                        <td className="px-3 py-2 tabular-nums">{row.quote || '—'}</td>
                        <td className="px-3 py-2">{row.handymanName || '—'}</td>
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
  const [busy, setBusy] = useState(false);
  const compareAutosaveReadyRef = useRef(false);
  const quoteAutosaveReadyRef = useRef(false);

  const refreshReports = useCallback(async () => {
    if (!apiConnected) return;
    setLoadingReports(true);
    try {
      const [outgoing, ingoing] = await Promise.all([
        outgoingId ? inspectionsApi.getDetail(outgoingId).catch(() => null) : Promise.resolve(null),
        ingoingId ? inspectionsApi.getDetail(ingoingId).catch(() => null) : Promise.resolve(null),
      ]);
      setOutgoingDetail(outgoing);
      setIngoingDetail(ingoing);
    } finally {
      setLoadingReports(false);
    }
  }, [apiConnected, outgoingId, ingoingId]);

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
    compareAutosaveReadyRef.current = false;
    quoteAutosaveReadyRef.current = false;
    setTenantItems(withRepairRowKeys(caseData.reportComparison.tenantResponsibility));
    setLandlordItems(withRepairRowKeys(caseData.reportComparison.landlordResponsibility));
    // Only reset draft rows when opening a different case — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caseData.reportComparison is read at case switch
  }, [caseData.id]);

  useEffect(() => {
    if (mode !== 'compare' || !outgoingDetail) return;
    const extracted = extractTenantResponsibilityFromOutgoing(outgoingDetail);
    setTenantItems((prev) => {
      const merged = withRepairRowKeys(mergeInspectionResponsibilityItems(prev, extracted));
      if (responsibilityItemsEqual(prev, merged)) return prev;
      queueMicrotask(() => {
        void terminationApi
          .updateReportComparison(caseData.id, {
            tenantResponsibility: normalizeRepairItems(merged, contractors),
          })
          .then((updated) => applyCase(updated))
          .catch(() => undefined);
      });
      return merged;
    });
  }, [applyCase, caseData.id, contractors, mode, outgoingDetail]);

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

  const saveRepairItems = async (silent = false) => {
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
    await persist(patch, { silent });
  };

  useEffect(() => {
    if (mode !== 'compare' && mode !== 'quote') return;
    const readyRef = mode === 'compare' ? compareAutosaveReadyRef : quoteAutosaveReadyRef;
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void saveRepairItems(true).catch(() => undefined);
    }, 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce draft rows in compare/quote modes
  }, [tenantItems, landlordItems, mode]);

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

  const sendQuoteEmail = async () => {
    setBusy(true);
    try {
      await saveRepairItems(true);
      const updated = await terminationApi.sendRepairQuoteEmail(caseData.id, 'agent');
      applyCase(updated);
      setTenantItems((prev) =>
        mergeRepairItemsAfterSave(prev, updated.reportComparison.tenantResponsibility),
      );
      setLandlordItems((prev) =>
        mergeRepairItemsAfterSave(prev, updated.reportComparison.landlordResponsibility),
      );
      toast.success('Repair quotes sent to agent');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendComparisonSummary = async (audience: 'tenant' | 'agent') => {
    setBusy(true);
    try {
      await saveRepairItems(true);
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
          : 'Comparison summary sent to tenant and landlord',
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
  const tenantTableLocked =
    tenantQuoteEmailSent &&
    (rc.tenantQuoteResponse === 'pending' ||
      rc.tenantQuoteResponse === 'accepted' ||
      !rc.tenantQuoteResponse);
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
          description="Auto-synced from the inspector outgoing report. Quotes and handymen are added on the Repair quotes step."
          items={tenantItems}
          onChange={setTenantItems}
          readOnly
          actionBusy={busy}
          emailHint="Send to tenant"
          onEmail={() => void sendComparisonSummary('tenant')}
        />
        <CompareResponsibilitySection
          title="Landlord responsibility"
          items={landlordItems}
          onChange={setLandlordItems}
          actionBusy={busy}
          emailHint="Send to tenant + landlord"
          onEmail={() => void sendComparisonSummary('agent')}
        />
      </div>
    );
  }

  if (showQuote) {
    return (
      <div className="space-y-4">
        <CompareReportPdfRow
          outgoingDetail={outgoingDetail}
          ingoingDetail={ingoingDetail}
          loading={loadingReports}
        />
        <QuoteResponsibilitySection
          title="Tenant Responsibility"
          items={tenantItems}
          contractors={contractors}
          agencyId={agencyId}
          onContractorsChange={setContractors}
          onChange={setTenantItems}
          readOnly={tenantTableLocked}
          lockedHint={
            tenantTableLocked
              ? rc.tenantQuoteResponse === 'accepted'
                ? 'Locked — tenant agreed'
                : 'Locked — awaiting tenant reply'
              : undefined
          }
          busy={busy}
        />
        <QuoteResponsibilitySection
          title="Landlord Responsibility"
          items={landlordItems}
          contractors={contractors}
          agencyId={agencyId}
          onContractorsChange={setContractors}
          onChange={setLandlordItems}
          busy={busy}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 gap-1.5 text-xs"
            disabled={busy}
            onClick={() => void sendQuoteEmail()}
          >
            <Send className="size-3.5" />
            Send quotes
          </Button>
        </div>
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
