'use client';

import { useState } from 'react';
import { Plus, UserPlus, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { NATIVE_SELECT_CLASS } from '@/constants/form-controls';
import {
  AGENCY_TENANCY_LEASE_TYPE,
  AGENCY_TENANCY_LEASE_TYPE_LABEL,
  AGENCY_TENANCY_MAX_TENANTS,
  AGENCY_TENANCY_RENT_PERIOD_LABEL,
  AGENCY_TENANCY_RENT_PROFILE_MESSAGE,
  AGENCY_TENANCY_RENT_PROFILE_STATUS,
  type AgencyTenancyRentProfileStatus,
  CREATE_TENANCY_COPY as COPY,
  type AgencyTenancyLeaseType,
  type AgencyTenancyRentPeriod,
} from '@/constants/self-managed-tenancy';
import { useSelfManagedLettingAction } from '@/hooks/use-self-managed-letting';
import { createSelfManagedTenancy } from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_UI } from '@/lib/leasing/constants';
import {
  EMPTY_TENANCY_TENANT,
  buildCreateTenancyInput,
  createTenancyFormFrom,
  hasApprovedApplicant,
  type CreateTenancyForm,
  type TenancyTenantForm,
} from '@/lib/leasing/self-managed-tenancy';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn } from '@/lib/utils';

const CREATE_ACTION = 'create-tenancy';

/**
 * Self-Manage Results: "+ Create tenancy". The agency records the tenants and lease it agreed;
 * the server saves the signed tenancy onto the property and closes the letting. Replaces the
 * application path on this plan. The server refuses once an applicant has been approved.
 */
export function LeasingSelfManagedCreateTenancy({
  detail,
  cycleId,
}: {
  detail: LeasingPropertyDetail;
  cycleId?: string;
}) {
  const { refresh } = useAgentData();
  const { pending, run } = useSelfManagedLettingAction(detail.propertyId, cycleId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateTenancyForm>(() => createTenancyFormFrom(detail));
  const approvedApplicant = hasApprovedApplicant(detail);
  const submitting = pending === CREATE_ACTION;

  const openDialog = () => {
    setForm(createTenancyFormFrom(detail));
    setOpen(true);
  };

  const patch = (next: Partial<CreateTenancyForm>) => setForm((prev) => ({ ...prev, ...next }));
  const patchTenant = (index: number, next: Partial<TenancyTenantForm>) =>
    setForm((prev) => ({
      ...prev,
      tenants: prev.tenants.map((tenant, i) => (i === index ? { ...tenant, ...next } : tenant)),
    }));
  const addTenant = () =>
    setForm((prev) => ({ ...prev, tenants: [...prev.tenants, { ...EMPTY_TENANCY_TENANT }] }));
  const removeTenant = (index: number) =>
    setForm((prev) => ({ ...prev, tenants: prev.tenants.filter((_, i) => i !== index) }));

  const submit = async () => {
    const built = buildCreateTenancyInput(form);
    if ('error' in built) {
      toast.error(built.error);
      return;
    }
    const outcome: { rentProfile?: AgencyTenancyRentProfileStatus } = {};
    const ok = await run(
      CREATE_ACTION,
      async (id) => {
        const result = await createSelfManagedTenancy(detail.propertyId, id, built.input);
        outcome.rentProfile = result.rentProfileStatus;
        return result;
      },
      COPY.created,
    );
    if (!ok) return;
    setOpen(false);
    if (outcome.rentProfile) {
      const message = AGENCY_TENANCY_RENT_PROFILE_MESSAGE[outcome.rentProfile];
      if (outcome.rentProfile === AGENCY_TENANCY_RENT_PROFILE_STATUS.SET) toast.success(message);
      else toast.message(message);
    }
    // The property, its People and the letting lists all read the portfolio.
    void refresh();
  };

  const fixed = form.leaseType === AGENCY_TENANCY_LEASE_TYPE.FIXED;

  return (
    <>
      <section className="bg-card space-y-2 rounded-xl border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{COPY.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {approvedApplicant ? COPY.approvedApplicant : COPY.hint}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={approvedApplicant || submitting}
            onClick={openDialog}
          >
            <UserPlus className="size-3.5" />
            {COPY.open}
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{COPY.dialogTitle}</DialogTitle>
            <DialogDescription>{COPY.dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className={LEASING_UI.sectionLabel}>{COPY.tenantsHeading}</p>
            {form.tenants.map((tenant, index) => (
              <fieldset key={index} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <legend className="text-xs font-semibold">
                    {index === 0 ? COPY.primaryTenant : COPY.coTenant(index)}
                  </legend>
                  {index > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={submitting}
                      onClick={() => removeTenant(index)}
                    >
                      <X className="size-3" />
                      {COPY.removeTenant}
                    </Button>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`tenancy-name-${index}`}>{COPY.name}</Label>
                  <Input
                    id={`tenancy-name-${index}`}
                    value={tenant.name}
                    disabled={submitting}
                    onChange={(e) => patchTenant(index, { name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor={`tenancy-email-${index}`}>{COPY.email}</Label>
                    <Input
                      id={`tenancy-email-${index}`}
                      type="email"
                      value={tenant.email}
                      disabled={submitting}
                      onChange={(e) => patchTenant(index, { email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`tenancy-phone-${index}`}>{COPY.phone}</Label>
                    <Input
                      id={`tenancy-phone-${index}`}
                      type="tel"
                      value={tenant.phone}
                      disabled={submitting}
                      onChange={(e) => patchTenant(index, { phone: e.target.value })}
                    />
                  </div>
                </div>
              </fieldset>
            ))}
            {form.tenants.length < AGENCY_TENANCY_MAX_TENANTS ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn('gap-1.5', LEASING_UI.btnSecondary)}
                disabled={submitting}
                onClick={addTenant}
              >
                <Plus className="size-3.5" />
                {COPY.addCoTenant}
              </Button>
            ) : null}

            <p className={LEASING_UI.sectionLabel}>{COPY.leaseHeading}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tenancy-lease-type">{COPY.leaseType}</Label>
                <select
                  id="tenancy-lease-type"
                  className={NATIVE_SELECT_CLASS}
                  value={form.leaseType}
                  disabled={submitting}
                  onChange={(e) =>
                    patch({ leaseType: e.target.value as AgencyTenancyLeaseType })
                  }
                >
                  {Object.entries(AGENCY_TENANCY_LEASE_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenancy-start">{COPY.leaseStart}</Label>
                <Input
                  id="tenancy-start"
                  type="date"
                  value={form.leaseStartDate}
                  disabled={submitting}
                  onChange={(e) => patch({ leaseStartDate: e.target.value })}
                />
              </div>
              {fixed ? (
                <div className="space-y-1">
                  <Label htmlFor="tenancy-end">{COPY.leaseEnd}</Label>
                  <Input
                    id="tenancy-end"
                    type="date"
                    value={form.leaseEndDate}
                    min={form.leaseStartDate || undefined}
                    disabled={submitting}
                    onChange={(e) => patch({ leaseEndDate: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="tenancy-rent">{COPY.rent}</Label>
                <Input
                  id="tenancy-rent"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rentAmount}
                  disabled={submitting}
                  onChange={(e) => patch({ rentAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenancy-rent-period">{COPY.rentPeriod}</Label>
                <select
                  id="tenancy-rent-period"
                  className={NATIVE_SELECT_CLASS}
                  value={form.rentPeriod}
                  disabled={submitting}
                  onChange={(e) =>
                    patch({ rentPeriod: e.target.value as AgencyTenancyRentPeriod })
                  }
                >
                  {Object.entries(AGENCY_TENANCY_RENT_PERIOD_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenancy-bond">{COPY.bond}</Label>
                <Input
                  id="tenancy-bond"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bond}
                  disabled={submitting}
                  onChange={(e) => patch({ bond: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tenancy-notes">{COPY.notes}</Label>
              <Textarea
                id="tenancy-notes"
                rows={3}
                value={form.notes}
                placeholder={COPY.notesPlaceholder}
                disabled={submitting}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              {COPY.cancel}
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void submit()}>
              {submitting ? COPY.submitting : COPY.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
