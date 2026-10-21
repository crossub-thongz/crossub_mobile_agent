'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustAddSupplierDialog } from '@/components/agent/trust/trust-add-supplier-dialog';
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
  TRUST_BILL_PRIORITIES,
  TRUST_BILL_PRIORITY,
  TRUST_BILL_PRIORITY_LABEL,
  TRUST_LEDGER_KIND,
  TRUST_LEDGER_STATUS,
  TRUST_NEW_BILL_COPY as COPY,
  TRUST_PAGE_SIZE_MAX,
  TRUST_SUPPLIER_COPY,
  type TrustBillPriority,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  createTrustBill,
  fetchTrustLedgers,
  type TrustAccountCode,
} from '@/lib/crossub-api/agent-trust-client';
import { billCategoryCodes, parseDollarsToCents, trustTodayKey } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function TrustNewBillDialog({
  agencyId,
  bankAccountId,
  accountCodes,
  onClose,
  onCreated,
}: {
  agencyId: string;
  bankAccountId: string;
  accountCodes: readonly TrustAccountCode[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const scope = `${agencyId}:${bankAccountId}`;
  const owners = useTrustResource(scope, () =>
    fetchTrustLedgers(agencyId, bankAccountId, {
      kind: TRUST_LEDGER_KIND.OWNER,
      status: TRUST_LEDGER_STATUS.OPEN,
      pageSize: TRUST_PAGE_SIZE_MAX,
    }),
  );
  const suppliers = useTrustResource(scope, () =>
    fetchTrustLedgers(agencyId, bankAccountId, {
      kind: TRUST_LEDGER_KIND.SUPPLIER,
      status: TRUST_LEDGER_STATUS.OPEN,
      pageSize: TRUST_PAGE_SIZE_MAX,
    }),
  );
  const categories = billCategoryCodes(accountCodes);

  const [ownerLedgerId, setOwnerLedgerId] = useState('');
  const [supplierLedgerId, setSupplierLedgerId] = useState('');
  const [accountCodeId, setAccountCodeId] = useState('');
  const [billDate, setBillDate] = useState(trustTodayKey);
  const [dueDate, setDueDate] = useState('');
  const [details, setDetails] = useState('');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState<TrustBillPriority>(TRUST_BILL_PRIORITY.NORMAL);
  const [pending, setPending] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);

  const lookupsLoading = owners.loading || suppliers.loading;
  const lookupError = owners.error ?? suppliers.error;
  const noSuppliers = suppliers.data != null && suppliers.data.items.length === 0;
  const noCategories = categories.length === 0;

  async function onSubmit() {
    const amountCents = parseDollarsToCents(amount);
    if (
      !ownerLedgerId ||
      !supplierLedgerId ||
      !accountCodeId ||
      !billDate ||
      !details.trim() ||
      amountCents == null ||
      amountCents <= 0
    ) {
      toast.error(COPY.incomplete);
      return;
    }
    setPending(true);
    try {
      const bill = await createTrustBill(agencyId, bankAccountId, {
        ownerLedgerId,
        supplierLedgerId,
        accountCodeId,
        billDate,
        dueDate: dueDate || undefined,
        details: details.trim(),
        invoiceReference: invoiceReference.trim() || undefined,
        amountCents,
        priority,
      });
      toast.success(COPY.saved(bill.billNumber));
      onCreated();
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY.title}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {lookupError ? (
            <p className="text-destructive text-sm">{apiErrorMessage(lookupError)}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-bill-owner">{COPY.owner}</Label>
            <select
              id="trust-bill-owner"
              className={SELECT_CLASS}
              value={ownerLedgerId}
              disabled={pending || lookupsLoading}
              onChange={(e) => setOwnerLedgerId(e.target.value)}
            >
              <option value="">{COPY.chooseOwner}</option>
              {owners.data?.items.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.code} · {ledger.name}
                  {ledger.propertyReferenceAddress ? ` · ${ledger.propertyReferenceAddress}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-bill-supplier">{COPY.supplier}</Label>
            <select
              id="trust-bill-supplier"
              className={SELECT_CLASS}
              value={supplierLedgerId}
              disabled={pending || lookupsLoading || noSuppliers}
              onChange={(e) => setSupplierLedgerId(e.target.value)}
            >
              <option value="">{COPY.chooseSupplier}</option>
              {suppliers.data?.items.map((ledger) => (
                <option key={ledger.id} value={ledger.id}>
                  {ledger.name}
                </option>
              ))}
            </select>
            {noSuppliers ? <p className="text-muted-foreground text-xs">{COPY.noSuppliers}</p> : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={pending || lookupsLoading}
              onClick={() => setAddingSupplier(true)}
            >
              {TRUST_SUPPLIER_COPY.add}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-bill-category">{COPY.category}</Label>
            <select
              id="trust-bill-category"
              className={SELECT_CLASS}
              value={accountCodeId}
              disabled={pending || lookupsLoading || noCategories}
              onChange={(e) => setAccountCodeId(e.target.value)}
            >
              <option value="">{COPY.chooseCategory}</option>
              {categories.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} · {code.name}
                </option>
              ))}
            </select>
            {noCategories ? <p className="text-muted-foreground text-xs">{COPY.noCategories}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-bill-date">{COPY.billDate}</Label>
              <Input
                id="trust-bill-date"
                type="date"
                value={billDate}
                disabled={pending}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-bill-due">{COPY.dueDate}</Label>
              <Input
                id="trust-bill-due"
                type="date"
                value={dueDate}
                min={billDate || undefined}
                disabled={pending}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-bill-details">{COPY.details}</Label>
            <Input
              id="trust-bill-details"
              value={details}
              disabled={pending}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-bill-amount">{COPY.amount}</Label>
              <Input
                id="trust-bill-amount"
                inputMode="decimal"
                value={amount}
                disabled={pending}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-bill-priority">{COPY.priority}</Label>
              <select
                id="trust-bill-priority"
                className={SELECT_CLASS}
                value={priority}
                disabled={pending}
                onChange={(e) => setPriority(e.target.value as TrustBillPriority)}
              >
                {TRUST_BILL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TRUST_BILL_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-bill-reference">{COPY.invoiceReference}</Label>
            <Input
              id="trust-bill-reference"
              value={invoiceReference}
              disabled={pending}
              onChange={(e) => setInvoiceReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button
            type="button"
            disabled={pending || lookupsLoading || noSuppliers || noCategories}
            onClick={() => void onSubmit()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
        {addingSupplier ? (
          <TrustAddSupplierDialog
            agencyId={agencyId}
            bankAccountId={bankAccountId}
            onClose={() => setAddingSupplier(false)}
            onAdded={(supplier) => {
              suppliers.reload();
              setSupplierLedgerId(supplier.id);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
