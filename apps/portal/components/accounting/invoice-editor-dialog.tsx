'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  InvoiceDocument,
  type InvoiceDocumentModel,
} from '@/components/accounting/invoice-document';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createInvoice,
  fetchInvoice,
  updateInvoice,
  type AgentCreateInvoiceInput,
  type AgentInvoiceDetail,
} from '@/lib/crossub-api/agent-client';
import {
  calendarDaysInclusive,
  computeInvoiceTotals,
  defaultInvoicePeriod,
  formatInvoiceDate,
  managementFeeAmount,
  periodRentFromWeekly,
} from '@/lib/invoice-math';
import type { Agency, Property } from '@/lib/types';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

const selectClass =
  'border-input bg-background flex h-9 w-full min-w-0 rounded-md border px-2.5 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

const cellInputClass = 'h-9 text-sm';

type ManagementLine = {
  propertyId: string;
  propertyAddress: string;
  rent: string;
  pmFeeGst: 'include' | 'exclude';
  serviceRate: string;
  amount: string;
};

type SimpleLine = {
  propertyId: string;
  propertyAddress: string;
  description: string;
  amount: string;
};

function emptyManagementLine(): ManagementLine {
  return {
    propertyId: '',
    propertyAddress: '',
    rent: '',
    pmFeeGst: 'exclude',
    serviceRate: '',
    amount: '',
  };
}

function emptySimpleLine(): SimpleLine {
  return {
    propertyId: '',
    propertyAddress: '',
    description: '',
    amount: '',
  };
}

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function asOptionalId(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function InvoiceEditorDialog({
  open,
  onOpenChange,
  mode,
  invoiceId,
  agency,
  properties,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  invoiceId?: string | null;
  agency: Agency | null;
  properties: Property[];
  onSaved: () => void;
}) {
  const defaults = defaultInvoicePeriod();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(defaults.invoiceDate);
  const [dueDate, setDueDate] = useState(defaults.dueDate);
  const [periodStart, setPeriodStart] = useState(defaults.periodStart);
  const [periodEnd, setPeriodEnd] = useState(defaults.periodEnd);
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [abn, setAbn] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankBsb, setBankBsb] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [managementFee, setManagementFee] = useState<ManagementLine[]>([
    emptyManagementLine(),
  ]);
  const [lettingTribunal, setLettingTribunal] = useState<SimpleLine[]>([]);
  const [otherService, setOtherService] = useState<SimpleLine[]>([]);

  const propertyOptions = useMemo(
    () =>
      properties
        .filter((p) => !agency || p.agencyId === agency.id)
        .map((p) => ({
          id: p.id,
          label: formatPropertyFullAddress(p),
          rentWeekly: p.rentWeekly ?? 0,
          serviceRate: p.managementRatePercent ?? 0,
          pmFeeGst: p.managementRateGst === 'include' ? 'include' : 'exclude',
        })),
    [properties, agency],
  );

  useEffect(() => {
    if (!open) return;

    if (mode === 'create') {
      const period = defaultInvoicePeriod();
      setInvoiceNumber('');
      setInvoiceDate(period.invoiceDate);
      setDueDate(period.dueDate);
      setPeriodStart(period.periodStart);
      setPeriodEnd(period.periodEnd);
      setReference('');
      setEmail(agency?.contactEmail ?? '');
      setAbn(agency?.abn ?? '');
      setLicenceNumber(agency?.licenceNumber ?? '');
      setBankName(agency?.bankName ?? '');
      setBankAccountName(agency?.bankAccountName ?? '');
      setBankBsb(agency?.bankBsb ?? '');
      setBankAccountNumber(agency?.bankAccountNumber ?? '');
      setManagementFee([emptyManagementLine()]);
      setLettingTribunal([]);
      setOtherService([]);
      return;
    }

    if (!invoiceId) return;
    let cancelled = false;
    setLoading(true);
    void fetchInvoice(invoiceId)
      .then((detail) => {
        if (cancelled) return;
        applyDetail(detail);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load invoice');
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, invoiceId, agency, onOpenChange]);

  function applyDetail(detail: AgentInvoiceDetail) {
    setInvoiceNumber(detail.invoiceNumber ?? '');
    setInvoiceDate(detail.invoiceDate.slice(0, 10));
    setDueDate(detail.dueDate?.slice(0, 10) ?? '');
    setPeriodStart(detail.periodStart.slice(0, 10));
    setPeriodEnd(detail.periodEnd.slice(0, 10));
    setReference(detail.reference ?? '');
    setEmail(detail.email ?? '');
    setAbn(detail.abn ?? '');
    setLicenceNumber(detail.licenceNumber ?? '');
    setBankName(detail.bank?.bankName ?? '');
    setBankAccountName(detail.bank?.accountName ?? '');
    setBankBsb(detail.bank?.bsb ?? '');
    setBankAccountNumber(detail.bank?.accountNumber ?? '');
    setManagementFee(
      detail.managementFee.length > 0
        ? detail.managementFee.map((l) => ({
            propertyId: l.propertyId,
            propertyAddress: l.propertyAddress,
            rent: String(l.rent),
            pmFeeGst: l.pmFeeGst,
            serviceRate: String(l.serviceRate),
            amount: String(l.amount),
          }))
        : [emptyManagementLine()],
    );
    setLettingTribunal(
      detail.lettingTribunal.map((l) => ({
        propertyId: asOptionalId(l.propertyId),
        propertyAddress: l.propertyAddress,
        description: l.description,
        amount: String(l.amount),
      })),
    );
    setOtherService(
      detail.otherService.map((l) => ({
        propertyId: asOptionalId(l.propertyId),
        propertyAddress: l.propertyAddress,
        description: l.description,
        amount: String(l.amount),
      })),
    );
  }

  function fillManagementFromProperty(
    index: number,
    propertyId: string,
    start = periodStart,
    end = periodEnd,
  ) {
    const prop = propertyOptions.find((p) => p.id === propertyId);
    if (!prop) return;
    const rent = periodRentFromWeekly(prop.rentWeekly, start, end);
    const amount = managementFeeAmount(rent, prop.serviceRate);
    setManagementFee((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              propertyId: prop.id,
              propertyAddress: prop.label,
              rent: rent ? String(rent) : '',
              pmFeeGst: prop.pmFeeGst as 'include' | 'exclude',
              serviceRate: prop.serviceRate ? String(prop.serviceRate) : '',
              amount: amount ? String(amount) : '',
            }
          : line,
      ),
    );
  }

  function recomputeManagementAmounts(start: string, end: string) {
    setManagementFee((prev) =>
      prev.map((line) => {
        if (!line.propertyId) return line;
        const prop = propertyOptions.find((p) => p.id === line.propertyId);
        if (!prop) return line;
        const rent = periodRentFromWeekly(prop.rentWeekly, start, end);
        const rate = num(line.serviceRate) || prop.serviceRate;
        return {
          ...line,
          rent: rent ? String(rent) : line.rent,
          amount: String(managementFeeAmount(rent || num(line.rent), rate)),
        };
      }),
    );
  }

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        managementFee: managementFee
          .filter((l) => l.propertyId)
          .map((l) => ({
            amount: num(l.amount),
            pmFeeGst: l.pmFeeGst,
          })),
        lettingTribunal: lettingTribunal.map((l) => ({ amount: num(l.amount) })),
        otherService: otherService.map((l) => ({ amount: num(l.amount) })),
      }),
    [managementFee, lettingTribunal, otherService],
  );

  const periodDays = calendarDaysInclusive(periodStart, periodEnd);

  const previewModel: InvoiceDocumentModel = {
    invoiceNumber: invoiceNumber.trim() || 'Draft',
    invoiceDate,
    dueDate,
    periodStart,
    periodEnd,
    agencyName: agency?.name ?? '',
    licenceNumber,
    reference,
    email,
    abn,
    managementFee: managementFee
      .filter((l) => l.propertyId)
      .map((l) => ({
        propertyAddress: l.propertyAddress,
        rent: num(l.rent),
        pmFeeGst: l.pmFeeGst,
        serviceRate: num(l.serviceRate),
        amount: num(l.amount),
      })),
    lettingTribunal: lettingTribunal
      .filter((l) => l.description.trim() || l.amount)
      .map((l) => ({
        propertyAddress: l.propertyAddress,
        description: l.description,
        amount: num(l.amount),
      })),
    otherService: otherService
      .filter((l) => l.description.trim() || l.amount)
      .map((l) => ({
        propertyAddress: l.propertyAddress,
        description: l.description,
        amount: num(l.amount),
      })),
    totalManagementFee: totals.managementFee,
    totalLettingTribunal: totals.lettingTribunal,
    totalOtherService: totals.otherService,
    subtotal: totals.subtotal,
    totalGst: totals.gst,
    totalAud: totals.total,
    bank: {
      bankName,
      accountName: bankAccountName,
      bsb: bankBsb,
      accountNumber: bankAccountNumber,
    },
  };

  async function handleSave() {
    if (!agency) {
      toast.error('Agency profile is required to create an invoice');
      return;
    }
    if (!invoiceDate || !periodStart || !periodEnd) {
      toast.error('Invoice date and period are required');
      return;
    }
    if (periodStart > periodEnd) {
      toast.error('Period From must be on or before To');
      return;
    }

    const body: AgentCreateInvoiceInput = {
      agencyId: agency.id,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceDate,
      dueDate: dueDate || undefined,
      periodStart,
      periodEnd,
      reference: reference.trim() || undefined,
      email: email.trim() || undefined,
      abn: abn.trim() || undefined,
      licenceNumber: licenceNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccountName: bankAccountName.trim() || undefined,
      bankBsb: bankBsb.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      managementFee: managementFee
        .filter((l) => l.propertyId)
        .map((l) => ({
          propertyId: l.propertyId,
          propertyAddress: l.propertyAddress,
          rent: num(l.rent),
          pmFeeGst: l.pmFeeGst,
          serviceRate: num(l.serviceRate),
          amount: num(l.amount),
        })),
      lettingTribunal: lettingTribunal
        .filter((l) => l.description.trim() || num(l.amount) > 0)
        .map((l) => ({
          propertyId: l.propertyId || null,
          propertyAddress: l.propertyAddress || '—',
          description: l.description.trim() || '—',
          amount: num(l.amount),
        })),
      otherService: otherService
        .filter((l) => l.description.trim() || num(l.amount) > 0)
        .map((l) => ({
          propertyId: l.propertyId || null,
          propertyAddress: l.propertyAddress || '—',
          description: l.description.trim() || '—',
          amount: num(l.amount),
        })),
    };

    setSaving(true);
    try {
      if (mode === 'edit' && invoiceId) {
        await updateInvoice(invoiceId, body);
        toast.success('Invoice updated');
      } else {
        await createInvoice(body);
        toast.success('Invoice created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        elevated
        className="flex h-[min(96vh,920px)] w-[min(98vw,90rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 text-left sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-lg">
                {mode === 'edit' ? 'Edit tax invoice' : 'Create tax invoice'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {agency?.name ?? 'Agency'} · Crossub management fee invoice
              </DialogDescription>
            </div>
            {periodDays > 0 ? (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-right">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                  Service period
                </p>
                <p className="mt-0.5 text-sm font-medium tabular-nums">
                  {formatInvoiceDate(periodStart)} – {formatInvoiceDate(periodEnd)}
                </p>
                <p className="text-muted-foreground text-xs">{periodDays} days</p>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading invoice…
          </div>
        ) : (
          <>
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
              {/* Editor */}
              <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                <Section title="Invoice details">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Invoice number">
                      <Input
                        className={cellInputClass}
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Auto if blank"
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Invoice date">
                      <Input
                        className={cellInputClass}
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Due date">
                      <Input
                        className={cellInputClass}
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Reference">
                      <Input
                        className={cellInputClass}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="From">
                      <Input
                        className={cellInputClass}
                        type="date"
                        value={periodStart}
                        onChange={(e) => {
                          const next = e.target.value;
                          setPeriodStart(next);
                          recomputeManagementAmounts(next, periodEnd);
                        }}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="To">
                      <Input
                        className={cellInputClass}
                        type="date"
                        value={periodEnd}
                        onChange={(e) => {
                          const next = e.target.value;
                          setPeriodEnd(next);
                          recomputeManagementAmounts(periodStart, next);
                        }}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Agency">
                      <Input className={cellInputClass} value={agency?.name ?? ''} disabled />
                    </Field>
                    <Field label="Licence number">
                      <Input
                        className={cellInputClass}
                        value={licenceNumber}
                        onChange={(e) => setLicenceNumber(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="ABN" className="sm:col-span-1 xl:col-span-2">
                      <Input
                        className={cellInputClass}
                        value={abn}
                        onChange={(e) => setAbn(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Email" className="sm:col-span-1 xl:col-span-2">
                      <Input
                        className={cellInputClass}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                  </div>
                </Section>

                <Section
                  title="Management fee"
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() =>
                        setManagementFee((prev) => [...prev, emptyManagementLine()])
                      }
                    >
                      <Plus className="size-3.5" />
                      Add property
                    </Button>
                  }
                >
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground border-b text-left text-[11px] font-semibold uppercase tracking-wide">
                          <th className="w-10 px-2 py-2.5">#</th>
                          <th className="px-2 py-2.5">Property</th>
                          <th className="w-28 px-2 py-2.5">Rent</th>
                          <th className="w-32 px-2 py-2.5">PM fee</th>
                          <th className="w-24 px-2 py-2.5">Rate %</th>
                          <th className="w-28 px-2 py-2.5">Amount</th>
                          <th className="w-10 px-2 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {managementFee.map((line, index) => (
                          <tr key={`mf-${index}`} className="border-b last:border-b-0">
                            <td className="text-muted-foreground px-2 py-2 tabular-nums">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className={selectClass}
                                value={line.propertyId}
                                disabled={saving}
                                onChange={(e) =>
                                  fillManagementFromProperty(index, e.target.value)
                                }
                              >
                                <option value="">Select property</option>
                                {propertyOptions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                className={cellInputClass}
                                type="number"
                                min={0}
                                step={0.01}
                                value={line.rent}
                                disabled={saving}
                                onChange={(e) => {
                                  const rent = e.target.value;
                                  setManagementFee((prev) =>
                                    prev.map((l, i) =>
                                      i === index
                                        ? {
                                            ...l,
                                            rent,
                                            amount: String(
                                              managementFeeAmount(
                                                num(rent),
                                                num(l.serviceRate),
                                              ),
                                            ),
                                          }
                                        : l,
                                    ),
                                  );
                                }}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <select
                                className={selectClass}
                                value={line.pmFeeGst}
                                disabled={saving}
                                onChange={(e) =>
                                  setManagementFee((prev) =>
                                    prev.map((l, i) =>
                                      i === index
                                        ? {
                                            ...l,
                                            pmFeeGst: e.target.value as
                                              | 'include'
                                              | 'exclude',
                                          }
                                        : l,
                                    ),
                                  )
                                }
                              >
                                <option value="include">Inc. GST</option>
                                <option value="exclude">Ex. GST</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                className={cellInputClass}
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                value={line.serviceRate}
                                disabled={saving}
                                onChange={(e) => {
                                  const serviceRate = e.target.value;
                                  setManagementFee((prev) =>
                                    prev.map((l, i) =>
                                      i === index
                                        ? {
                                            ...l,
                                            serviceRate,
                                            amount: String(
                                              managementFeeAmount(
                                                num(l.rent),
                                                num(serviceRate),
                                              ),
                                            ),
                                          }
                                        : l,
                                    ),
                                  );
                                }}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                className={cellInputClass}
                                type="number"
                                min={0}
                                step={0.01}
                                value={line.amount}
                                disabled={saving}
                                onChange={(e) =>
                                  setManagementFee((prev) =>
                                    prev.map((l, i) =>
                                      i === index
                                        ? { ...l, amount: e.target.value }
                                        : l,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="px-1 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive size-8"
                                disabled={saving || managementFee.length <= 1}
                                onClick={() =>
                                  setManagementFee((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <SectionTotal
                    label="Total management fee"
                    amount={totals.managementFee}
                  />
                </Section>

                <SimpleLinesTable
                  title="Letting & tribunal"
                  lines={lettingTribunal}
                  setLines={setLettingTribunal}
                  propertyOptions={propertyOptions}
                  saving={saving}
                  totalLabel="Total letting & tribunal"
                  total={totals.lettingTribunal}
                />

                <SimpleLinesTable
                  title="Other service fees"
                  lines={otherService}
                  setLines={setOtherService}
                  propertyOptions={propertyOptions}
                  saving={saving}
                  totalLabel="Total other services"
                  total={totals.otherService}
                />

                <Section title="Bank details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Bank name">
                      <Input
                        className={cellInputClass}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Account name">
                      <Input
                        className={cellInputClass}
                        value={bankAccountName}
                        onChange={(e) => setBankAccountName(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="BSB">
                      <Input
                        className={cellInputClass}
                        value={bankBsb}
                        onChange={(e) => setBankBsb(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                    <Field label="Account number">
                      <Input
                        className={cellInputClass}
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        disabled={saving}
                      />
                    </Field>
                  </div>
                </Section>
              </div>

              {/* Live preview */}
              <aside className="border-border bg-muted/20 hidden min-h-0 flex-col border-l lg:flex">
                <div className="border-border shrink-0 border-b px-4 py-3">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Live preview
                  </p>
                  <p className="mt-0.5 text-sm font-medium">Tax invoice</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="rounded-lg border bg-white p-5 shadow-sm">
                    <InvoiceDocument invoice={previewModel} />
                  </div>
                </div>
              </aside>
            </div>

            <footer className="border-border flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card px-5 py-3 sm:px-6">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
                <TotalChip label="Subtotal" value={formatMoney(totals.subtotal)} />
                <TotalChip label="GST" value={formatMoney(totals.gst)} />
                <TotalChip label="Total AUD" value={formatMoney(totals.total)} emphasize />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={loading || saving || !agency}
                  onClick={() => void handleSave()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving…
                    </>
                  ) : mode === 'edit' ? (
                    'Save changes'
                  ) : (
                    'Create invoice'
                  )}
                </Button>
              </div>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-muted-foreground mb-1.5 text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SectionTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-end">
      <p className="text-sm">
        <span className="text-muted-foreground">{label}</span>{' '}
        <span className="font-semibold tabular-nums">{formatMoney(amount)}</span>
      </p>
    </div>
  );
}

function TotalChip({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>{' '}
      <span
        className={cn(
          'tabular-nums',
          emphasize ? 'text-base font-bold' : 'font-medium',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SimpleLinesTable({
  title,
  lines,
  setLines,
  propertyOptions,
  saving,
  totalLabel,
  total,
}: {
  title: string;
  lines: SimpleLine[];
  setLines: React.Dispatch<React.SetStateAction<SimpleLine[]>>;
  propertyOptions: Array<{ id: string; label: string }>;
  saving: boolean;
  totalLabel: string;
  total: number;
}) {
  return (
    <Section
      title={title}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => setLines((prev) => [...prev, emptySimpleLine()])}
        >
          <Plus className="size-3.5" />
          Add line
        </Button>
      }
    >
      {lines.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          No lines yet — optional for this invoice.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground border-b text-left text-[11px] font-semibold uppercase tracking-wide">
                <th className="w-10 px-2 py-2.5">#</th>
                <th className="px-2 py-2.5">Property</th>
                <th className="px-2 py-2.5">Description</th>
                <th className="w-28 px-2 py-2.5">Amount</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${title}-${index}`} className="border-b last:border-b-0">
                  <td className="text-muted-foreground px-2 py-2 tabular-nums">
                    {index + 1}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className={selectClass}
                      value={line.propertyId}
                      disabled={saving}
                      onChange={(e) => {
                        const id = e.target.value;
                        const prop = propertyOptions.find((p) => p.id === id);
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index
                              ? {
                                  ...l,
                                  propertyId: id,
                                  propertyAddress: prop?.label ?? '',
                                }
                              : l,
                          ),
                        );
                      }}
                    >
                      <option value="">Select property</option>
                      {propertyOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      className={cellInputClass}
                      value={line.description}
                      disabled={saving}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, description: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      className={cellInputClass}
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.amount}
                      disabled={saving}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, amount: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-1 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8"
                      disabled={saving}
                      onClick={() =>
                        setLines((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SectionTotal label={totalLabel} amount={total} />
    </Section>
  );
}
