'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchAgentTribunalRentChasingPrefill,
  markAgentPropertyArrearsPaid,
  type AgentTribunalRentChasingPrefill,
} from '@/lib/crossub-api/agent-workflow-client';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';

type ArrearsKind = 'rent' | 'bill' | 'bond';

const KIND_LABEL: Record<ArrearsKind, string> = {
  rent: 'Rent',
  bill: 'Bills',
  bond: 'Bond',
};

function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  subtitle?: string;
  onPaid?: () => void;
}) {
  const { refresh } = useAgentData();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefill, setPrefill] = useState<AgentTribunalRentChasingPrefill | null>(null);
  const [paidDate, setPaidDate] = useState(localDateInputValue);
  const [selectedKinds, setSelectedKinds] = useState<ArrearsKind[]>([]);

  const outstandingKinds = useMemo(
    () =>
      [...new Set((prefill?.arrears ?? []).map((row) => row.kind))] as ArrearsKind[],
    [prefill],
  );

  useEffect(() => {
    if (!open || !propertyId) return;
    let cancelled = false;
    setLoading(true);
    setPrefill(null);
    setPaidDate(localDateInputValue());
    setSelectedKinds([]);
    void fetchAgentTribunalRentChasingPrefill(propertyId)
      .then((next) => {
        if (cancelled) return;
        setPrefill(next);
        setSelectedKinds([
          ...new Set(next.arrears.map((row) => row.kind)),
        ] as ArrearsKind[]);
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

  const toggleKind = (kind: ArrearsKind) => {
    setSelectedKinds((prev) =>
      prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind],
    );
  };

  const markPaid = async () => {
    if (!propertyId) return;
    if (!paidDate) {
      toast.error('Choose the paid date');
      return;
    }
    if (selectedKinds.length === 0) {
      toast.error('Select at least one arrears type to mark paid');
      return;
    }

    setSaving(true);
    try {
      await markAgentPropertyArrearsPaid(propertyId, {
        paidDate,
        kinds: selectedKinds,
      });
      toast.success('Arrears marked as paid');
      const next = await fetchAgentTribunalRentChasingPrefill(propertyId);
      setPrefill(next);
      setSelectedKinds([
        ...new Set(next.arrears.map((row) => row.kind)),
      ] as ArrearsKind[]);
      await refresh();
      onPaid?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark arrears paid');
    } finally {
      setSaving(false);
    }
  };

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

          {outstandingKinds.length > 0 ? (
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <div>
                <h3 className="text-sm font-semibold">Mark as paid</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Choose the date the tenant paid, then tick the arrears to clear.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Paid date</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(event) => setPaidDate(event.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                {outstandingKinds.map((kind) => (
                  <label
                    key={kind}
                    className="inline-flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border"
                      checked={selectedKinds.includes(kind)}
                      onChange={() => toggleKind(kind)}
                      disabled={saving}
                    />
                    {KIND_LABEL[kind]}
                  </label>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={saving || selectedKinds.length === 0 || !paidDate}
                onClick={() => void markPaid()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Mark as paid'
                )}
              </Button>
            </section>
          ) : null}

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
