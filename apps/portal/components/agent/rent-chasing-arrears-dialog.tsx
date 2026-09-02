'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { CaseDetailDialog } from '@/components/agent/case-detail-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  fetchAgentTribunalRentChasingPrefill,
  markAgentPropertyArrearsPaid,
  type AgentTribunalRentChasingPrefill,
} from '@/lib/crossub-api/agent-workflow-client';
import { JOB_CASE_DIALOG_SIZE } from '@/lib/job-case-dialog';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type ArrearsKind = 'rent' | 'bill' | 'bond';
type ArrearsRow = AgentTribunalRentChasingPrefill['arrears'][number];

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

function arrearsRowKey(row: ArrearsRow, index: number): string {
  return `${row.caseId ?? 'row'}:${row.kind}:${row.billIndex ?? index}`;
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

function ArrearsTable({
  rows,
  selectedKeys,
  onToggle,
  onToggleAll,
  disabled,
}: {
  rows: ArrearsRow[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  onToggleAll: () => void;
  disabled?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No arrears recorded for this property.</p>
    );
  }

  const allSelected = selectedKeys.length === rows.length;

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase tracking-wide">
          <tr>
            <th className="w-10 px-3 py-2 font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border"
                checked={allSelected}
                onChange={onToggleAll}
                disabled={disabled}
                aria-label="Select all arrears"
              />
            </th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = arrearsRowKey(row, index);
            const selected = selectedKeys.includes(key);
            return (
              <tr
                key={key}
                className={cn(
                  'border-t cursor-pointer hover:bg-muted/30',
                  selected && 'bg-primary/5',
                )}
                onClick={() => {
                  if (!disabled) onToggle(key);
                }}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border"
                    checked={selected}
                    onChange={() => onToggle(key)}
                    onClick={(event) => event.stopPropagation()}
                    disabled={disabled}
                    aria-label={`Select ${row.name}`}
                  />
                </td>
                <td className="px-3 py-2 capitalize">{row.kind}</td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2 font-medium tabular-nums">
                  {row.amount != null ? formatCurrency(row.amount) : '—'}
                </td>
                <td className="text-muted-foreground px-3 py-2 tabular-nums">
                  {row.dueDate ? formatDate(row.dueDate) : '—'}
                </td>
              </tr>
            );
          })}
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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [paidDateOpen, setPaidDateOpen] = useState(false);

  const arrears = prefill?.arrears ?? [];

  const selectedKinds = useMemo(
    () =>
      [
        ...new Set(
          arrears
            .filter((row, index) => selectedKeys.includes(arrearsRowKey(row, index)))
            .map((row) => row.kind),
        ),
      ] as ArrearsKind[],
    [arrears, selectedKeys],
  );

  useEffect(() => {
    if (!open || !propertyId) return;
    let cancelled = false;
    setLoading(true);
    setPrefill(null);
    setPaidDate(localDateInputValue());
    setSelectedKeys([]);
    setPaidDateOpen(false);
    void fetchAgentTribunalRentChasingPrefill(propertyId)
      .then((next) => {
        if (cancelled) return;
        setPrefill(next);
        setSelectedKeys(next.arrears.map((row, index) => arrearsRowKey(row, index)));
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

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const toggleAll = () => {
    setSelectedKeys((prev) =>
      prev.length === arrears.length
        ? []
        : arrears.map((row, index) => arrearsRowKey(row, index)),
    );
  };

  const openPaidDateDialog = () => {
    if (selectedKinds.length === 0) {
      toast.error('Select at least one arrears row to mark paid');
      return;
    }
    setPaidDate(localDateInputValue());
    setPaidDateOpen(true);
  };

  const markPaid = async () => {
    if (!propertyId) return;
    if (!paidDate) {
      toast.error('Choose the paid date');
      return;
    }
    if (selectedKinds.length === 0) {
      toast.error('Select at least one arrears row to mark paid');
      return;
    }

    setSaving(true);
    try {
      const items = arrears.flatMap((row, index) => {
        if (!selectedKeys.includes(arrearsRowKey(row, index)) || !row.caseId) {
          return [];
        }
        return [
          {
            caseId: row.caseId,
            kind: row.kind,
            ...(row.billIndex != null ? { billIndex: row.billIndex } : {}),
          },
        ];
      });
      await markAgentPropertyArrearsPaid(
        propertyId,
        items.length > 0
          ? { paidDate, items }
          : { paidDate, kinds: selectedKinds },
      );
      toast.success('Arrears marked as paid');
      setPaidDateOpen(false);
      const next = await fetchAgentTribunalRentChasingPrefill(propertyId);
      setPrefill(next);
      setSelectedKeys(next.arrears.map((row, index) => arrearsRowKey(row, index)));
      await refresh();
      onPaid?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark arrears paid');
    } finally {
      setSaving(false);
    }
  };

  const selectedSummary = selectedKinds.map((kind) => KIND_LABEL[kind]).join(', ');

  return (
    <>
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

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Arrears</h3>
              <ArrearsTable
                rows={arrears}
                selectedKeys={selectedKeys}
                onToggle={toggleRow}
                onToggleAll={toggleAll}
                disabled={saving}
              />
              {arrears.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || selectedKeys.length === 0}
                  onClick={openPaidDateDialog}
                >
                  Mark as paid
                </Button>
              ) : null}
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

      <Dialog open={paidDateOpen} onOpenChange={setPaidDateOpen}>
        <DialogContent elevated className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as paid</DialogTitle>
            <DialogDescription>
              Choose the date the tenant paid
              {selectedSummary ? ` (${selectedSummary})` : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Paid date</Label>
            <Input
              type="date"
              value={paidDate}
              onChange={(event) => setPaidDate(event.target.value)}
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPaidDateOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !paidDate || selectedKinds.length === 0}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
