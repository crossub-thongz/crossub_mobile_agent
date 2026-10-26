'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { FilterChips } from '@/components/agent/filter-chips';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
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
import { TRUST_LEDGER_KIND, TRUST_LEDGER_STATUS, TRUST_PAGE_SIZE_MAX } from '@/constants/trust';
import {
  TRUST_ATTACHMENT_MIME_TYPES,
  TRUST_INVOICE_DUE_DAYS,
  TRUST_INVOICE_FROM,
  TRUST_INVOICE_FROM_OPTIONS,
  TRUST_INVOICE_LIMITS,
  TRUST_NEW_INVOICE_COPY as COPY,
  type TrustInvoiceFrom,
} from '@/constants/trust-invoices';
import { useTrustResource } from '@/hooks/use-trust-resource';
import { fetchTrustLedgers, type TrustAccountCode, type TrustLedger } from '@/lib/crossub-api/agent-trust-client';
import {
  createTrustTenantInvoice,
  type CreateTrustTenantInvoiceInput,
  type TrustTenantInvoice,
} from '@/lib/crossub-api/agent-trust-invoices-client';
import { feeCategoryCodes, parseDollarsToCents, shiftTrustDateKey, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { toTrustAttachment, trustAttachmentProblem } from '@/utils/trust-invoices';

function ledgerLabel(ledger: TrustLedger): string {
  const address = ledger.propertyReferenceAddress ?? ledger.propertyAddress;
  return `${ledger.code} · ${ledger.name}${address ? ` · ${address}` : ''}`;
}

/**
 * Create a tenant invoice (D50): money the tenant owes the property's owner or a supplier. It is
 * dated today and due in 21 days unless changed (D123); issuing it writes no ledger entry.
 * Mount it per open; `fixedTenant` fixes the tenant when opened from a tenant ledger.
 */
export function TrustNewInvoiceDialog({
  agencyId,
  bankAccountId,
  accountCodes,
  fixedTenant,
  onClose,
  onCreated,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  fixedTenant?: TrustLedger | null;
  onClose: () => void;
  onCreated: (invoice: TrustTenantInvoice) => void;
}) {
  const scope = `${agencyId}:${bankAccountId}`;
  const tenants = useTrustResource(fixedTenant ? null : scope, () =>
    fetchTrustLedgers(agencyId, bankAccountId, {
      kind: TRUST_LEDGER_KIND.TENANT,
      status: TRUST_LEDGER_STATUS.OPEN,
      pageSize: TRUST_PAGE_SIZE_MAX,
    }),
  );
  const [tenantId, setTenantId] = useState(fixedTenant?.id ?? '');
  const tenant = fixedTenant ?? tenants.data?.items.find((ledger) => ledger.id === tenantId) ?? null;
  const propertyId = tenant?.propertyId ?? null;

  const [from, setFrom] = useState<TrustInvoiceFrom>(TRUST_INVOICE_FROM.OWNER);
  // "From owner": the owner ledgers on the tenant's property (one is the one); else every owner.
  const owners = useTrustResource(tenant ? `${scope}:${propertyId ?? ''}` : null, () =>
    fetchTrustLedgers(agencyId, bankAccountId, {
      kind: TRUST_LEDGER_KIND.OWNER,
      status: TRUST_LEDGER_STATUS.OPEN,
      propertyId: propertyId ?? undefined,
      pageSize: TRUST_PAGE_SIZE_MAX,
    }),
  );
  const suppliers = useTrustResource(from === TRUST_INVOICE_FROM.SUPPLIER ? scope : null, () =>
    fetchTrustLedgers(agencyId, bankAccountId, {
      kind: TRUST_LEDGER_KIND.SUPPLIER,
      status: TRUST_LEDGER_STATUS.OPEN,
      pageSize: TRUST_PAGE_SIZE_MAX,
    }),
  );
  const ownerOptions = owners.data?.items ?? [];
  const [ownerId, setOwnerId] = useState('');
  const effectiveOwnerId = ownerId || (ownerOptions.length === 1 ? ownerOptions[0].id : '');
  const [supplierId, setSupplierId] = useState('');

  const types = feeCategoryCodes(accountCodes);
  const [accountCodeId, setAccountCodeId] = useState('');
  const type = types.find((code) => code.id === accountCodeId) ?? null;

  const [invoiceDate] = useState(trustTodayKey);
  const [dueDate, setDueDate] = useState(() => shiftTrustDateKey(invoiceDate, TRUST_INVOICE_DUE_DAYS));
  const [period, setPeriod] = useState('');
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');
  const [gst, setGst] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const lookupError = tenants.error ?? owners.error ?? suppliers.error;
  const noTypes = types.length === 0;
  const beneficiaryId = from === TRUST_INVOICE_FROM.SUPPLIER ? supplierId : effectiveOwnerId;

  function validate(): CreateTrustTenantInvoiceInput | string {
    if (!tenant) return COPY.tenantRequired;
    if (!beneficiaryId) return COPY.beneficiaryRequired(from);
    if (!accountCodeId) return COPY.typeRequired;
    const trimmed = details.trim();
    if (!trimmed) return COPY.detailsRequired;
    const amountCents = parseDollarsToCents(amount);
    if (amountCents == null || amountCents <= 0) return COPY.amountInvalid;
    let gstCents: number | undefined;
    if (type?.gstApplies && gst.trim()) {
      const typed = parseDollarsToCents(gst);
      if (typed == null || typed > amountCents) return COPY.gstInvalid;
      gstCents = typed;
    }
    if (!dueDate) return COPY.dueRequired;
    if (dueDate < invoiceDate) return COPY.dueBeforeToday;
    if (file) {
      const problem = trustAttachmentProblem(file);
      if (problem) return problem;
    }
    return {
      tenantLedgerId: tenant.id,
      beneficiaryLedgerId: beneficiaryId,
      accountCodeId,
      invoiceDate,
      dueDate,
      details: trimmed,
      period: period.trim() || undefined,
      amountCents,
      gstCents,
    };
  }

  async function onSubmit() {
    const body = validate();
    if (typeof body === 'string') {
      toast.error(body);
      return;
    }
    setPending(true);
    try {
      const invoice = await createTrustTenantInvoice(agencyId, bankAccountId, {
        ...body,
        attachment: file ? await toTrustAttachment(file) : undefined,
      });
      toast.success(COPY.created(invoice.invoiceNumber));
      onCreated(invoice);
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {lookupError ? <p className="text-destructive text-sm">{apiErrorMessage(lookupError)}</p> : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-invoice-tenant">{COPY.tenant}</Label>
            {fixedTenant ? (
              <p id="trust-invoice-tenant" className="rounded-lg border px-3 py-2 text-sm">
                {ledgerLabel(fixedTenant)}
              </p>
            ) : (
              <select
                id="trust-invoice-tenant"
                className={SELECT_CLASS}
                value={tenantId}
                disabled={pending || tenants.loading}
                onChange={(e) => {
                  setTenantId(e.target.value);
                  setOwnerId('');
                }}
              >
                <option value="">{COPY.chooseTenant}</option>
                {tenants.data?.items.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledgerLabel(ledger)}
                  </option>
                ))}
              </select>
            )}
            {tenants.data && tenants.data.items.length === 0 ? (
              <p className="text-muted-foreground text-xs">{COPY.noTenants}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>{COPY.from}</Label>
            <FilterChips options={TRUST_INVOICE_FROM_OPTIONS} value={from} onChange={setFrom} />
          </div>

          {from === TRUST_INVOICE_FROM.SUPPLIER ? (
            <div className="space-y-1.5">
              <Label htmlFor="trust-invoice-supplier">{COPY.supplier}</Label>
              <select
                id="trust-invoice-supplier"
                className={SELECT_CLASS}
                value={supplierId}
                disabled={pending || suppliers.loading}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">{COPY.chooseSupplier}</option>
                {suppliers.data?.items.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledger.name}
                  </option>
                ))}
              </select>
              {suppliers.data && suppliers.data.items.length === 0 ? (
                <p className="text-muted-foreground text-xs">{COPY.noSuppliers}</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="trust-invoice-owner">{COPY.owner}</Label>
              <select
                id="trust-invoice-owner"
                className={SELECT_CLASS}
                value={effectiveOwnerId}
                disabled={pending || !tenant || owners.loading}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">{COPY.chooseOwner}</option>
                {ownerOptions.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledgerLabel(ledger)}
                  </option>
                ))}
              </select>
              {tenant && owners.data && ownerOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">{COPY.noOwnerOnProperty}</p>
              ) : null}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="trust-invoice-type">{COPY.type}</Label>
            <select
              id="trust-invoice-type"
              className={SELECT_CLASS}
              value={accountCodeId}
              disabled={pending || noTypes}
              onChange={(e) => {
                setAccountCodeId(e.target.value);
                setGst('');
              }}
            >
              <option value="">{COPY.chooseType}</option>
              {types.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.name}
                </option>
              ))}
            </select>
            {noTypes ? <p className="text-muted-foreground text-xs">{COPY.noTypes}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-invoice-due">{COPY.dueDate}</Label>
              <Input
                id="trust-invoice-due"
                type="date"
                value={dueDate}
                min={invoiceDate}
                disabled={pending}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-invoice-period">{COPY.period}</Label>
              <Input
                id="trust-invoice-period"
                value={period}
                maxLength={TRUST_INVOICE_LIMITS.periodMax}
                placeholder={COPY.periodPlaceholder}
                disabled={pending}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trust-invoice-details">{COPY.details}</Label>
            <Input
              id="trust-invoice-details"
              value={details}
              maxLength={TRUST_INVOICE_LIMITS.detailsMax}
              placeholder={COPY.detailsPlaceholder}
              disabled={pending}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-invoice-amount">{COPY.amount}</Label>
              <Input
                id="trust-invoice-amount"
                inputMode="decimal"
                value={amount}
                placeholder="0.00"
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-invoice-gst">{COPY.gst}</Label>
              <Input
                id="trust-invoice-gst"
                inputMode="decimal"
                value={gst}
                placeholder={type?.gstApplies ? '' : '0.00'}
                disabled={pending || !type?.gstApplies}
                onChange={(e) => setGst(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">{type && !type.gstApplies ? COPY.noGst : COPY.gstHint}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trust-invoice-attachment">{COPY.attachment}</Label>
            {file ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{file.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={pending}
                  onClick={() => setFile(null)}
                >
                  {COPY.attachmentRemove}
                </Button>
              </div>
            ) : (
              <Input
                id="trust-invoice-attachment"
                type="file"
                accept={TRUST_ATTACHMENT_MIME_TYPES.join(',')}
                disabled={pending}
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;
                  const problem = picked ? trustAttachmentProblem(picked) : null;
                  if (problem) {
                    toast.error(problem);
                    e.target.value = '';
                    return;
                  }
                  setFile(picked);
                }}
              />
            )}
            <p className="text-muted-foreground text-xs">{COPY.attachmentHint}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || noTypes} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
