'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { PROPERTY_CONTACT_ROLE } from '@/constants/property-contact';
import {
  PROPERTY_RENT_PERIOD,
  PROPERTY_RENT_PERIOD_LABEL,
  PROPERTY_RENT_PERIOD_ORDER,
  type PropertyRentPeriod,
} from '@/constants/property-profile-edit';
import {
  EDIT_TENANCY_COPY as COPY,
  TENANCY_LEASE_TERM_TYPE,
  TENANCY_LEASE_TERM_TYPE_LABEL,
  type TenancyLeaseTermType,
} from '@/constants/property-tenancies';
import { patchAgentProperty, type AgentPropertyPatch } from '@/lib/crossub-api/agent-client';
import type { PropertyTenancyOverview } from '@/lib/crossub-api/agent-tenancy-client';
import type { Property } from '@/lib/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { dayKey } from '@/utils/current-tenancy';
import {
  openVacatingCaseForDisplayedTenancy,
  parseAmountInput,
  rentAmountForPeriod,
  resolveTenancyVacateDate,
  weeklyRentFromPeriodAmount,
} from '@/utils/property-tenancy-overview';

import { ContactListEditor } from './contact-list-editor';

const SELECT_CLASS = 'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

type TenancyForm = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  leaseType: TenancyLeaseTermType;
  leaseStartDate: string;
  leaseEndDate: string;
  vacateDate: string;
  nextRentReviewAt: string;
  rentPeriod: PropertyRentPeriod;
  rentAmount: string;
  paymentReference: string;
  bondAmount: string;
  depositAmount: string;
};

const amountText = (value: number | null | undefined) => (value != null && value > 0 ? String(value) : '');

function formFrom(property: Property, record: PropertyTenancyOverview): TenancyForm {
  const rentPeriod = property.rentPeriod ?? PROPERTY_RENT_PERIOD.WEEKLY;
  const leaseEnd = dayKey(property.leaseEnd) ?? dayKey(record.overview.leaseEndDate) ?? '';
  const weekly = record.financial.currentRentWeekly ?? property.rentWeekly;
  return {
    tenantName: property.tenantName?.trim() ?? '',
    tenantEmail: property.tenantContact?.email ?? '',
    tenantPhone: property.tenantContact?.phone ?? '',
    leaseType: leaseEnd ? TENANCY_LEASE_TERM_TYPE.FIXED : TENANCY_LEASE_TERM_TYPE.PERIODIC,
    leaseStartDate: dayKey(property.leaseStart) ?? dayKey(record.overview.leaseStartDate) ?? '',
    leaseEndDate: leaseEnd,
    vacateDate: resolveTenancyVacateDate(record) ?? dayKey(property.vacateDate) ?? '',
    nextRentReviewAt: dayKey(property.nextRentReview) ?? dayKey(record.overview.nextRentReviewDate) ?? '',
    rentPeriod,
    rentAmount: amountText(weekly ? rentAmountForPeriod(weekly, rentPeriod) : null),
    paymentReference: property.paymentReference ?? '',
    bondAmount: amountText(record.financial.bondAmount ?? property.bondAmount),
    depositAmount: amountText(record.financial.depositAmount ?? property.depositAmount),
  };
}

/** Only the fields the agent changed, so an untouched field never rewrites what is on file. */
function changedPatch(before: TenancyForm, after: TenancyForm): AgentPropertyPatch {
  const patch: AgentPropertyPatch = {};
  const text = (a: string, b: string) => a.trim() !== b.trim();
  if (text(before.tenantName, after.tenantName)) patch.tenantName = after.tenantName.trim();
  if (text(before.tenantEmail, after.tenantEmail) && after.tenantEmail.trim()) {
    patch.tenantEmail = after.tenantEmail.trim();
  }
  if (text(before.tenantPhone, after.tenantPhone) && after.tenantPhone.trim()) {
    patch.tenantPhone = after.tenantPhone.trim();
  }
  if (after.leaseStartDate !== before.leaseStartDate) patch.leaseStartDate = after.leaseStartDate;
  // Periodic has no fixed end: switching to it clears the end the fixed term had.
  const leaseEnd = after.leaseType === TENANCY_LEASE_TERM_TYPE.FIXED ? after.leaseEndDate : '';
  if (leaseEnd !== before.leaseEndDate) patch.leaseEndDate = leaseEnd || null;
  // A blanked date clears it (null); an untouched one is not sent.
  if (after.vacateDate !== before.vacateDate) patch.vacateDate = after.vacateDate || null;
  if (after.nextRentReviewAt !== before.nextRentReviewAt) {
    patch.nextRentReviewAt = after.nextRentReviewAt || null;
  }
  if (after.rentPeriod !== before.rentPeriod) patch.rentPeriod = after.rentPeriod;
  const rent = parseAmountInput(after.rentAmount);
  if ((text(before.rentAmount, after.rentAmount) || after.rentPeriod !== before.rentPeriod) && rent) {
    patch.rentWeekly = weeklyRentFromPeriodAmount(rent, after.rentPeriod);
  }
  if (text(before.paymentReference, after.paymentReference)) {
    patch.paymentReference = after.paymentReference.trim() || null;
  }
  const bond = parseAmountInput(after.bondAmount);
  if (text(before.bondAmount, after.bondAmount) && bond != null) patch.bondAmount = bond;
  const deposit = parseAmountInput(after.depositAmount);
  if (text(before.depositAmount, after.depositAmount) && deposit != null) patch.depositAmount = deposit;
  return patch;
}

/**
 * Edit tenancy (the pencil on the Overview Tenancy card): the tenant contacts, the statutory
 * notice line and the lease terms, through the agent property and contact routes.
 */
export function EditTenancyDialog({
  open,
  onOpenChange,
  property,
  record,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  record: PropertyTenancyOverview;
  onSaved: () => void;
}) {
  const [initial, setInitial] = useState<TenancyForm | null>(null);
  const [form, setForm] = useState<TenancyForm | null>(null);
  const [saving, setSaving] = useState(false);
  const vacatingCase = openVacatingCaseForDisplayedTenancy(record);
  const tenantContacts = record.contacts.filter((c) => c.role === PROPERTY_CONTACT_ROLE.TENANT);

  useEffect(() => {
    if (!open) return;
    const seeded = formFrom(property, record);
    setInitial(seeded);
    setForm(seeded);
    // Seed once per open; contact edits reload `record` and must not reset the typed form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof TenancyForm>(key: K, value: TenancyForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!form || !initial) return;
    if (!form.tenantName.trim()) return void toast.error(COPY.NOTICE_NAME_REQUIRED);
    if (!form.leaseStartDate) return void toast.error(COPY.LEASE_START_REQUIRED);
    if (form.leaseType === TENANCY_LEASE_TERM_TYPE.FIXED && !form.leaseEndDate) {
      return void toast.error(COPY.LEASE_END_REQUIRED);
    }
    let patch: AgentPropertyPatch;
    try {
      patch = changedPatch(initial, vacatingCase ? { ...form, vacateDate: initial.vacateDate } : form);
    } catch {
      return void toast.error(COPY.INVALID_AMOUNT);
    }
    setSaving(true);
    try {
      if (Object.keys(patch).length > 0) await patchAgentProperty(property.id, patch);
      toast.success(COPY.DONE);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
    } finally {
      setSaving(false);
    }
  };

  const textField = (id: string, label: string, key: keyof TenancyForm, type = 'text', disabled = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        disabled={disabled}
        value={form ? String(form[key]) : ''}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <DialogDescription>{COPY.DESCRIPTION}</DialogDescription>
        </DialogHeader>

        {form ? (
          <div className="space-y-5">
            <section className="space-y-2">
              <p className="text-sm font-semibold">{COPY.TENANTS}</p>
              <ContactListEditor
                propertyId={property.id}
                role={PROPERTY_CONTACT_ROLE.TENANT}
                contacts={tenantContacts}
                emptyLabel={COPY.NO_TENANTS}
                addLabel={COPY.ADD_TENANT}
                onChanged={onSaved}
              />
            </section>

            <section className="space-y-3">
              <div className="space-y-1.5">
                {textField('tenancy-notice-name', COPY.NOTICE_NAME, 'tenantName')}
                <p className="text-muted-foreground text-[11px]">{COPY.NOTICE_HINT}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {textField('tenancy-notice-email', COPY.NOTICE_EMAIL, 'tenantEmail', 'email')}
                {textField('tenancy-notice-phone', COPY.NOTICE_PHONE, 'tenantPhone', 'tel')}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tenancy-lease-type">{COPY.LEASE_TYPE}</Label>
                <select
                  id="tenancy-lease-type"
                  className={SELECT_CLASS}
                  value={form.leaseType}
                  onChange={(e) => set('leaseType', e.target.value as TenancyLeaseTermType)}
                >
                  {Object.values(TENANCY_LEASE_TERM_TYPE).map((type) => (
                    <option key={type} value={type}>
                      {TENANCY_LEASE_TERM_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </div>
              {textField('tenancy-lease-start', COPY.LEASE_START, 'leaseStartDate', 'date')}
              {form.leaseType === TENANCY_LEASE_TERM_TYPE.FIXED
                ? textField('tenancy-lease-end', COPY.LEASE_END, 'leaseEndDate', 'date')
                : null}
              <div className="space-y-1.5">
                {textField('tenancy-vacate', COPY.VACATE_DATE, 'vacateDate', 'date', Boolean(vacatingCase))}
                {vacatingCase ? (
                  <p className="text-muted-foreground text-[11px]">{COPY.VACATE_ON_CASE}</p>
                ) : null}
              </div>
              {textField('tenancy-next-review', COPY.NEXT_RENT_REVIEW, 'nextRentReviewAt', 'date')}
              <div className="space-y-1.5">
                <Label htmlFor="tenancy-rent-period">{COPY.RENT_PERIOD}</Label>
                <select
                  id="tenancy-rent-period"
                  className={SELECT_CLASS}
                  value={form.rentPeriod}
                  onChange={(e) => set('rentPeriod', e.target.value as PropertyRentPeriod)}
                >
                  {PROPERTY_RENT_PERIOD_ORDER.map((period) => (
                    <option key={period} value={period}>
                      {PROPERTY_RENT_PERIOD_LABEL[period]}
                    </option>
                  ))}
                </select>
              </div>
              {textField('tenancy-rent', COPY.RENT, 'rentAmount')}
              {textField('tenancy-payment-ref', COPY.PAYMENT_REFERENCE, 'paymentReference')}
              {textField('tenancy-bond', COPY.BOND, 'bondAmount')}
              {textField('tenancy-deposit', COPY.DEPOSIT, 'depositAmount')}
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            {COPY.CANCEL}
          </Button>
          <Button type="button" disabled={saving || !form} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.SAVE}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
