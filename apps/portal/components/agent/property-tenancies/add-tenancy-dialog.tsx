'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ADD_TENANCY_COPY as COPY,
  MAX_TENANT_CONTACTS,
  PEOPLE_SEARCH_DEBOUNCE_MS,
  PEOPLE_SEARCH_MIN_LENGTH,
  PEOPLE_SEARCH_PAGE_SIZE,
  TENANCY_PLACEHOLDER,
} from '@/constants/property-tenancies';
import { useDebouncedValue } from '@/hooks/use-trust-resource';
import { fetchAgencyPeople, type AgencyPersonListItem } from '@/lib/crossub-api/agent-client';
import {
  addManualTenancy,
  type ManualTenancyTenantInput,
} from '@/lib/crossub-api/agent-tenancy-client';
import { formatAgreementDate } from '@/lib/format-datetime';
import { formatCurrency } from '@/lib/utils';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import { parseAmountInput } from '@/utils/property-tenancy-overview';

type ExistingTenant = { kind: 'existing'; personId: string; name: string; email: string; phone: string };
type NewTenant = { kind: 'new'; firstName: string; lastName: string; email: string; phone: string };
type ListedTenant = ExistingTenant | NewTenant;

const LAST_STEP = COPY.STEPS.length - 1;

function tenantLabel(tenant: ListedTenant): string {
  if (tenant.kind === 'existing') return tenant.name;
  return [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || COPY.NEW_TENANT;
}

function tenantContactLine(tenant: ListedTenant): string {
  return [tenant.email, tenant.phone].filter(Boolean).join(' · ');
}

function toTenantInput(tenant: ListedTenant): ManualTenancyTenantInput {
  return tenant.kind === 'existing'
    ? { personId: tenant.personId }
    : { firstName: tenant.firstName, lastName: tenant.lastName, email: tenant.email, phone: tenant.phone };
}

function reviewMoney(value: string): string {
  try {
    const amount = parseAmountInput(value);
    return amount == null ? TENANCY_PLACEHOLDER : formatCurrency(amount);
  } catch {
    return value.trim();
  }
}

function reviewDay(value: string): string {
  return value ? formatAgreementDate(value) : TENANCY_PLACEHOLDER;
}

/**
 * "+ Add tenancy" (PR #37, Self-Manage): tenants (someone on file, or someone new), lease dates,
 * rent, bond and paid-to, saved as a draft or as a tenancy. Opens no letting and no inspection.
 */
export function AddTenancyDialog({
  open,
  onOpenChange,
  propertyId,
  agencyId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  /** The property's agency — whose people the search lists. */
  agencyId?: string;
  onSaved?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tenants, setTenants] = useState<ListedTenant[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AgencyPersonListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [vacateDate, setVacateDate] = useState('');
  const [rentWeekly, setRentWeekly] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [rentPaidTo, setRentPaidTo] = useState('');
  const term = useDebouncedValue(query.trim(), PEOPLE_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setTenants([]);
    setQuery('');
    setResults([]);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setLeaseStartDate('');
    setLeaseEndDate('');
    setVacateDate('');
    setRentWeekly('');
    setBondAmount('');
    setRentPaidTo('');
  }, [open]);

  useEffect(() => {
    if (!open || !agencyId || term.length < PEOPLE_SEARCH_MIN_LENGTH) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetchAgencyPeople(agencyId, { search: term, pageSize: PEOPLE_SEARCH_PAGE_SIZE })
      .then((page) => {
        if (!cancelled) setResults(page.items);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agencyId, open, term]);

  const selectedIds = new Set(
    tenants.flatMap((t) => (t.kind === 'existing' ? [t.personId] : [])),
  );
  const atLimit = tenants.length >= MAX_TENANT_CONTACTS;

  const toggleExisting = (person: AgencyPersonListItem) => {
    if (selectedIds.has(person.id)) {
      setTenants((current) =>
        current.filter((t) => !(t.kind === 'existing' && t.personId === person.id)),
      );
      return;
    }
    if (atLimit) {
      toast.error(COPY.TENANT_LIMIT);
      return;
    }
    setTenants((current) => [
      ...current,
      {
        kind: 'existing',
        personId: person.id,
        name: person.displayName,
        email: person.email ?? '',
        phone: person.phone ?? '',
      },
    ]);
  };

  const addNew = () => {
    if (atLimit) {
      toast.error(COPY.TENANT_LIMIT);
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      toast.error(COPY.NEW_TENANT_REQUIRED);
      return;
    }
    setTenants((current) => [
      ...current,
      {
        kind: 'new',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    ]);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
  };

  const save = async (draft: boolean) => {
    let rent: number | undefined;
    let bond: number | undefined;
    try {
      rent = parseAmountInput(rentWeekly);
      bond = parseAmountInput(bondAmount);
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
      return;
    }
    setBusy(true);
    try {
      const result = await addManualTenancy(propertyId, {
        draft,
        tenants: tenants.map(toTenantInput),
        leaseStartDate: leaseStartDate || undefined,
        leaseEndDate: leaseEndDate || undefined,
        vacateDate: vacateDate || undefined,
        rentWeekly: rent,
        bondAmount: bond,
        rentPaidTo: rentPaidTo || undefined,
      });
      toast.success(result.draft ? COPY.SAVED_DRAFT : result.upcoming ? COPY.SAVED_UPCOMING : COPY.SAVED);
      if (result.contactsLeftOff.length > 0) {
        toast.warning(`${COPY.CONTACTS_LEFT_OFF} ${result.contactsLeftOff.join(', ')}`);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, COPY.FAILED));
    } finally {
      setBusy(false);
    }
  };

  const dateField = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="date" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );
  const amountField = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{COPY.TITLE}</DialogTitle>
          <p className="text-muted-foreground text-xs">
            {COPY.STEP_OF} {step + 1} / {COPY.STEPS.length}: {COPY.STEPS[step]}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {step === 0 ? (
            <>
              <div>
                <p className="text-sm font-medium">{COPY.TENANT_LIST}</p>
                <p className="text-muted-foreground text-xs">{COPY.TENANT_LIST_HINT}</p>
              </div>
              {tenants.length > 0 ? (
                <ul className="divide-y rounded-lg border">
                  {tenants.map((tenant, index) => (
                    <li
                      key={`${tenantLabel(tenant)}-${index}`}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{tenantLabel(tenant)}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {tenantContactLine(tenant) || COPY.NO_CONTACT}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`${tenantLabel(tenant)} ×`}
                        onClick={() => setTenants((current) => current.filter((_, i) => i !== index))}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                  {COPY.NO_TENANTS}
                </p>
              )}
              {agencyId ? (
                <div className="space-y-2">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={COPY.SEARCH}
                    aria-label={COPY.SEARCH}
                  />
                  {searching ? <p className="text-muted-foreground text-xs">{COPY.SEARCHING}</p> : null}
                  {results.length > 0 ? (
                    <ul className="max-h-40 overflow-y-auto rounded-lg border">
                      {results.map((person) => {
                        const on = selectedIds.has(person.id);
                        return (
                          <li key={person.id}>
                            <button
                              type="button"
                              className="hover:bg-muted/50 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                              onClick={() => toggleExisting(person)}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{person.displayName}</span>
                                <span className="text-muted-foreground block truncate text-xs">
                                  {[person.reference, person.email, person.phone].filter(Boolean).join(' · ')}
                                </span>
                              </span>
                              <span className="text-primary shrink-0 text-xs">
                                {on ? COPY.SELECTED : COPY.SELECT}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">{COPY.NO_AGENCY}</p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={COPY.FIRST_NAME} aria-label={COPY.FIRST_NAME} />
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={COPY.SURNAME} aria-label={COPY.SURNAME} />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={COPY.EMAIL} aria-label={COPY.EMAIL} />
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={COPY.PHONE} aria-label={COPY.PHONE} />
              </div>
              {atLimit ? <p className="text-muted-foreground text-xs">{COPY.TENANT_LIMIT}</p> : null}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={atLimit} onClick={addNew}>
                <Plus className="size-3.5" />
                {COPY.ADD_TO_LIST}
              </Button>
            </>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3">
              {dateField('add-tenancy-start', COPY.LEASE_START, leaseStartDate, setLeaseStartDate)}
              {dateField('add-tenancy-end', COPY.LEASE_END, leaseEndDate, setLeaseEndDate)}
              {dateField('add-tenancy-vacate', COPY.VACATE_DATE, vacateDate, setVacateDate)}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              {amountField('add-tenancy-rent', COPY.RENT_WEEKLY, rentWeekly, setRentWeekly)}
              {amountField('add-tenancy-bond', COPY.BOND, bondAmount, setBondAmount)}
              {dateField('add-tenancy-paid-to', COPY.RENT_PAID_TO, rentPaidTo, setRentPaidTo)}
            </div>
          ) : null}

          {step === LAST_STEP ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{COPY.TENANTS}</p>
                {tenants.length === 0 ? (
                  <p className="text-muted-foreground mt-1 text-sm">{COPY.NO_TENANTS}</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm">
                    {tenants.map((tenant, index) => (
                      <li key={`${tenantLabel(tenant)}-${index}`}>
                        {tenantLabel(tenant)}
                        {tenantContactLine(tenant) ? ` · ${tenantContactLine(tenant)}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{COPY.DETAILS}</p>
                <dl className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      [COPY.LEASE_START, reviewDay(leaseStartDate)],
                      [COPY.LEASE_END, reviewDay(leaseEndDate)],
                      [COPY.VACATE_DATE, reviewDay(vacateDate)],
                      [COPY.RENT_WEEKLY, reviewMoney(rentWeekly)],
                      [COPY.BOND, reviewMoney(bondAmount)],
                      [COPY.RENT_PAID_TO, reviewDay(rentPaidTo)],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void save(true)}>
            {COPY.SAVE_DRAFT}
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setStep((n) => n - 1)}>
                {COPY.BACK}
              </Button>
            ) : null}
            {step < LAST_STEP ? (
              <Button type="button" disabled={busy} onClick={() => setStep((n) => n + 1)}>
                {COPY.NEXT}
              </Button>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void save(false)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {COPY.SUBMIT}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
