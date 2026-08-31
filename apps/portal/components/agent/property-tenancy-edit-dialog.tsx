'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
import {
  dateOnly,
  PropertyVacateDateField,
  vacateDateChangeInvalid,
} from '@/components/agent/property-vacate-date-field';
import { TenancyPagerControls } from '@/components/agent/tenancy-pager-controls';
import {
  addPropertyContact,
  listPropertyContacts,
  updatePropertyContact,
  type AgentPropertyContact,
} from '@/lib/crossub-api/agent-client';
import { MAX_TENANCY_TENANTS, mergeHouseholdTenants } from '@/lib/property-parties';
import { wrapTenancyPageIndex } from '@/lib/tenancy-view-pages';
import { propertyRegistryApi, type PropertyRegistryPatch } from '@/lib/property-registry-api';

type TenancyForm = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  leaseStartDate: string;
  leaseEndDate: string;
  nextRentReviewAt: string;
  rentPaidUntil: string;
  vacateDate: string;
  vacateDateChangeReason: string;
  nextInspectionAt: string;
};

type CoTenantDraft = { name: string; email: string; phone: string };

function contactMatchesPrimary(
  contact: AgentPropertyContact,
  primary: { name: string; email: string },
): boolean {
  const email = contact.email?.trim().toLowerCase() ?? '';
  const primaryEmail = primary.email.trim().toLowerCase();
  if (email.includes('@') && primaryEmail.includes('@') && email === primaryEmail) return true;
  const name = contact.name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  const primaryName = primary.name.trim().toLowerCase().replace(/\s+/g, ' ');
  return Boolean(name && primaryName && name === primaryName);
}

type TenantDraft = {
  name: string;
  email: string;
  phone: string;
  leaseStartDate: string;
  leaseEndDate: string;
  nextRentReviewAt: string;
  rentPaidUntil: string;
  vacateDate: string;
  vacateDateChangeReason: string;
  nextInspectionAt: string;
};

const EMPTY_TENANT_DRAFT: TenantDraft = {
  name: '',
  email: '',
  phone: '',
  leaseStartDate: '',
  leaseEndDate: '',
  nextRentReviewAt: '',
  rentPaidUntil: '',
  vacateDate: '',
  vacateDateChangeReason: '',
  nextInspectionAt: '',
};

function draftFromTenancyForm(form: TenancyForm): TenantDraft {
  return {
    ...EMPTY_TENANT_DRAFT,
    leaseStartDate: form.leaseStartDate,
    leaseEndDate: form.leaseEndDate,
    nextRentReviewAt: form.nextRentReviewAt,
    rentPaidUntil: form.rentPaidUntil,
    vacateDate: form.vacateDate,
    nextInspectionAt: form.nextInspectionAt,
  };
}

type TenancyDateKey =
  | 'leaseStartDate'
  | 'leaseEndDate'
  | 'rentPaidUntil'
  | 'nextRentReviewAt'
  | 'vacateDate'
  | 'vacateDateChangeReason'
  | 'nextInspectionAt';

function TenancyDateFields({
  idPrefix,
  values,
  vacateInitial,
  onChange,
}: {
  idPrefix: string;
  values: Pick<TenancyForm, TenancyDateKey>;
  vacateInitial: string;
  onChange: (key: TenancyDateKey, value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-lease-start`}>Lease start</Label>
        <Input
          id={`${idPrefix}-lease-start`}
          type="date"
          value={values.leaseStartDate}
          onChange={(e) => onChange('leaseStartDate', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-lease-end`}>Lease end</Label>
        <Input
          id={`${idPrefix}-lease-end`}
          type="date"
          value={values.leaseEndDate}
          onChange={(e) => onChange('leaseEndDate', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-rent-paid-until`}>Rent paid to</Label>
        <Input
          id={`${idPrefix}-rent-paid-until`}
          type="date"
          value={values.rentPaidUntil}
          onChange={(e) => onChange('rentPaidUntil', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-next-rent-review`}>Next rent review</Label>
        <Input
          id={`${idPrefix}-next-rent-review`}
          type="date"
          value={values.nextRentReviewAt}
          onChange={(e) => onChange('nextRentReviewAt', e.target.value)}
        />
      </div>
      <PropertyVacateDateField
        idPrefix={`${idPrefix}-vacate`}
        date={values.vacateDate}
        initialDate={vacateInitial}
        reason={values.vacateDateChangeReason}
        onDateChange={(value) => onChange('vacateDate', value)}
        onReasonChange={(value) => onChange('vacateDateChangeReason', value)}
      />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-next-routine`}>Next routine inspection</Label>
        <Input
          id={`${idPrefix}-next-routine`}
          type="date"
          value={values.nextInspectionAt}
          onChange={(e) => onChange('nextInspectionAt', e.target.value)}
        />
      </div>
    </div>
  );
}

export function PropertyTenancyEditDialog({
  open,
  onOpenChange,
  propertyId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  initial: TenancyForm;
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<TenancyForm>(initial);
  /** Snapshot at open — ignore live poll refreshes while editing. */
  const [baseline, setBaseline] = useState<TenancyForm>(initial);
  const [saving, setSaving] = useState(false);
  const [inviteSentOpen, setInviteSentOpen] = useState(false);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [tenantContacts, setTenantContacts] = useState<AgentPropertyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [tenantDraft, setTenantDraft] = useState<TenantDraft>(EMPTY_TENANT_DRAFT);
  const [addingTenant, setAddingTenant] = useState(false);
  const [editIndex, setEditIndex] = useState(0);
  const [coTenantDrafts, setCoTenantDrafts] = useState<Record<string, CoTenantDraft>>({});

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setBaseline(initial);
    setAddTenantOpen(false);
    setTenantDraft(draftFromTenancyForm(initial));
    setEditIndex(0);
    setCoTenantDrafts({});
    // Only re-seed when the dialog opens. Parent `initial` churns every live poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setContactsLoading(true);
    void listPropertyContacts(propertyId)
      .then((rows) => {
        if (!cancelled) {
          setTenantContacts(rows.filter((c) => c.role === 'TENANT'));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTenantContacts([]);
          toast.error('Could not load tenants');
        }
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, propertyId]);

  // Late-arriving end-leasing vacate date: fill only if the field is still empty.
  useEffect(() => {
    if (!open) return;
    const incoming = dateOnly(initial.vacateDate);
    if (!incoming) return;
    setForm((prev) => (dateOnly(prev.vacateDate) ? prev : { ...prev, vacateDate: incoming }));
    setBaseline((prev) =>
      dateOnly(prev.vacateDate) ? prev : { ...prev, vacateDate: incoming },
    );
  }, [open, initial.vacateDate]);

  const set = <K extends keyof TenancyForm>(key: K, value: TenancyForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const extraContacts = useMemo(
    () =>
      tenantContacts.filter(
        (contact) =>
          !contact.isPrimary &&
          !contactMatchesPrimary(contact, {
            name: baseline.tenantName,
            email: baseline.tenantEmail,
          }),
      ),
    [tenantContacts, baseline.tenantName, baseline.tenantEmail],
  );

  const household = useMemo(
    () =>
      mergeHouseholdTenants({
        primary: {
          name: form.tenantName,
          email: form.tenantEmail,
          phone: form.tenantPhone,
        },
        additional: tenantContacts,
      }),
    [form.tenantName, form.tenantEmail, form.tenantPhone, tenantContacts],
  );

  const pageCount = Math.max(1, 1 + extraContacts.length);
  const activeIsPrimary = editIndex === 0;
  const activeContact = activeIsPrimary ? null : extraContacts[editIndex - 1];
  const activeDraft = activeContact ? coTenantDrafts[activeContact.id] : null;

  useEffect(() => {
    if (editIndex >= pageCount) setEditIndex(0);
  }, [editIndex, pageCount]);

  useEffect(() => {
    setCoTenantDrafts((prev) => {
      const next: Record<string, CoTenantDraft> = {};
      for (const contact of extraContacts) {
        next[contact.id] = prev[contact.id] ?? {
          name: contact.name?.trim() ?? '',
          email: contact.email?.trim() ?? '',
          phone: contact.phone?.trim() ?? '',
        };
      }
      return next;
    });
  }, [extraContacts]);

  const setIfChanged = <K extends keyof PropertyRegistryPatch>(
    patch: PropertyRegistryPatch,
    key: K,
    next: PropertyRegistryPatch[K] | undefined,
    prev: PropertyRegistryPatch[K] | undefined,
  ) => {
    const normalizedNext = next ?? undefined;
    const normalizedPrev = prev ?? undefined;
    if (normalizedNext !== normalizedPrev) {
      patch[key] = next as PropertyRegistryPatch[K];
    }
  };

  const datePatchFrom = (next: TenancyForm, prev: TenancyForm): PropertyRegistryPatch => {
    const patch: PropertyRegistryPatch = {};
    setIfChanged(patch, 'leaseStartDate', dateOnly(next.leaseStartDate), dateOnly(prev.leaseStartDate));
    setIfChanged(patch, 'leaseEndDate', dateOnly(next.leaseEndDate), dateOnly(prev.leaseEndDate));
    setIfChanged(
      patch,
      'nextRentReviewAt',
      dateOnly(next.nextRentReviewAt),
      dateOnly(prev.nextRentReviewAt),
    );
    setIfChanged(patch, 'rentPaidUntil', dateOnly(next.rentPaidUntil), dateOnly(prev.rentPaidUntil));
    setIfChanged(patch, 'vacateDate', dateOnly(next.vacateDate), dateOnly(prev.vacateDate));
    if (patch.vacateDate !== undefined) {
      patch.vacateDateChangeReason = next.vacateDateChangeReason.trim();
    }
    setIfChanged(
      patch,
      'nextInspectionAt',
      dateOnly(next.nextInspectionAt),
      dateOnly(prev.nextInspectionAt),
    );
    return patch;
  };

  const buildPatch = (): PropertyRegistryPatch => {
    const patch = datePatchFrom(form, baseline);
    setIfChanged(
      patch,
      'tenantName',
      form.tenantName.trim() || undefined,
      baseline.tenantName.trim() || undefined,
    );
    setIfChanged(
      patch,
      'tenantEmail',
      form.tenantEmail.trim() || undefined,
      baseline.tenantEmail.trim() || undefined,
    );
    setIfChanged(
      patch,
      'tenantPhone',
      form.tenantPhone.trim() || undefined,
      baseline.tenantPhone.trim() || undefined,
    );
    return patch;
  };

  const submitAddTenant = async () => {
    if (
      !tenantDraft.name.trim() &&
      !tenantDraft.email.trim() &&
      !tenantDraft.phone.trim()
    ) {
      toast.error('Enter a name, email, or phone');
      return;
    }
    if (household.length >= MAX_TENANCY_TENANTS) {
      toast.error(`A property can have at most ${MAX_TENANCY_TENANTS} tenants`);
      return;
    }
    if (
      vacateDateChangeInvalid(
        tenantDraft.vacateDate,
        baseline.vacateDate,
        tenantDraft.vacateDateChangeReason,
      )
    ) {
      toast.error('Provide a reason when changing the vacate date');
      return;
    }

    setAddingTenant(true);
    try {
      const addedEmail = tenantDraft.email.trim();
      const nextForm: TenancyForm = {
        ...form,
        leaseStartDate: tenantDraft.leaseStartDate,
        leaseEndDate: tenantDraft.leaseEndDate,
        nextRentReviewAt: tenantDraft.nextRentReviewAt,
        rentPaidUntil: tenantDraft.rentPaidUntil,
        vacateDate: tenantDraft.vacateDate,
        vacateDateChangeReason: tenantDraft.vacateDateChangeReason,
        nextInspectionAt: tenantDraft.nextInspectionAt,
      };
      const datesPatch = datePatchFrom(nextForm, baseline);

      const result = await addPropertyContact(propertyId, {
        role: 'TENANT',
        name: tenantDraft.name.trim() || undefined,
        email: addedEmail || undefined,
        phone: tenantDraft.phone.trim() || undefined,
      });
      setTenantContacts(result.contacts.filter((c) => c.role === 'TENANT'));

      const extrasAfterAdd = result.contacts.filter(
        (contact) =>
          contact.role === 'TENANT' &&
          !contact.isPrimary &&
          !contactMatchesPrimary(contact, {
            name: form.tenantName,
            email: form.tenantEmail,
          }),
      );
      setEditIndex(extrasAfterAdd.length);

      if (Object.keys(datesPatch).length > 0) {
        try {
          await propertyRegistryApi.update(propertyId, datesPatch);
          setForm(nextForm);
          setBaseline({ ...nextForm, vacateDateChangeReason: '' });
        } catch {
          toast.warning('Tenant added, but lease dates could not be saved');
        }
      }

      toast.success('Tenant added');
      setTenantDraft(EMPTY_TENANT_DRAFT);
      setAddTenantOpen(false);
      onSaved?.();

      const invite = result.tenantPortalInvite;
      if (invite?.status === 'sent' && invite.email?.trim()) {
        setInviteSentTo(invite.email.trim());
        setInviteSentOpen(true);
      } else if (invite?.status === 'skipped' && invite.reason === 'already_active') {
        toast.message('Tenant already has portal access');
      } else if (addedEmail.includes('@') && invite?.status === 'skipped') {
        toast.warning(
          invite.detail?.trim() ||
            'Tenant saved, but portal credentials were not emailed',
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add tenant');
    } finally {
      setAddingTenant(false);
    }
  };

  const submit = async () => {
    if (
      vacateDateChangeInvalid(form.vacateDate, baseline.vacateDate, form.vacateDateChangeReason)
    ) {
      toast.error('Provide a reason when changing the vacate date');
      return;
    }

    const patch = buildPatch();
    const contactPatches = extraContacts.flatMap((contact) => {
      const draft = coTenantDrafts[contact.id];
      if (!draft) return [];
      const nextName = draft.name.trim();
      const nextEmail = draft.email.trim();
      const nextPhone = draft.phone.trim();
      const prevName = contact.name?.trim() ?? '';
      const prevEmail = contact.email?.trim() ?? '';
      const prevPhone = contact.phone?.trim() ?? '';
      if (nextName === prevName && nextEmail === prevEmail && nextPhone === prevPhone) {
        return [];
      }
      return [{ contactId: contact.id, body: { name: nextName, email: nextEmail, phone: nextPhone } }];
    });

    if (Object.keys(patch).length === 0 && contactPatches.length === 0) {
      toast.message('No changes to save');
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(patch).length > 0) {
        const result = await propertyRegistryApi.update(propertyId, patch);
        const invite = result.tenantPortalInvite;
        if (invite?.status === 'sent' && invite.email?.trim()) {
          setInviteSentTo(invite.email.trim());
          setInviteSentOpen(true);
        } else if (invite?.status === 'skipped' && invite.reason === 'already_active') {
          toast.message('Tenant already has portal access');
        } else if (
          patch.tenantEmail &&
          String(patch.tenantEmail).includes('@') &&
          invite?.status === 'skipped'
        ) {
          toast.warning(
            invite.detail?.trim() ||
              'Tenancy saved, but portal credentials were not emailed',
          );
        }
      }

      for (const item of contactPatches) {
        const contacts = await updatePropertyContact(propertyId, item.contactId, item.body);
        setTenantContacts(contacts.filter((c) => c.role === 'TENANT'));
      }

      toast.success('Tenancy details updated');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update tenancy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit tenancy</DialogTitle>
            <DialogDescription>
              Add up to {MAX_TENANCY_TENANTS} tenants one by one. Saving a new primary tenant
              email, or adding a tenant with an email, automatically emails Tenant app login
              credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">
                  Tenants ({household.length}/{MAX_TENANCY_TENANTS})
                </p>
                <div className="flex items-center gap-1">
                  <TenancyPagerControls
                    index={editIndex}
                    count={pageCount}
                    onPrev={() =>
                      setEditIndex((index) => wrapTenancyPageIndex(index, pageCount, -1))
                    }
                    onNext={() =>
                      setEditIndex((index) => wrapTenancyPageIndex(index, pageCount, 1))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    disabled={
                      contactsLoading ||
                      addingTenant ||
                      household.length >= MAX_TENANCY_TENANTS
                    }
                    onClick={() => {
                      setTenantDraft(draftFromTenancyForm(form));
                      setAddTenantOpen(true);
                    }}
                  >
                    <Plus className="size-3.5" />
                    Add tenant
                  </Button>
                </div>
              </div>

              {contactsLoading ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading tenants…
                </p>
              ) : null}

              <p className="text-muted-foreground pt-1 text-[11px] font-semibold uppercase tracking-wide">
                {activeIsPrimary
                  ? 'Primary tenant'
                  : `Tenant ${editIndex + 1} of ${pageCount}`}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tenant-name">Name</Label>
                  <Input
                    id="tenant-name"
                    inputKind="person_name"
                    value={
                      activeIsPrimary ? form.tenantName : (activeDraft?.name ?? '')
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (activeIsPrimary) {
                        set('tenantName', value);
                        return;
                      }
                      if (!activeContact) return;
                      setCoTenantDrafts((prev) => ({
                        ...prev,
                        [activeContact.id]: {
                          name: value,
                          email: prev[activeContact.id]?.email ?? '',
                          phone: prev[activeContact.id]?.phone ?? '',
                        },
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-email">Email</Label>
                  <Input
                    id="tenant-email"
                    type="email"
                    value={
                      activeIsPrimary ? form.tenantEmail : (activeDraft?.email ?? '')
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (activeIsPrimary) {
                        set('tenantEmail', value);
                        return;
                      }
                      if (!activeContact) return;
                      setCoTenantDrafts((prev) => ({
                        ...prev,
                        [activeContact.id]: {
                          name: prev[activeContact.id]?.name ?? '',
                          email: value,
                          phone: prev[activeContact.id]?.phone ?? '',
                        },
                      }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tenant-phone">Mobile</Label>
                  <Input
                    id="tenant-phone"
                    value={
                      activeIsPrimary ? form.tenantPhone : (activeDraft?.phone ?? '')
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (activeIsPrimary) {
                        set('tenantPhone', value);
                        return;
                      }
                      if (!activeContact) return;
                      setCoTenantDrafts((prev) => ({
                        ...prev,
                        [activeContact.id]: {
                          name: prev[activeContact.id]?.name ?? '',
                          email: prev[activeContact.id]?.email ?? '',
                          phone: value,
                        },
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            <TenancyDateFields
              idPrefix="primary-tenant"
              values={form}
              vacateInitial={baseline.vacateDate}
              onChange={(key, value) => set(key, value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addTenantOpen}
        onOpenChange={(next) => {
          if (!next) {
            setAddTenantOpen(false);
            setTenantDraft(EMPTY_TENANT_DRAFT);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add tenant</DialogTitle>
            <DialogDescription>
              Same fields as the primary tenant. Name, email, and mobile are saved for this
              person. Lease dates apply to the whole tenancy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="agent-add-tenant-name">Name</Label>
                <Input
                  id="agent-add-tenant-name"
                  inputKind="person_name"
                  value={tenantDraft.name}
                  onChange={(e) => setTenantDraft({ ...tenantDraft, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-add-tenant-email">Email</Label>
                <Input
                  id="agent-add-tenant-email"
                  type="email"
                  value={tenantDraft.email}
                  onChange={(e) => setTenantDraft({ ...tenantDraft, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agent-add-tenant-phone">Mobile</Label>
                <Input
                  id="agent-add-tenant-phone"
                  value={tenantDraft.phone}
                  onChange={(e) => setTenantDraft({ ...tenantDraft, phone: e.target.value })}
                />
              </div>
            </div>
            <TenancyDateFields
              idPrefix="add-tenant"
              values={tenantDraft}
              vacateInitial={baseline.vacateDate}
              onChange={(key, value) =>
                setTenantDraft((prev) => ({ ...prev, [key]: value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={addingTenant}
              onClick={() => {
                setAddTenantOpen(false);
                setTenantDraft(EMPTY_TENANT_DRAFT);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={addingTenant}
              onClick={() => void submitAddTenant()}
            >
              {addingTenant ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Add tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteSentOpen} onOpenChange={setInviteSentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Portal credentials sent</DialogTitle>
            <DialogDescription>
              {inviteSentTo
                ? `Tenant portal login credentials have been emailed to ${inviteSentTo}. They can sign in to the CROSSUB Tenant app with the temporary password in that email.`
                : 'Tenant portal login credentials have been emailed to the tenant. They can sign in to the CROSSUB Tenant app with the temporary password in that email.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setInviteSentOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
