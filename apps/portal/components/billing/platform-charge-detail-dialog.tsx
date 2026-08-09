'use client';

import { CreditCard, Info, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { resolvePaymentFlow } from '@/lib/billing/resolve-payment-flow';
import type { StripePaymentDialogState } from '@/components/billing/stripe-payment-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchAgentBillingCharge,
  payAgentBillingCharge,
  type AgentBillingCharge,
  type AgentBillingDefaultPaymentMethod,
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

export type PlatformChargeDetailDialogState = {
  charge: AgentBillingCharge;
  defaultPaymentMethod?: AgentBillingDefaultPaymentMethod | null;
} | null;

type PlatformChargeDetailDialogProps = {
  state: PlatformChargeDetailDialogState;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void | Promise<void>;
  paymentDialog: StripePaymentDialogState | null;
  setPaymentDialog: (state: StripePaymentDialogState | null) => void;
};

export function PlatformChargeDetailDialog({
  state,
  onOpenChange,
  onPaid,
  paymentDialog,
  setPaymentDialog,
}: PlatformChargeDetailDialogProps) {
  const [detail, setDetail] = useState<AgentBillingCharge | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const chargeId = state?.charge.id;

  useEffect(() => {
    if (!chargeId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchAgentBillingCharge(chargeId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load bill');
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chargeId, onOpenChange]);

  const row = detail ?? state?.charge ?? null;
  const payable = row?.status === 'awaiting_payment';

  const pay = async () => {
    if (!row || !payable) return;
    setPaying(true);
    try {
      const result = await payAgentBillingCharge(row.id, { devConfirm: false });
      const outcome = resolvePaymentFlow(
        result,
        {
          title: serviceLabel(row.serviceType),
          description: row.description,
          amountAud: row.amount,
          defaultPaymentMethod: state?.defaultPaymentMethod,
        },
        setPaymentDialog,
      );

      if (outcome === 'complete') {
        toast.success('Payment complete');
        await onPaid();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <Dialog
        open={state != null && paymentDialog == null}
        onOpenChange={(open) => {
          if (!open && paymentDialog != null) return;
          onOpenChange(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" elevated>
          <DialogHeader>
            <DialogTitle>{row ? serviceLabel(row.serviceType) : 'Platform bill'}</DialogTitle>
            <DialogDescription>{row?.description ?? 'Loading bill details…'}</DialogDescription>
          </DialogHeader>

          {loading || !row ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{row.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Collection</span>
                  <span className="font-medium capitalize">{row.collectionMode}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatWhen(row.createdAt)}</span>
                </div>
                {row.paidAt ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium">{formatWhen(row.paidAt)}</span>
                  </div>
                ) : null}
                {row.createdByName ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Ordered by</span>
                    <span className="font-medium">{row.createdByName}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3 rounded-lg border border-sky-500/25 bg-sky-500/5 p-3 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
                <div className="min-w-0">
                  <p className="font-medium">How we charged this</p>
                  {row.calculationSummary ? (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {row.calculationSummary}
                    </p>
                  ) : null}
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed">
                    <li>
                      <span className="text-muted-foreground">Service: </span>
                      <span className="font-medium">{serviceLabel(row.serviceType)}</span>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Property / job: </span>
                      <span>{row.description}</span>
                    </li>
                    {row.calculationDetail ? (
                      <li>
                        <span className="text-muted-foreground">Calculation: </span>
                        <span>{row.calculationDetail}</span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>

              <div
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2',
                  row.status === 'paid'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-border bg-card',
                )}
              >
                <span className="text-sm font-medium">
                  {row.status === 'paid' ? 'Amount paid' : 'Amount due'}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCurrency(row.amount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {payable && row ? (
              <Button
                type="button"
                onClick={() => void pay()}
                disabled={paying || paymentDialog != null}
              >
                {paying ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Pay {formatCurrency(row.amount)}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
