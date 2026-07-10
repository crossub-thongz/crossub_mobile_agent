'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InspectionReportDownloadActions } from '@/components/inspections/inspection-report-download-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { communicationsThread } from '@/constants/routes';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  buildOutgoingAreaPhotoPairs,
  countOutgoingReportPhotos,
} from '@/lib/inspections/outgoing-report-evidence';
import type { InspectionDetail } from '@/lib/inspections-types';
import type {
  EndLeasingOverviewEmail,
  ReportComparisonRepairItem,
  ReportComparisonSettlementSummary,
  TenantQuoteResponse,
  TerminationCaseDetail,
} from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { ReportComparisonRepairItemInput } from '@/lib/termination-case-types';
import { terminationApi } from '@/lib/termination-case-api';
import {
  fetchPreferredContractors,
  type PreferredContractor,
} from '@/lib/crossub-api/agent-client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function SummaryEmailPanel({
  email,
  title,
}: {
  email: EndLeasingOverviewEmail;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {email.commConversationId ? (
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Link href={communicationsThread(email.commConversationId)}>
              <ExternalLink className="size-3.5" />
              View in Message Center
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 text-xs">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-medium">{email.from}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">To</dt>
            <dd className="font-medium">{email.to}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Subject</dt>
            <dd className="font-medium">{email.subject}</dd>
          </div>
          {email.sentAt ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Drafted</dt>
              <dd className="font-medium">{formatDateTime(email.sentAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
          Message
        </p>
        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{email.body}</pre>
      </div>
    </div>
  );
}

const TENANT_QUOTE_RESPONSE_LABEL: Record<TenantQuoteResponse, string> = {
  pending: 'Awaiting tenant reply',
  accepted: 'Tenant agreed',
  declined: 'Tenant disagreed',
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

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Tenant quote response</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Trace agree/disagree from the Message Center thread, or record the tenant&apos;s reply
            manually.
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

      <div
        className={`rounded-lg border px-3 py-2 text-xs ${
          status === 'accepted'
            ? 'border-primary/30 bg-primary/5'
            : status === 'declined'
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border bg-muted/20'
        }`}
      >
        <p className="font-semibold">{TENANT_QUOTE_RESPONSE_LABEL[status]}</p>
        {responseAt ? (
          <p className="text-muted-foreground mt-1">Recorded {formatDateTime(responseAt)}</p>
        ) : null}
        {replyExcerpt ? (
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
            Reply: {replyExcerpt}
          </p>
        ) : null}
        {declineReason ? (
          <p className="mt-2 whitespace-pre-wrap">{declineReason}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={onCheckReply}
        >
          <RefreshCw className="size-3.5" />
          Check email for reply
        </Button>
        {status !== 'accepted' ? (
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={onAgree}
          >
            <ThumbsUp className="size-3.5" />
            Tenant agreed
          </Button>
        ) : null}
        {status !== 'declined' ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={onDisagree}
          >
            <ThumbsDown className="size-3.5" />
            Tenant disagreed
          </Button>
        ) : null}
      </div>
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

function PhotoSlot({
  label,
  url,
}: {
  label: string;
  url?: string | null;
}) {
  if (!url) {
    return (
      <div className="border-border/80 bg-secondary/10 flex aspect-square items-center justify-center rounded-lg border border-dashed p-2 text-center text-[10px] text-muted-foreground">
        {label}
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-secondary/30 block aspect-square overflow-hidden rounded-lg border"
      aria-label={`View ${label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="size-full object-cover" />
    </a>
  );
}

function ReportEvidenceSection({
  outgoingDetail,
  ingoingDetail,
  loading,
}: {
  outgoingDetail: InspectionDetail | null;
  ingoingDetail: InspectionDetail | null;
  loading: boolean;
}) {
  const pairs = useMemo(
    () => (outgoingDetail ? buildOutgoingAreaPhotoPairs(outgoingDetail.areas) : []),
    [outgoingDetail],
  );
  const photoCount = countOutgoingReportPhotos(pairs);
  const visiblePairs = pairs.filter(
    (pair) => pair.ingoingPhotos.length > 0 || pair.outgoingPhotos.length > 0,
  );

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera className="text-primary size-4" />
          <h3 className="text-sm font-semibold">Ingoing vs outgoing comparison</h3>
        </div>
        {loading ? (
          <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
            <Loader2 className="size-3 animate-spin" />
            Loading reports…
          </span>
        ) : photoCount > 0 ? (
          <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
            {photoCount} photo{photoCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Ingoing report
          </p>
          {ingoingDetail ? (
            <InspectionReportDownloadActions
              inspectionId={ingoingDetail.id}
              reportUrl={ingoingDetail.reportUrl}
              propertyLabel={ingoingDetail.propertyFullAddress ?? ingoingDetail.propertyAddress ?? 'Property'}
              inspectionType="ingoing"
              variant="inline"
            />
          ) : (
            <p className="text-muted-foreground text-xs">Ingoing inspection not linked yet.</p>
          )}
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Outgoing report
          </p>
          {outgoingDetail ? (
            <InspectionReportDownloadActions
              inspectionId={outgoingDetail.id}
              reportUrl={outgoingDetail.reportUrl}
              propertyLabel={outgoingDetail.propertyFullAddress ?? outgoingDetail.propertyAddress ?? 'Property'}
              inspectionType="outgoing"
              variant="inline"
            />
          ) : (
            <p className="text-muted-foreground text-xs">Outgoing inspection not scheduled yet.</p>
          )}
        </div>
      </div>

      {visiblePairs.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-xs">
          <FileText className="size-4 shrink-0" />
          {loading
            ? 'Fetching inspection reports…'
            : 'Side-by-side ingoing and outgoing photos appear once the inspector uploads them.'}
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePairs.map((pair) => (
            <div key={pair.room} className="space-y-2">
              <p className="text-sm font-semibold">{pair.room}</p>
              <div className="grid grid-cols-2 gap-3">
                <PhotoSlot label="Ingoing" url={pair.ingoingPhotos[0]?.url} />
                <PhotoSlot label="Outgoing" url={pair.outgoingPhotos[0]?.url} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function emptyRepairItem(): ReportComparisonRepairItem {
  return { area: '', description: '', quote: '', handymanId: null, handymanName: '' };
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

function normalizeRepairItems(items: ReportComparisonRepairItem[]): ReportComparisonRepairItemInput[] {
  return items.filter(hasRepairContent).map((item) => ({
    area: item.area.trim(),
    description: item.description.trim(),
    quote: item.quote?.trim() || undefined,
    handymanId: item.handymanId || undefined,
    handymanName: item.handymanName?.trim() || undefined,
  }));
}

function HandymanField({
  row,
  contractors,
  onChange,
}: {
  row: ReportComparisonRepairItem;
  contractors: PreferredContractor[];
  onChange: (patch: Partial<ReportComparisonRepairItem>) => void;
}) {
  const selectValue = row.handymanId
    ? row.handymanId
    : row.handymanName?.trim()
      ? '__custom__'
      : '';

  return (
    <div className="space-y-1.5">
      <select
        className="border-input bg-background h-8 w-full min-w-[140px] rounded-md border px-2 text-xs"
        value={selectValue}
        onChange={(e) => {
          const value = e.target.value;
          if (value === '__custom__') {
            onChange({ handymanId: null, handymanName: row.handymanName ?? '' });
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
            {contractor.name}
          </option>
        ))}
        <option value="__custom__">Add new…</option>
      </select>
      {selectValue === '__custom__' ? (
        <Input
          className="h-8 text-xs"
          value={row.handymanName ?? ''}
          placeholder="Handyman name"
          onChange={(e) => onChange({ handymanId: null, handymanName: e.target.value })}
        />
      ) : null}
    </div>
  );
}

function RepairItemsTable({
  title,
  items,
  contractors,
  onChange,
  footerAction,
  readOnly = false,
  lockedHint,
}: {
  title: string;
  items: ReportComparisonRepairItem[];
  contractors: PreferredContractor[];
  onChange: (items: ReportComparisonRepairItem[]) => void;
  footerAction?: React.ReactNode;
  readOnly?: boolean;
  lockedHint?: string;
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
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {readOnly && lockedHint ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
            <Lock className="size-3" />
            {lockedHint}
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">Quote</th>
              <th className="px-3 py-2 font-semibold">Handyman</th>
              {!readOnly ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="text-muted-foreground px-3 py-4 text-center">
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
                      <td className="px-3 py-2">{row.description || '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{row.quote || '—'}</td>
                      <td className="px-3 py-2">{row.handymanName || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 text-xs"
                          value={row.area}
                          placeholder="Area"
                          onChange={(e) => updateRow(index, { area: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 text-xs"
                          value={row.description}
                          placeholder="Description"
                          onChange={(e) => updateRow(index, { description: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 text-xs"
                          value={row.quote ?? ''}
                          placeholder="$0.00"
                          onChange={(e) => updateRow(index, { quote: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <HandymanField
                          row={row}
                          contractors={contractors}
                          onChange={(patch) => updateRow(index, patch)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-8"
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
        {!readOnly ? (
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addRow}>
            <Plus className="size-3.5" />
            Add row
          </Button>
        ) : null}
        {footerAction}
      </div>
    </div>
  );
}

function extractOutgoingRepairCandidates(detail: InspectionDetail): ReportComparisonRepairItem[] {
  const rows: ReportComparisonRepairItem[] = [];
  for (const area of detail.areas) {
    const areaName = (area.name ?? 'General').replace(/ \(Outgoing\)$/, '').trim() || 'General';
    for (const item of area.items) {
      if (!item.flagged && item.conditionTags.length === 0 && !item.comment) continue;
      rows.push({
        area: areaName,
        description: item.comment?.trim() || item.name?.trim() || 'Issue noted on outgoing report',
        quote: '',
        handymanId: null,
        handymanName: '',
      });
    }
  }
  return rows;
}

export function EndLeasingReportComparisonPanel({
  caseData,
}: {
  caseData: TerminationCaseDetail;
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
  const seededFromInspectionRef = useRef(false);

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
    seededFromInspectionRef.current = false;
    setTenantItems(caseData.reportComparison.tenantResponsibility);
    setLandlordItems(caseData.reportComparison.landlordResponsibility);
    // Only reset draft rows when opening a different case — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caseData.reportComparison is read at case switch
  }, [caseData.id]);

  useEffect(() => {
    if (seededFromInspectionRef.current || !outgoingDetail) return;
    if (
      caseData.reportComparison.tenantResponsibility.length > 0 ||
      caseData.reportComparison.landlordResponsibility.length > 0
    ) {
      seededFromInspectionRef.current = true;
      return;
    }
    const seeded = extractOutgoingRepairCandidates(outgoingDetail);
    if (seeded.length > 0) setTenantItems(seeded);
    seededFromInspectionRef.current = true;
  }, [
    outgoingDetail,
    caseData.id,
    caseData.reportComparison.tenantResponsibility.length,
    caseData.reportComparison.landlordResponsibility.length,
  ]);

  const persist = async (
    patch: Parameters<typeof terminationApi.updateReportComparison>[1],
    options?: { silent?: boolean },
  ) => {
    setBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(caseData.id, patch);
      applyCase(updated);
      setTenantItems(updated.reportComparison.tenantResponsibility);
      setLandlordItems(updated.reportComparison.landlordResponsibility);
      if (!options?.silent) toast.success('Comparison updated');
      return updated;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    } finally {
      setBusy(false);
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
      landlordResponsibility: normalizeRepairItems(landlordItems),
    };
    if (!tenantLocked) {
      patch.tenantResponsibility = normalizeRepairItems(tenantItems);
    }
    await persist(patch, { silent });
  };

  const sendQuoteEmail = async (audience: 'tenant' | 'landlord') => {
    setBusy(true);
    try {
      await saveRepairItems(true);
      const updated = await terminationApi.sendRepairQuoteEmail(caseData.id, audience);
      applyCase(updated);
      setTenantItems(updated.reportComparison.tenantResponsibility);
      setLandlordItems(updated.reportComparison.landlordResponsibility);
      toast.success(
        audience === 'tenant'
          ? 'Repair quote email sent to tenant'
          : 'Repair quote summary sent to landlord',
      );
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const applyUpdatedCase = (updated: TerminationCaseDetail) => {
    applyCase(updated);
    setTenantItems(updated.reportComparison.tenantResponsibility);
    setLandlordItems(updated.reportComparison.landlordResponsibility);
  };

  const checkTenantReply = async () => {
    setBusy(true);
    try {
      const updated = await terminationApi.syncTenantQuoteResponse(caseData.id);
      applyUpdatedCase(updated);
      const response = updated.reportComparison.tenantQuoteResponse;
      if (response === 'accepted') {
        toast.success('Tenant agreed — maintenance quotation and bond summary updated');
      } else if (response === 'declined') {
        toast.message('Tenant disagreed — tenant items are editable again');
      } else {
        toast.message('No agree/disagree reply found in the email thread yet');
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
      toast.success('Tenant agreed — bond settlement summary calculated');
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
      toast.message('Tenant disagreed — update tenant items and resend the quote');
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

  return (
    <div className="space-y-4">
      <ReportEvidenceSection
        outgoingDetail={outgoingDetail}
        ingoingDetail={ingoingDetail}
        loading={loadingReports}
      />

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-semibold">Comparison acknowledgement</p>
        <p className="text-muted-foreground mb-3 text-xs">
          Agent and tenant both review the ingoing/outgoing comparison before proceeding.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={rc.agentAcknowledged ? 'default' : 'outline'}
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={() =>
              void persist({ agentAcknowledged: !rc.agentAcknowledged })
            }
          >
            <Check className="size-3.5" />
            Agent reviewed {rc.agentAcknowledged ? '✓' : ''}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={rc.tenantAcknowledged ? 'default' : 'outline'}
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={() =>
              void persist({ tenantAcknowledged: !rc.tenantAcknowledged })
            }
          >
            <Check className="size-3.5" />
            Tenant reviewed {rc.tenantAcknowledged ? '✓' : ''}
          </Button>
        </div>
      </section>

      {rc.draftSummaryEmail?.body ? (
        <SummaryEmailPanel email={rc.draftSummaryEmail} title="Draft summary message" />
      ) : null}

      {rc.tenantRepairQuoteEmail?.body ? (
        <SummaryEmailPanel
          email={rc.tenantRepairQuoteEmail}
          title="Repair quote sent to tenant"
        />
      ) : null}

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

      {rc.landlordRepairQuoteEmail?.body ? (
        <SummaryEmailPanel
          email={rc.landlordRepairQuoteEmail}
          title="Repair quote summary sent to landlord"
        />
      ) : null}

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Obtain repair quote</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Add area, description, quote, and handyman for each item. Save before sending emails.
          </p>
        </div>

        <RepairItemsTable
          title="Tenant responsibility"
          items={tenantItems}
          contractors={contractors}
          onChange={setTenantItems}
          readOnly={tenantTableLocked}
          lockedHint={
            tenantTableLocked
              ? rc.tenantQuoteResponse === 'accepted'
                ? 'Locked — tenant agreed'
                : 'Locked — awaiting tenant reply'
              : undefined
          }
          footerAction={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs"
              disabled={busy || tenantTableLocked}
              onClick={() => void sendQuoteEmail('tenant')}
            >
              <Send className="size-3.5" />
              Email tenant (tenant items only)
            </Button>
          }
        />
        <RepairItemsTable
          title="Landlord responsibility"
          items={landlordItems}
          contractors={contractors}
          onChange={setLandlordItems}
          footerAction={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs"
              disabled={busy}
              onClick={() => void sendQuoteEmail('landlord')}
            >
              <Send className="size-3.5" />
              Email landlord (tenant + landlord items)
            </Button>
          }
        />

        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() => void saveRepairItems()}
        >
          Save repair items & draft summary
        </Button>
      </section>
    </div>
  );
}
