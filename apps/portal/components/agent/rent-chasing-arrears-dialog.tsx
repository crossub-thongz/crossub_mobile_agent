'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import {
  fetchAgentTribunalRentChasingPrefill,
  type AgentTribunalRentChasingPrefill,
} from '@/lib/crossub-api/agent-workflow-client';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';

function ArrearsDetailGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ArrearsTable({ rows }: { rows: AgentTribunalRentChasingPrefill['arrears'] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No arrears recorded for this property.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.kind}-${row.name}-${index}`} className="border-t">
              <td className="px-3 py-2 capitalize">{row.kind}</td>
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {row.amount != null ? formatCurrency(row.amount) : '—'}
              </td>
              <td className="text-muted-foreground px-3 py-2 tabular-nums">
                {row.dueDate ? formatDate(row.dueDate) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RentChasingArrearsDialog({
  open,
  onOpenChange,
  propertyId,
  subtitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  subtitle?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [prefill, setPrefill] = useState<AgentTribunalRentChasingPrefill | null>(null);

  useEffect(() => {
    if (!open || !propertyId) return;
    let cancelled = false;
    setLoading(true);
    setPrefill(null);
    void fetchAgentTribunalRentChasingPrefill(propertyId)
      .then((next) => {
        if (!cancelled) setPrefill(next);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Could not load arrears');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, propertyId]);

  return (
    <CaseDetailDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Rent chasing"
      subtitle={subtitle ?? 'Accounting arrears on file'}
      size={JOB_CASE_DIALOG_SIZE}
    >
      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading arrears…
        </div>
      ) : prefill ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">{prefill.tenantName ?? '—'}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{prefill.propertyAddress}</p>
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Arrears</h3>
            <ArrearsTable rows={prefill.arrears} />
          </section>

          {prefill.rentArrears ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Rent</h3>
              <ArrearsDetailGrid
                items={[
                  {
                    label: 'Rent amount',
                    value:
                      prefill.rentArrears.rentAmount != null
                        ? formatCurrency(prefill.rentArrears.rentAmount)
                        : '—',
                  },
                  {
                    label: 'Payment cycle',
                    value: prefill.rentArrears.paymentCycle ?? '—',
                  },
                  {
                    label: 'Rent paid to',
                    value: prefill.rentArrears.rentPaidTo
                      ? formatDate(prefill.rentArrears.rentPaidTo)
                      : '—',
                  },
                ]}
              />
            </section>
          ) : null}

          {prefill.billArrears.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Bills</h3>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prefill.billArrears.map((bill, index) => (
                      <tr key={`${bill.billType}-${index}`} className="border-t">
                        <td className="px-3 py-2">{bill.billName ?? bill.billType ?? '—'}</td>
                        <td className="text-muted-foreground px-3 py-2 tabular-nums">
                          {bill.dueDate ? formatDate(bill.dueDate) : '—'}
                        </td>
                        <td className="px-3 py-2 font-medium tabular-nums">
                          {bill.amount != null ? formatCurrency(bill.amount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {prefill.bondArrears ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Bond</h3>
              <ArrearsDetailGrid
                items={[
                  {
                    label: 'Agreement end date',
                    value: prefill.bondArrears.agreementEndDate
                      ? formatDate(prefill.bondArrears.agreementEndDate)
                      : '—',
                  },
                  {
                    label: 'Bond amount',
                    value:
                      prefill.bondArrears.bondAmount != null
                        ? formatCurrency(prefill.bondArrears.bondAmount)
                        : '—',
                  },
                  {
                    label: 'Notes',
                    value: prefill.bondArrears.notes?.trim() || '—',
                  },
                ]}
              />
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No arrears data available.</p>
      )}
    </CaseDetailDialog>
  );
}
