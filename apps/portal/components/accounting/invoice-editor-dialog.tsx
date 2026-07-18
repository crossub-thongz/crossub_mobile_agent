'use client';

import { useEffect, useMemo, useState } from 'react';
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
  DialogFooter,
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
  computeInvoiceTotals,
  defaultInvoicePeriod,
  managementFeeAmount,
  periodRentFromWeekly,
} from '@/lib/invoice-math';
import type { Agency, Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

const selectClass =
  'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

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
  const [showPreview, setShowPreview] = useState(false);

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
      setShowPreview(false);
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

    const managementPayload = managementFee
      .filter((l) => l.propertyId)
      .map((l) => ({
        propertyId: l.propertyId,
        propertyAddress: l.propertyAddress,
        rent: num(l.rent),
        pmFeeGst: l.pmFeeGst,
        serviceRate: num(l.serviceRate),
        amount: num(l.amount),
      }));

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
      managementFee: managementPayload,
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
        className="flex max-h-[92vh] w-[min(96vw,56rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 text-left">
          <DialogTitle>{mode === 'edit' ? 'Edit invoice' : 'Create invoice'}</DialogTitle>
          <DialogDescription>
            Crossub tax invoice template with management fee, letting & tribunal, and other
            service lines.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading invoice…
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Invoice Number">
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Auto-generated if blank"
                  disabled={saving}
                />
              </Field>
              <Field label="Invoice Date">
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Agency Name">
                <Input value={agency?.name ?? ''} disabled />
              </Field>
              <Field label="Licence Number">
                <Input
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="From">
                <Input
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
              <Field label="Reference">
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Due Date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="ABN">
                <Input value={abn} onChange={(e) => setAbn(e.target.value)} disabled={saving} />
              </Field>
            </div>

            <LineSection
              title="Crossub Management Fee"
              onAdd={() => setManagementFee((prev) => [...prev, emptyManagementLine()])}
            >
              {managementFee.map((line, index) => (
                <div
                  key={`mf-${index}`}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6"
                >
                  <Field label="#" className="sm:col-span-1">
                    <Input value={String(index + 1)} disabled />
                  </Field>
                  <Field label="Property Address" className="sm:col-span-5">
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
                  </Field>
                  <Field label="Rent ($AUD)">
                    <Input
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
                                    managementFeeAmount(num(rent), num(l.serviceRate)),
                                  ),
                                }
                              : l,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Field label="PM Fee">
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
                                  pmFeeGst: e.target.value as 'include' | 'exclude',
                                }
                              : l,
                          ),
                        )
                      }
                    >
                      <option value="include">Include GST</option>
                      <option value="exclude">Exclude GST</option>
                    </select>
                  </Field>
                  <Field label="Service Rate %">
                    <Input
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
                                    managementFeeAmount(num(l.rent), num(serviceRate)),
                                  ),
                                }
                              : l,
                          ),
                        );
                      }}
                    />
                  </Field>
                  <Field label="Amount AUD">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.amount}
                      disabled={saving}
                      onChange={(e) =>
                        setManagementFee((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, amount: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </Field>
                  <div className="sm:col-span-6 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      disabled={saving || managementFee.length <= 1}
                      onClick={() =>
                        setManagementFee((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-sm font-medium">
                Total Management Fee {formatMoney(totals.managementFee)}
              </p>
            </LineSection>

            <SimpleLineEditor
              title="Letting & Tribunal Cost"
              lines={lettingTribunal}
              setLines={setLettingTribunal}
              propertyOptions={propertyOptions}
              saving={saving}
              totalLabel="Total Letting and Tribunal Cost"
              total={totals.lettingTribunal}
            />

            <SimpleLineEditor
              title="Other Service Fee"
              lines={otherService}
              setLines={setOtherService}
              propertyOptions={propertyOptions}
              saving={saving}
              totalLabel="Total Other Service Fee"
              total={totals.otherService}
            />

            <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg border p-3 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
              <Row label="Total GST" value={formatMoney(totals.gst)} />
              <Row label="Total AUD" value={formatMoney(totals.total)} strong />
            </div>

            <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-sm font-semibold">Bank Details</p>
              <Field label="Bank Name">
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Account Name">
                <Input
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="BSB">
                <Input
                  value={bankBsb}
                  onChange={(e) => setBankBsb(e.target.value)}
                  disabled={saving}
                />
              </Field>
              <Field label="Account Number">
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>

            {showPreview ? (
              <div className="rounded-lg border p-4">
                <InvoiceDocument invoice={previewModel} />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="shrink-0 border-t px-4 py-3 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={loading || saving}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Hide preview' : 'Preview'}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={loading || saving || !agency} onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : mode === 'edit' ? (
                'Save changes'
              ) : (
                'Create invoice'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-muted-foreground mb-1.5 text-xs">{label}</Label>
      {children}
    </div>
  );
}

function LineSection({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 size-3.5" />
          Add line
        </Button>
      </div>
      {children}
    </section>
  );
}

function SimpleLineEditor({
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
    <LineSection title={title} onAdd={() => setLines((prev) => [...prev, emptySimpleLine()])}>
      {lines.length === 0 ? (
        <p className="text-muted-foreground text-sm">No lines yet.</p>
      ) : (
        lines.map((line, index) => (
          <div key={`${title}-${index}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-6">
            <Field label="#" className="sm:col-span-1">
              <Input value={String(index + 1)} disabled />
            </Field>
            <Field label="Property Address" className="sm:col-span-5">
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
            </Field>
            <Field label="Description" className="sm:col-span-4">
              <Input
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
            </Field>
            <Field label="Amount ($AUD)" className="sm:col-span-2">
              <Input
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
            </Field>
            <div className="sm:col-span-6 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={saving}
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="mr-1 size-3.5" />
                Remove
              </Button>
            </div>
          </div>
        ))
      )}
      <p className="text-sm font-medium">
        {totalLabel} {formatMoney(total)}
      </p>
    </LineSection>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Contract sometimes types nullable UUID fields as `Record<string, never>`. */
function asOptionalId(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
