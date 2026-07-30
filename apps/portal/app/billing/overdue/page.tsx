'use client';

import { CreditCard, Loader2, Lock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CrossubLogo } from '@/components/brand/crossub-logo';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  fetchAgentBillingSummary,
  listAgentOpenInvoices,
  payAgentMonthlyInvoice,
  type AgentBillingMonthlyInvoice,
  type AgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';

function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(iso));
}

export default function BillingOverduePage() {
  const { logout } = useAuth();
  const [summary, setSummary] = useState<AgentBillingSummary | null>(null);
  const [invoices, setInvoices] = useState<AgentBillingMonthlyInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [billing, openInvoices] = await Promise.all([
        fetchAgentBillingSummary(),
        listAgentOpenInvoices(),
      ]);
      setSummary(billing);
      setInvoices(openInvoices);

      if (!billing.billingBlocked) {
        window.location.replace(ROUTES.DASHBOARD);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const payInvoice = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      const result = await payAgentMonthlyInvoice(invoiceId);
      if (result.paymentComplete) {
        toast.success('Invoice paid — restoring access…');
        window.location.replace(ROUTES.DASHBOARD);
        return;
      }
      toast.message('Complete payment in Stripe to unlock your account.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-4 py-4">
        <CrossubLogo className="h-7 w-auto" />
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Account locked</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your platform invoice is more than 7 days overdue. Pay the outstanding balance
                below to restore full access to the Agent app.
              </p>
            </div>
          </div>

          {summary && summary.outstandingInvoiceAmount > 0 ? (
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {formatAud(summary.outstandingInvoiceAmount)}
              </p>
              {summary.openInvoiceNumber ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Invoice {summary.openInvoiceNumber}
                  {summary.nextInvoiceDueDate
                    ? ` · due ${formatDate(summary.nextInvoiceDueDate)}`
                    : null}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open invoices found. Contact CROSSUB support if you believe this is an error.
              </p>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAud(invoice.amountDue)} · due {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                  <Button
                    onClick={() => void payInvoice(invoice.id)}
                    disabled={payingId === invoice.id}
                  >
                    {payingId === invoice.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    Pay invoice
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
