'use client';

import { Download, Info, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  downloadAgentMonthlyInvoicePdf,
  fetchAgentMonthlyInvoice,
  type AgentBillingMonthlyInvoice,
  type AgentBillingMonthlyInvoiceDetail,
} from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

import { PlatformTaxInvoicePreview } from './platform-tax-invoice-preview';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Management fee',
  letting_fee: 'Letting fee',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeZone: 'Australia/Sydney',
  }).format(new Date(iso));
}

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
}

/** "2 CROSSUB Demo Street (L2A), Haymarket Routine inspection" */
function invoiceLineTitle(serviceType: string, description: string): string {
  const service = serviceLabel(serviceType);
  const marker = ' — ';
  const idx = description.indexOf(marker);
  if (idx === -1) return service;
  const property = description.slice(idx + marker.length).trim();
  return property ? `${property} ${service}` : service;
}

export type PlatformMonthlyInvoiceDialogState = {
  invoice: AgentBillingMonthlyInvoice;
} | null;

type PlatformMonthlyInvoiceDialogProps = {
  state: PlatformMonthlyInvoiceDialogState;
  onOpenChange: (open: boolean) => void;
};

export function PlatformMonthlyInvoiceDialog({
  state,
  onOpenChange,
}: PlatformMonthlyInvoiceDialogProps) {
  const [detail, setDetail] = useState<AgentBillingMonthlyInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const invoiceId = state?.invoice.id;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!invoiceId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setDetail(null);
    setLoading(true);
    void fetchAgentMonthlyInvoice(invoiceId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load invoice');
          onOpenChangeRef.current(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const lineTotal = useMemo(
    () => (detail?.lineItems ?? []).reduce((sum, row) => sum + row.amount, 0),
    [detail?.lineItems],
  );

  const invoice = state?.invoice;
  const showFeeBreakdown =
    (detail?.serviceChargesSubtotal ?? 0) > 0 || (detail?.serviceFeeAmount ?? 0) > 0;

  const downloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const blob = await downloadAgentMonthlyInvoicePdf(invoice.id);
      const fileName = detail?.taxInvoice?.fileName ?? `${invoice.invoiceNumber}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not download invoice');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={state != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl" elevated>
        <DialogHeader>
          <DialogTitle>CROSSUB tax invoice</DialogTitle>
          <DialogDescription>
            {invoice?.invoiceNumber ?? 'Invoice'} · due the 7th · unpaid accounts are held from the
            14th
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail.taxInvoice ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span
                className={cn(
                  'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                  detail.status === 'paid'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : detail.status === 'overdue'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
                )}
              >
                {detail.status}
              </span>
            </div>
            {detail.calculationSummary ? (
              <div className="flex gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {detail.calculationSummary}
                </p>
              </div>
            ) : null}
            <PlatformTaxInvoicePreview invoice={detail.taxInvoice} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2.5 rounded-2xl border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                    detail.status === 'paid'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : detail.status === 'overdue'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
                  )}
                >
                  {detail.status}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Billing period</span>
                <span className="font-medium">
                  {formatWhen(detail.periodStart)} – {formatWhen(detail.periodEnd)}
                </span>
              </div>
              {detail.dueDate ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Due</span>
                  <span className="font-medium">{formatWhen(detail.dueDate)}</span>
                </div>
              ) : null}
              {detail.paidAt ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium">{formatWhen(detail.paidAt)}</span>
                </div>
              ) : null}
            </div>

            {detail.calculationSummary ? (
              <div className="flex gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
                <div>
                  <p className="font-medium">How this invoice is calculated</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {detail.calculationSummary}
                  </p>
                </div>
              </div>
            ) : null}

            {showFeeBreakdown ? (
              <div className="rounded-xl border bg-card p-4 text-sm">
                <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Invoice breakdown
                </p>
                <div className="space-y-1.5">
                  {(detail.serviceChargesSubtotal ?? 0) > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Inspection & tribunal charges</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(detail.serviceChargesSubtotal ?? 0)}
                      </span>
                    </div>
                  ) : null}
                  {(detail.serviceFeeAmount ?? 0) > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        Management fee
                        {detail.serviceFeePercent != null
                          ? ` (${detail.serviceFeePercent}% of management income)`
                          : null}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(detail.serviceFeeAmount ?? 0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3 border-t pt-2 font-semibold">
                    <span>{detail.status === 'paid' ? 'Total paid' : 'Total due'}</span>
                    <span className="tabular-nums">
                      {formatCurrency(detail.status === 'paid' ? lineTotal : detail.amountDue)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Line items
              </p>
              {detail.lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No line items recorded on this invoice.</p>
              ) : (
                <ul className="divide-y overflow-hidden rounded-xl border">
                  {detail.lineItems.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-muted/20">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {invoiceLineTitle(row.serviceType, row.description)}
                        </p>
                        {row.serviceType === 'service_fee' && row.description ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">{row.description}</p>
                        ) : null}
                        {row.calculationDetail ? (
                          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                            {row.calculationDetail}
                          </p>
                        ) : null}
                        {row.createdByName || row.createdAt ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {[
                              row.createdByName ? `Created by ${row.createdByName}` : null,
                              row.createdAt ? `Created ${formatDateTime(row.createdAt)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(row.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!showFeeBreakdown ? (
              <div
                className={cn(
                  'flex items-center justify-between rounded-xl border px-4 py-3',
                  detail.status === 'paid'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-border bg-card',
                )}
              >
                <span className="text-sm font-medium">
                  {detail.status === 'paid' ? 'Amount paid' : 'Amount due'}
                </span>
                <span className="text-lg font-semibold tabular-nums tracking-tight">
                  {formatCurrency(detail.status === 'paid' ? lineTotal : detail.amountDue)}
                </span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={downloading || loading || !invoice}
          >
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
