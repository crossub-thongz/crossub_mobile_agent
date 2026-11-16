'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  OWNER_DRAWER_COPY,
  OWNER_DRAWER_TAB,
  OWNER_KIND,
  OWNER_SEARCH_DEBOUNCE_MS,
  OWNER_SEARCH_MIN_LENGTH,
  OWNER_SEARCH_PAGE_SIZE,
  OWNERSHIP_TOTAL_PERCENT,
  type OwnerDrawerTab,
  type OwnerKind,
} from '@/constants/add-property';
import { ENVIRONMENT_BANNER_HEIGHT_VAR } from '@/constants/environment-banner';
import { useDebouncedValue } from '@/hooks/use-trust-resource';
import {
  searchAgencyOwners,
  type AgencyOwnerSearchItem,
} from '@/lib/crossub-api/agent-property-intake-client';
import { cn } from '@/lib/utils';
import { apiErrorMessage, apiValidationIssues } from '@/lib/utils/api-error-message';
import {
  ownershipTotal,
  validateNewOwner,
  validateOwnerSelection,
  withOnePrimary,
  type AddPropertyOwner,
} from '@/utils/add-property-form';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul
      role="alert"
      className="space-y-0.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
    >
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

function OwnerAvatar({ name }: { name: string }) {
  return (
    <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function ownerFromPerson(person: AgencyOwnerSearchItem): AddPropertyOwner {
  return {
    key: `person-${person.id}`,
    personId: person.id,
    name: person.displayName,
    email: person.email ?? '',
    phone: person.phone ?? '',
    isPrimary: false,
    ownershipPercent: '',
  };
}

/**
 * The right-side drawer where owners are searched, created and arranged. Everything here is
 * staged: Cancel (or Esc, or the backdrop) discards it all and the page keeps the owners it
 * had; only Save Owners commits.
 */
export function OwnerDrawer({
  open,
  agencyId,
  owners,
  onClose,
  onSave,
}: {
  open: boolean;
  agencyId: string | null;
  /** The owners the property has now; copied into the drawer each time it opens. */
  owners: AddPropertyOwner[];
  onClose: () => void;
  /** Commits the staged set. Rejects with the reason when the save fails. */
  onSave: (owners: AddPropertyOwner[]) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<OwnerDrawerTab>(OWNER_DRAWER_TAB.EXISTING);
  const [staged, setStaged] = useState<AddPropertyOwner[]>([]);
  const [percentEnabled, setPercentEnabled] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AgencyOwnerSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [kind, setKind] = useState<OwnerKind>(OWNER_KIND.INDIVIDUAL);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newErrors, setNewErrors] = useState<string[]>([]);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const newSeq = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const term = useDebouncedValue(query.trim(), OWNER_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Each open starts from the property's committed owners, so nothing staged in an earlier,
  // cancelled visit comes back.
  useEffect(() => {
    if (!open) return;
    setStaged(owners.map((owner) => ({ ...owner })));
    setPercentEnabled(owners.some((owner) => owner.ownershipPercent.trim() !== ''));
    setTab(OWNER_DRAWER_TAB.EXISTING);
    setQuery('');
    setResults([]);
    setSearchError(null);
    setKind(OWNER_KIND.INDIVIDUAL);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setNewErrors([]);
    setSaveErrors([]);
    setSaving(false);
    searchInputRef.current?.focus();
    // Owners are read once per open on purpose: a parent re-render must not reset the drawer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !agencyId || term.length < OWNER_SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    searchAgencyOwners(agencyId, term, OWNER_SEARCH_PAGE_SIZE)
      .then((items) => {
        if (!cancelled) setResults(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setResults([]);
        setSearchError(apiErrorMessage(err, OWNER_DRAWER_COPY.SEARCH_FAILED));
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agencyId, open, term]);

  if (!open || !mounted) return null;

  const addOwner = (owner: AddPropertyOwner) => {
    setStaged((current) => withOnePrimary([...current, owner]));
    setSaveErrors([]);
  };

  const createOwner = () => {
    const name =
      kind === OWNER_KIND.COMPANY
        ? companyName.trim()
        : firstName.trim() && lastName.trim()
          ? [firstName, middleName, lastName].map((part) => part.trim()).filter(Boolean).join(' ')
          : '';
    newSeq.current += 1;
    const owner: AddPropertyOwner = {
      key: `new-${newSeq.current}`,
      name,
      email: email.trim(),
      phone: phone.trim(),
      isPrimary: false,
      ownershipPercent: '',
    };
    const errors = validateNewOwner(owner, staged);
    setNewErrors(errors);
    if (errors.length > 0) return;
    addOwner(owner);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setTab(OWNER_DRAWER_TAB.EXISTING);
  };

  const removeOwner = (key: string) => {
    setStaged((current) => withOnePrimary(current.filter((owner) => owner.key !== key)));
    setSaveErrors([]);
  };

  const setShare = (key: string, value: string) => {
    setStaged((current) =>
      current.map((owner) => (owner.key === key ? { ...owner, ownershipPercent: value } : owner)),
    );
    setSaveErrors([]);
  };

  const save = async () => {
    const errors = validateOwnerSelection(staged, percentEnabled);
    setSaveErrors(errors);
    if (errors.length > 0) return;
    setSaving(true);
    try {
      await onSave(
        percentEnabled ? staged : staged.map((owner) => ({ ...owner, ownershipPercent: '' })),
      );
    } catch (err) {
      const issues = apiValidationIssues(err);
      setSaveErrors(
        issues?.length
          ? issues.map((issue) => issue.message)
          : [apiErrorMessage(err, OWNER_DRAWER_COPY.SAVE_FAILED)],
      );
    } finally {
      setSaving(false);
    }
  };

  const isLinked = (person: AgencyOwnerSearchItem) =>
    staged.some((owner) => owner.personId === person.id);

  return createPortal(
    // Starts below the test environment banner, which would otherwise cover the drawer's title.
    <div
      className="fixed inset-x-0 bottom-0 z-[70]"
      style={{ top: `var(${ENVIRONMENT_BANNER_HEIGHT_VAR}, 0px)` }}
    >
      <button
        type="button"
        aria-label={OWNER_DRAWER_COPY.CLOSE}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-drawer-title"
        className="bg-background absolute inset-y-0 right-0 flex w-full flex-col border-l shadow-2xl sm:max-w-[460px]"
      >
        <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 id="owner-drawer-title" className="text-base font-semibold">
              {OWNER_DRAWER_COPY.TITLE}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">{OWNER_DRAWER_COPY.SUBTITLE}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5"
            aria-label={OWNER_DRAWER_COPY.CLOSE}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1" role="tablist">
            {(
              [
                [OWNER_DRAWER_TAB.EXISTING, OWNER_DRAWER_COPY.TAB_EXISTING],
                [OWNER_DRAWER_TAB.NEW, OWNER_DRAWER_COPY.TAB_NEW],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition',
                  tab === id ? 'bg-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === OWNER_DRAWER_TAB.EXISTING ? (
            <section className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">
                  {OWNER_DRAWER_COPY.SEARCH_LABEL}
                </Label>
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={OWNER_DRAWER_COPY.SEARCH_PLACEHOLDER}
                  autoComplete="off"
                />
              </div>
              {searchError ? (
                <ErrorList errors={[searchError]} />
              ) : term.length < OWNER_SEARCH_MIN_LENGTH ? (
                <p className="text-muted-foreground text-xs">{OWNER_DRAWER_COPY.SEARCH_HINT}</p>
              ) : searching ? (
                <p className="text-muted-foreground text-xs">{OWNER_DRAWER_COPY.SEARCHING}</p>
              ) : results.length === 0 ? (
                <p className="text-muted-foreground text-xs">{OWNER_DRAWER_COPY.NO_MATCH}</p>
              ) : (
                <ul className="space-y-2">
                  {results.map((person) => {
                    const linked = isLinked(person);
                    return (
                      <li
                        key={person.id}
                        className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                      >
                        <OwnerAvatar name={person.displayName} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{person.displayName}</p>
                          <p className="text-muted-foreground truncate text-xs">
                            {[person.email, person.phone].filter(Boolean).join(' · ') ||
                              person.reference}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={linked}
                          onClick={() => addOwner(ownerFromPerson(person))}
                        >
                          {linked ? (
                            OWNER_DRAWER_COPY.LINKED
                          ) : (
                            <>
                              <Plus className="size-3.5" />
                              {OWNER_DRAWER_COPY.ADD}
                            </>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <section className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs font-medium">
                  {OWNER_DRAWER_COPY.OWNER_TYPE}
                </Label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as OwnerKind)}
                  className={selectClass}
                >
                  <option value={OWNER_KIND.INDIVIDUAL}>{OWNER_DRAWER_COPY.INDIVIDUAL}</option>
                  <option value={OWNER_KIND.COMPANY}>{OWNER_DRAWER_COPY.COMPANY}</option>
                </select>
              </div>
              {kind === OWNER_KIND.INDIVIDUAL ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {OWNER_DRAWER_COPY.FIRST_NAME} *
                    </Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {OWNER_DRAWER_COPY.LAST_NAME} *
                    </Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-muted-foreground text-xs font-medium">
                      {OWNER_DRAWER_COPY.MIDDLE_NAME}
                    </Label>
                    <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs font-medium">
                    {OWNER_DRAWER_COPY.COMPANY_NAME} *
                  </Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs font-medium">
                    {OWNER_DRAWER_COPY.EMAIL}
                  </Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs font-medium">
                    {OWNER_DRAWER_COPY.PHONE}
                  </Label>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">{OWNER_DRAWER_COPY.NEW_HINT}</p>
              <ErrorList errors={newErrors} />
              <Button type="button" variant="outline" className="w-full" onClick={createOwner}>
                <Plus className="size-4" />
                {OWNER_DRAWER_COPY.CREATE}
              </Button>
            </section>
          )}

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{OWNER_DRAWER_COPY.LINKED_HEADING}</h3>
              <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                {staged.length}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">{OWNER_DRAWER_COPY.PRIMARY_HINT}</p>
            {staged.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                {OWNER_DRAWER_COPY.NONE_SELECTED}
              </p>
            ) : (
              <ul className="space-y-2">
                {staged.map((owner) => (
                  <li key={owner.key} className="rounded-lg border border-border/60 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{owner.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {[owner.email, owner.phone].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOwner(owner.key)}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1"
                        aria-label={`${OWNER_DRAWER_COPY.REMOVE} ${owner.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="primary-owner"
                          checked={owner.isPrimary}
                          onChange={() =>
                            setStaged((current) => withOnePrimary(current, owner.key))
                          }
                        />
                        {OWNER_DRAWER_COPY.PRIMARY_CONTACT}
                      </label>
                      {percentEnabled ? (
                        <label className="flex items-center gap-1.5 text-xs">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={OWNERSHIP_TOTAL_PERCENT}
                            step="0.01"
                            value={owner.ownershipPercent}
                            onChange={(e) => setShare(owner.key, e.target.value)}
                            className="h-8 w-20 text-right"
                            aria-label={`${owner.name} %`}
                          />
                          %
                        </label>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2 border-t pt-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={percentEnabled}
                onChange={(e) => {
                  setPercentEnabled(e.target.checked);
                  setSaveErrors([]);
                }}
              />
              {OWNER_DRAWER_COPY.PERCENT_TOGGLE}
            </label>
            <p className="text-muted-foreground text-xs">{OWNER_DRAWER_COPY.PERCENT_HINT}</p>
            {percentEnabled ? (
              <p className="bg-muted rounded-lg px-3 py-2 text-xs font-medium tabular-nums">
                {OWNER_DRAWER_COPY.PERCENT_TOTAL}: {ownershipTotal(staged).toFixed(2)}% /{' '}
                {OWNERSHIP_TOTAL_PERCENT}%
              </p>
            ) : null}
            <ErrorList errors={saveErrors} />
          </section>
        </div>

        <footer className="flex gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            {OWNER_DRAWER_COPY.CANCEL}
          </Button>
          <Button type="button" className="flex-1" onClick={() => void save()} disabled={saving}>
            {saving ? OWNER_DRAWER_COPY.SAVING : OWNER_DRAWER_COPY.SAVE}
          </Button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
