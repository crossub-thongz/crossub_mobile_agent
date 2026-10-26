'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import {
  TRUST_BILL_PRIORITIES,
  TRUST_BILL_PRIORITY_LABEL,
  TRUST_EDIT_BILL_COPY as COPY,
  TRUST_INPUT_LIMITS,
  type TrustBillPriority,
} from '@/constants/trust';
import {
  updateTrustBill,
  type TrustAccountCode,
  type TrustBill,
  type UpdateTrustBillInput,
} from '@/lib/crossub-api/agent-trust-client';
import { billCategoryCodes } from '@/lib/trust-accounting';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Edit a bill not yet paid: details, due date, priority, invoice number and category. */
export function TrustEditBillDialog({
  agencyId,
  bill,
  accountCodes,
  onClose,
  onSaved,
}: {
  agencyId: string;
  bill: TrustBill;
  accountCodes: readonly TrustAccountCode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = billCategoryCodes(accountCodes);
  const [details, setDetails] = useState(bill.details);
  const [dueDate, setDueDate] = useState(bill.dueDate ?? '');
  const [priority, setPriority] = useState<TrustBillPriority>(bill.priority);
  const [invoiceReference, setInvoiceReference] = useState(bill.invoiceReference ?? '');
  const [accountCodeId, setAccountCodeId] = useState(bill.accountCode.id);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const trimmed = details.trim();
    if (!trimmed) {
      toast.error(COPY.detailsRequired);
      return;
    }
    const input: UpdateTrustBillInput = {};
    if (trimmed !== bill.details) input.details = trimmed;
    if (dueDate !== (bill.dueDate ?? '')) input.dueDate = dueDate || null;
    if (priority !== bill.priority) input.priority = priority;
    if (invoiceReference.trim() !== (bill.invoiceReference ?? '')) input.invoiceReference = invoiceReference.trim() || null;
    if (accountCodeId !== bill.accountCode.id) input.accountCodeId = accountCodeId;
    setPending(true);
    try {
      await updateTrustBill(agencyId, bill.id, input);
      toast.success(COPY.saved(bill.billNumber));
      onSaved();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.title(bill.billNumber)}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-edit-bill-details">{COPY.details}</Label>
            <Input
              id="trust-edit-bill-details"
              value={details}
              maxLength={TRUST_INPUT_LIMITS.billDetailsMax}
              disabled={pending}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-edit-bill-due">{COPY.dueDate}</Label>
              <Input
                id="trust-edit-bill-due"
                type="date"
                value={dueDate}
                min={bill.billDate}
                disabled={pending}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-edit-bill-priority">{COPY.priority}</Label>
              <select
                id="trust-edit-bill-priority"
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
            <Label htmlFor="trust-edit-bill-invoice">{COPY.invoiceReference}</Label>
            <Input
              id="trust-edit-bill-invoice"
              value={invoiceReference}
              maxLength={TRUST_INPUT_LIMITS.invoiceReferenceMax}
              disabled={pending}
              onChange={(e) => setInvoiceReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trust-edit-bill-category">{COPY.category}</Label>
            <select
              id="trust-edit-bill-category"
              className={SELECT_CLASS}
              value={accountCodeId}
              disabled={pending}
              onChange={(e) => setAccountCodeId(e.target.value)}
            >
              {categories.some((code) => code.id === bill.accountCode.id) ? null : (
                <option value={bill.accountCode.id}>
                  {bill.accountCode.code} · {bill.accountCode.name}
                </option>
              )}
              {categories.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} · {code.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
