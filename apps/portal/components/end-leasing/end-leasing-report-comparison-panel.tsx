'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Plus,
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
  TerminationCaseDetail,
} from '@/lib/end-leasing/types';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { terminationApi } from '@/lib/termination-case-api';
import { formatDateTime } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function SummaryEmailPanel({ email }: { email: EndLeasingOverviewEmail }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="text-primary size-4" />
          <p className="text-sm font-semibold">Draft summary message</p>
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

function RepairItemsTable({
  title,
  items,
  onChange,
  readOnly,
}: {
  title: string;
  items: ReportComparisonRepairItem[];
  onChange: (items: ReportComparisonRepairItem[]) => void;
  readOnly?: boolean;
}) {
  const updateRow = (index: number, patch: Partial<ReportComparisonRepairItem>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...items, { area: '', description: '' }]);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Area</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              {!readOnly ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 3 : 4}
                  className="text-muted-foreground px-3 py-4 text-center"
                >
                  No items yet.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t">
                  <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      row.area || '—'
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        value={row.area}
                        placeholder="Area"
                        onChange={(e) => updateRow(index, { area: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readOnly ? (
                      row.description || '—'
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        value={row.description}
                        placeholder="Description"
                        onChange={(e) => updateRow(index, { description: e.target.value })}
                      />
                    )}
                  </td>
                  {!readOnly ? (
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
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!readOnly ? (
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={addRow}>
          <Plus className="size-3.5" />
          Add row
        </Button>
      ) : null}
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
  const { apiConnected } = useAgentData();
  const applyCase = useEndLeasingStore((s) => s.applyCase);

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

  const persist = async (patch: Parameters<typeof terminationApi.updateReportComparison>[1]) => {
    setBusy(true);
    try {
      const updated = await terminationApi.updateReportComparison(caseData.id, patch);
      applyCase(updated);
      setTenantItems(updated.reportComparison.tenantResponsibility);
      setLandlordItems(updated.reportComparison.landlordResponsibility);
      toast.success('Comparison updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const rc = caseData.reportComparison;

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
        <SummaryEmailPanel email={rc.draftSummaryEmail} />
      ) : null}

      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Obtain repair quote</p>
          <p className="text-muted-foreground mt-1 text-xs">
            List repair items by responsibility. Saving updates the draft summary message.
          </p>
        </div>

        <RepairItemsTable
          title="Tenant responsibility"
          items={tenantItems}
          onChange={setTenantItems}
        />
        <RepairItemsTable
          title="Landlord responsibility"
          items={landlordItems}
          onChange={setLandlordItems}
        />

        <Button
          type="button"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() =>
            void persist({
              tenantResponsibility: tenantItems.filter(
                (r) => r.area.trim() || r.description.trim(),
              ),
              landlordResponsibility: landlordItems.filter(
                (r) => r.area.trim() || r.description.trim(),
              ),
            })
          }
        >
          Save repair items & draft summary
        </Button>
      </section>
    </div>
  );
}
