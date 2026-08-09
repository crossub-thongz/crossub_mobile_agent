'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  fetchAgentMonthlyInvoice,
  type AgentBillingMonthlyInvoice,
  type AgentBillingMonthlyInvoiceDetail,
} from '@/lib/crossub-api/agent-billing-client';
import { cn, formatCurrency } from '@/lib/utils';

const SERVICE_LABEL: Record<string, string> = {
  open_inspection: 'Open inspection',
  routine_inspection: 'Routine inspection',
  ingoing_inspection: 'Ingoing inspection',
  outgoing_inspection: 'Outgoing inspection',
  tribunal: 'Tribunal',
  service_fee: 'Full Service fee',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(iso));
}

function serviceLabel(raw: string): string {
  return SERVICE_LABEL[raw] ?? raw.replace(/_/g, ' ');
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

  const invoiceId = state?.invoice.id;

  useEffect(() => {
    if (!invoiceId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchAgentMonthlyInvoice(invoiceId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load invoice');
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId, onOpenChange]);

  const lineTotal = useMemo(
    () => (detail?.lineItems ?? []).reduce((sum, row) => sum + row.amount, 0),
    [detail?.lineItems],
  );

  const invoice = state?.invoice;

  return (
    <Dialog open={state != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" elevated>
        <DialogHeader>
          <DialogTitle>Monthly platform invoice</DialogTitle>
          <DialogDescription>
            {invoice?.invoiceNumber ?? 'Invoice'} · {formatWhen(invoice?.periodStart)} –{' '}
            {formatWhen(invoice?.periodEnd)}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{detail.status}</span>
              </div>
              {detail.periodToken ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Billing period</span>
                  <span className="font-medium">{detail.periodToken}</span>
                </div>
              ) : null}
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
              {detail.serviceFeePercent != null ? (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Full Service fee rate</span>
                  <span className="font-medium">{detail.serviceFeePercent}% of management income</span>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Line items
              </p>
              {detail.lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No line items recorded on this invoice.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {detail.lineItems.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{serviceLabel(row.serviceType)}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{row.description}</p>
                        {row.createdByName ? (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Created by {row.createdByName}
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

            <div
              className={cn(
                'flex items-center justify-between rounded-lg border px-3 py-2',
                detail.status === 'paid'
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-border bg-card',
              )}
            >
              <span className="text-sm font-medium">
                {detail.status === 'paid' ? 'Amount paid' : 'Amount due'}
              </span>
              <span className="text-base font-semibold tabular-nums">
                {formatCurrency(detail.status === 'paid' ? lineTotal : detail.amountDue)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
