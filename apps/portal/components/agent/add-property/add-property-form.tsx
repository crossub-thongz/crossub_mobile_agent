'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, CloudOff, Cloud, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ActivationSuccess } from '@/components/agent/add-property/activation-success';
import { OwnerDrawer } from '@/components/agent/add-property/owner-drawer';
import { PropertyAddressAutocomplete } from '@/components/agent/property-address-autocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ADD_PROPERTY_API_FIELD,
  ADD_PROPERTY_AUTOSAVE_MS,
  ADD_PROPERTY_COPY,
  ADD_PROPERTY_FIELD,
  ADD_PROPERTY_SAVE_STATE,
  AU_POSTCODE_LENGTH,
  PROPERTY_DETAIL_LIMIT,
  PROPERTY_FEATURE_LABEL,
  PROPERTY_FEATURE_ORDER,
  PROPERTY_FURNISHING_LABEL,
  PROPERTY_FURNISHING_ORDER,
  PROPERTY_INTAKE_FAILURE_CODE,
  PROPERTY_OCCUPANCY,
  type AddPropertyField,
  type AddPropertySaveState,
  type PropertyFeature,
  type PropertyFurnishing,
  type PropertyOccupancy,
} from '@/constants/add-property';
import {
  AUSTRALIAN_STATE_LABEL,
  AUSTRALIAN_STATE_ORDER,
  PROPERTY_APPROVAL_STATUS,
  PROPERTY_TYPE_LABEL,
  PROPERTY_TYPE_ORDER,
  type AustralianStateKey,
  type PropertyType,
} from '@/constants/api-enums';
import { propertyHref, propertyRegistryResume } from '@/constants/routes';
import { ApiError } from '@/lib/api';
import { checkPropertyDuplicate } from '@/lib/crossub-api/agent-client';
import {
  activateProperty,
  createPropertyDraft,
  savePropertyOwners,
  updatePropertyDraft,
  type AgentPropertyOwner,
  type AgentPropertyOwnerInput,
} from '@/lib/crossub-api/agent-property-intake-client';
import type { ParsedAustralianAddress } from '@/lib/google-places';
import { cn } from '@/lib/utils';
import {
  apiErrorCode,
  apiErrorMessage,
  apiValidationIssues,
} from '@/lib/utils/api-error-message';
import {
  addPropertyBodySignature,
  buildAddPropertyBody,
  hasAddPropertyInput,
  newPlaceholderAddress,
  streetAddressOf,
  validateAddPropertyActivation,
  type AddPropertyFormValues,
  type AddPropertyIssue,
  type AddPropertyOwner,
} from '@/utils/add-property-form';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

const DUPLICATE_CHECK_MS = 400;
const ACTIVATION_ISSUES_ID = 'add-property-activation-issues';

const fieldId = (field: AddPropertyField) => `add-property-${field}`;

export function ownerFromApi(owner: AgentPropertyOwner): AddPropertyOwner {
  return {
    key: owner.contactId,
    contactId: owner.contactId,
    personId: owner.personId ?? undefined,
    name: owner.name ?? '',
    email: owner.email ?? '',
    phone: owner.phone ?? '',
    isPrimary: owner.isPrimary,
    ownershipPercent: owner.ownershipPercent != null ? String(owner.ownershipPercent) : '',
  };
}

/** The property already at this address, when the API named one as the reason. */
function duplicatePropertyIdOf(err: unknown): string | null {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') return null;
  const id = (err.body as { duplicatePropertyId?: unknown }).duplicatePropertyId;
  return typeof id === 'string' && id ? id : null;
}

function ownerToInput(owner: AddPropertyOwner): AgentPropertyOwnerInput {
  const share = owner.ownershipPercent.trim();
  return {
    ...(owner.contactId ? { contactId: owner.contactId } : {}),
    ...(owner.personId ? { personId: owner.personId } : {}),
    name: owner.name.trim(),
    ...(owner.email.trim() ? { email: owner.email.trim() } : {}),
    ...(owner.phone.trim() ? { phone: owner.phone.trim() } : {}),
    isPrimary: owner.isPrimary,
    ...(share ? { ownershipPercent: Number(share) } : {}),
  };
}

function Section({
  title,
  aside,
  children,
  id,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  invalid,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label
        className={cn(
          'text-xs font-medium',
          invalid ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
        )}
      >
        {label}
        {required ? <span className="text-rose-600 dark:text-rose-400"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function Collapsible({
  title,
  aside,
  open,
  onToggle,
  children,
}: {
  title: string;
  aside: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/60 pt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium"
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {title}
        </span>
        <span className="text-muted-foreground text-xs font-normal">{aside}</span>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/**
 * Add Property on one page (Daniel's spec v1.0). The property is a draft from the first
 * address input and saves itself as the agent types; Save Draft saves at once, and Activate
 * Property is the only step that makes it live. Tenancy, fees, strata and documents are not
 * asked for here.
 */
export function AddPropertyForm({
  agencyId,
  selfManaged,
  initialForm,
  initialOwners,
  initialOwnersSaved,
  initialDraftId,
  onActivated,
}: {
  agencyId: string;
  selfManaged: boolean;
  initialForm: AddPropertyFormValues;
  initialOwners: AddPropertyOwner[];
  /** False when the owners came from an earlier draft's notes and are not on the property yet. */
  initialOwnersSaved: boolean;
  initialDraftId: string | null;
  /** Called once the server has activated the property, so lists can re-read. */
  onActivated: () => Promise<void> | void;
}) {
  const [form, setForm] = useState(initialForm);
  const [owners, setOwners] = useState(initialOwners);
  const [ownersSaved, setOwnersSaved] = useState(initialOwnersSaved);
  const [draftId, setDraftId] = useState(initialDraftId);
  const [saveState, setSaveState] = useState<AddPropertySaveState>(
    initialDraftId ? ADD_PROPERTY_SAVE_STATE.SAVED : ADD_PROPERTY_SAVE_STATE.IDLE,
  );
  const [issues, setIssues] = useState<AddPropertyIssue[]>([]);
  const [duplicateHref, setDuplicateHref] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activatedId, setActivatedId] = useState<string | null>(null);
  const [awaitingServiceApproval, setAwaitingServiceApproval] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(
    Boolean(
      initialForm.internalAreaSqm ||
        initialForm.landAreaSqm ||
        initialForm.floorLevel ||
        initialForm.storageSpaces,
    ),
  );
  const [featuresOpen, setFeaturesOpen] = useState(initialForm.features.length > 0);
  const [locationEdited, setLocationEdited] = useState(false);

  const draftIdRef = useRef(initialDraftId);
  const formRef = useRef(form);
  formRef.current = form;
  // One placeholder address for this visit, used only until a street line is typed.
  const placeholderRef = useRef(newPlaceholderAddress());
  const savedSignatureRef = useRef(
    initialDraftId ? addPropertyBodySignature(initialForm, placeholderRef.current) : '',
  );
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const duplicateSeq = useRef(0);

  const invalidFields = useMemo(() => new Set(issues.map((issue) => issue.field)), [issues]);

  const setField = <K extends keyof AddPropertyFormValues>(key: K, value: AddPropertyFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  /**
   * A hand edit to a part of the address that places it on the map means the pin no longer
   * stands for this address, so the pin and the Google place are dropped until it is picked
   * again. The unit does not move a building, so it is left out.
   */
  const setLocationPart = (
    key: 'streetNumber' | 'streetName' | 'suburb' | 'state' | 'postcode',
    value: string,
  ) => {
    if (form.latitude != null || form.googlePlaceId != null) setLocationEdited(true);
    setForm((current) => ({
      ...current,
      [key]: value,
      latitude: undefined,
      longitude: undefined,
      googlePlaceId: null,
    }));
  };

  const handlePlaceSelect = useCallback((parsed: ParsedAustralianAddress) => {
    setLocationEdited(false);
    setForm((current) => ({
      ...current,
      unit: parsed.unit || current.unit,
      streetNumber: parsed.streetNumber,
      streetName: parsed.streetName,
      suburb: parsed.suburb || current.suburb,
      state: parsed.state || current.state,
      postcode: parsed.postcode || current.postcode,
      latitude: parsed.lat,
      longitude: parsed.lng,
      googlePlaceId: parsed.placeId ?? null,
    }));
  }, []);

  /**
   * Saves what is on the page now and answers the draft's id. Saves run one after another, so
   * two quick changes can never start two drafts, and a save with nothing new is skipped.
   */
  const saveNow = useCallback((): Promise<string> => {
    const run = async (): Promise<string> => {
      const values = formRef.current;
      const signature = addPropertyBodySignature(values, placeholderRef.current);
      const existingId = draftIdRef.current;
      if (existingId && signature === savedSignatureRef.current) return existingId;

      setSaveState(ADD_PROPERTY_SAVE_STATE.SAVING);
      try {
        const body = buildAddPropertyBody(values, placeholderRef.current);
        const saved = existingId
          ? await updatePropertyDraft(existingId, body)
          : await createPropertyDraft(body);
        savedSignatureRef.current = signature;
        if (!existingId) {
          draftIdRef.current = saved.id;
          setDraftId(saved.id);
          // The address bar now names the draft, so a reload comes back to it.
          window.history.replaceState(null, '', propertyRegistryResume(saved.id));
        }
        setSaveState(ADD_PROPERTY_SAVE_STATE.SAVED);
        return saved.id;
      } catch (err) {
        setSaveState(ADD_PROPERTY_SAVE_STATE.ERROR);
        throw err;
      }
    };
    const next = saveQueueRef.current.then(run, run);
    saveQueueRef.current = next.catch(() => undefined);
    return next;
  }, []);

  const signature = addPropertyBodySignature(form, placeholderRef.current);

  // Autosave: the draft starts at the first address input and follows every change after.
  useEffect(() => {
    if (activating || activatedId || duplicateHref) return;
    if (!draftIdRef.current && !hasAddPropertyInput(form)) return;
    if (signature === savedSignatureRef.current) return;
    const timer = window.setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, ADD_PROPERTY_AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
    // `form` is read through `signature`; listing it would restart the timer on equal values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, activating, activatedId, duplicateHref, saveNow]);

  const streetAddress = streetAddressOf(form);
  const suburb = form.suburb.trim();

  // The agency cannot hold the same address twice; say so before the agent goes further.
  useEffect(() => {
    if (!streetAddress || !suburb) {
      setDuplicateHref(null);
      return;
    }
    const seq = ++duplicateSeq.current;
    const timer = window.setTimeout(() => {
      checkPropertyDuplicate({ address: streetAddress, suburb, excludePropertyId: draftId })
        .then((result) => {
          if (seq !== duplicateSeq.current) return;
          setDuplicateHref(result.duplicate ? propertyHref(result.duplicate) : null);
        })
        .catch(() => {
          // The server checks again at activation, so a failed look-up here blocks nothing.
          if (seq === duplicateSeq.current) setDuplicateHref(null);
        });
    }, DUPLICATE_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [streetAddress, suburb, draftId]);

  const focusField = (field: AddPropertyField) => {
    const element = document.getElementById(fieldId(field));
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (element instanceof HTMLElement) element.focus({ preventScroll: true });
  };

  const saveDraft = async () => {
    if (!draftIdRef.current && !hasAddPropertyInput(form) && owners.length === 0) {
      toast.message(ADD_PROPERTY_COPY.NOTHING_TO_SAVE);
      return;
    }
    try {
      await saveNow();
      toast.success(ADD_PROPERTY_COPY.DRAFT_SAVED_TOAST);
    } catch (err) {
      toast.error(apiErrorMessage(err, ADD_PROPERTY_COPY.SAVE_FAILED));
    }
  };

  const saveOwners = async (staged: AddPropertyOwner[]) => {
    const id = await saveNow();
    const saved = await savePropertyOwners(id, staged.map(ownerToInput));
    setOwners(saved.map(ownerFromApi));
    setOwnersSaved(true);
    setIssues((current) => current.filter((issue) => issue.field !== ADD_PROPERTY_FIELD.OWNERS));
    setDrawerOpen(false);
  };

  const showIssues = (next: AddPropertyIssue[]) => {
    setIssues(next);
    if (next[0]) focusField(next[0].field);
  };

  const activate = async () => {
    const local = validateAddPropertyActivation(form, owners, ownersSaved);
    if (local.length > 0) {
      showIssues(local);
      return;
    }
    if (!form.propertyType || duplicateHref) return;

    setActivating(true);
    setIssues([]);
    try {
      const id = await saveNow();
      const activated = await activateProperty(id, { propertyType: form.propertyType });
      await onActivated();
      setAwaitingServiceApproval(
        activated.approvalStatus === PROPERTY_APPROVAL_STATUS.PENDING,
      );
      setActivatedId(id);
    } catch (err) {
      const failed = apiValidationIssues(err);
      if (failed && apiErrorCode(err) === PROPERTY_INTAKE_FAILURE_CODE.ACTIVATION_FAILED) {
        const duplicateId = duplicatePropertyIdOf(err);
        if (duplicateId) {
          setDuplicateHref(propertyHref({ id: duplicateId, registryIntakeComplete: true }));
        }
        showIssues(
          failed.map((issue) => ({
            field: ADD_PROPERTY_API_FIELD[issue.field] ?? ADD_PROPERTY_FIELD.DETAILS,
            message: issue.message,
          })),
        );
      } else {
        toast.error(apiErrorMessage(err, ADD_PROPERTY_COPY.ACTIVATE_FAILED));
      }
    } finally {
      setActivating(false);
    }
  };

  if (activatedId) {
    return (
      <ActivationSuccess
        propertyId={activatedId}
        addressLine={[streetAddress, suburb, form.state, form.postcode].filter(Boolean).join(' ')}
        wantsTenancy={
          form.occupancy === PROPERTY_OCCUPANCY.TENANTED || form.upcomingTenancyArranged
        }
        selfManaged={selfManaged}
        awaitingServiceApproval={awaitingServiceApproval}
      />
    );
  }

  const vacant = form.occupancy === PROPERTY_OCCUPANCY.VACANT;
  const hasPin = form.latitude != null && form.longitude != null;
  const busy = activating;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {ADD_PROPERTY_COPY.DRAFT_BADGE}
        </span>
        <p className="text-muted-foreground text-sm">{ADD_PROPERTY_COPY.INTRO}</p>
      </div>

      {duplicateHref ? (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900/50 dark:bg-rose-950/30"
        >
          <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
            {ADD_PROPERTY_COPY.DUPLICATE_HEADING}
          </p>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
            {ADD_PROPERTY_COPY.DUPLICATE_BODY}{' '}
            <Link href={duplicateHref} className="font-medium underline">
              {ADD_PROPERTY_COPY.DUPLICATE_OPEN}
            </Link>
          </p>
        </div>
      ) : null}

      <Section
        title={ADD_PROPERTY_COPY.ADDRESS_HEADING}
        aside={<span className="text-muted-foreground text-xs">{ADD_PROPERTY_COPY.REQUIRED}</span>}
      >
        <PropertyAddressAutocomplete
          onPlaceSelect={handlePlaceSelect}
          latitude={form.latitude}
          longitude={form.longitude}
          disabled={busy}
          wideSearch
          locationFields={
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit / apartment">
                  <Input
                    inputKind="property_address"
                    value={form.unit}
                    onChange={(e) => setField('unit', e.target.value)}
                    placeholder={ADD_PROPERTY_COPY.OPTIONAL}
                    disabled={busy}
                  />
                </Field>
                <Field
                  label="Street number"
                  required
                  invalid={invalidFields.has(ADD_PROPERTY_FIELD.STREET_NUMBER)}
                >
                  <Input
                    id={fieldId(ADD_PROPERTY_FIELD.STREET_NUMBER)}
                    inputKind="property_address"
                    value={form.streetNumber}
                    onChange={(e) => setLocationPart('streetNumber', e.target.value)}
                    placeholder="e.g. 2"
                    disabled={busy}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Street name"
                  required
                  invalid={invalidFields.has(ADD_PROPERTY_FIELD.STREET_NAME)}
                >
                  <Input
                    id={fieldId(ADD_PROPERTY_FIELD.STREET_NAME)}
                    inputKind="property_address"
                    value={form.streetName}
                    onChange={(e) => setLocationPart('streetName', e.target.value)}
                    placeholder="e.g. Mandala Parade"
                    disabled={busy}
                  />
                </Field>
                <Field label="Suburb" required invalid={invalidFields.has(ADD_PROPERTY_FIELD.SUBURB)}>
                  <Input
                    id={fieldId(ADD_PROPERTY_FIELD.SUBURB)}
                    inputKind="property_address"
                    value={form.suburb}
                    onChange={(e) => setLocationPart('suburb', e.target.value)}
                    placeholder="e.g. Castle Hill"
                    disabled={busy}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="State / territory"
                  required
                  invalid={invalidFields.has(ADD_PROPERTY_FIELD.STATE)}
                >
                  <select
                    id={fieldId(ADD_PROPERTY_FIELD.STATE)}
                    value={form.state}
                    onChange={(e) => setLocationPart('state', e.target.value as AustralianStateKey)}
                    className={selectClass}
                    disabled={busy}
                  >
                    <option value="">Select state</option>
                    {AUSTRALIAN_STATE_ORDER.map((state) => (
                      <option key={state} value={state}>
                        {state} — {AUSTRALIAN_STATE_LABEL[state]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Postcode"
                  required
                  invalid={invalidFields.has(ADD_PROPERTY_FIELD.POSTCODE)}
                >
                  <Input
                    id={fieldId(ADD_PROPERTY_FIELD.POSTCODE)}
                    value={form.postcode}
                    onChange={(e) =>
                      setLocationPart(
                        'postcode',
                        e.target.value.replace(/\D/g, '').slice(0, AU_POSTCODE_LENGTH),
                      )
                    }
                    placeholder="e.g. 2154"
                    inputMode="numeric"
                    disabled={busy}
                  />
                </Field>
              </div>
              <Field label="Coordinates">
                <Input
                  readOnly
                  value={
                    hasPin ? `${form.latitude?.toFixed(6)}, ${form.longitude?.toFixed(6)}` : ''
                  }
                  placeholder="From the address search"
                  className="bg-muted/40 font-mono text-xs"
                />
              </Field>
              <p
                className={cn(
                  'text-xs',
                  locationEdited && !hasPin
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {hasPin
                  ? ADD_PROPERTY_COPY.LOCATION_MATCHED
                  : locationEdited
                    ? ADD_PROPERTY_COPY.LOCATION_UNVERIFIED
                    : ADD_PROPERTY_COPY.LOCATION_NONE}
              </p>
            </>
          }
        />
      </Section>

      <Section title={ADD_PROPERTY_COPY.ESSENTIAL_HEADING} id={fieldId(ADD_PROPERTY_FIELD.DETAILS)}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <Field
            label="Property type"
            required
            invalid={invalidFields.has(ADD_PROPERTY_FIELD.PROPERTY_TYPE)}
          >
            <select
              id={fieldId(ADD_PROPERTY_FIELD.PROPERTY_TYPE)}
              value={form.propertyType}
              onChange={(e) => setField('propertyType', e.target.value as PropertyType | '')}
              className={selectClass}
              disabled={busy}
            >
              <option value="">Select type</option>
              {PROPERTY_TYPE_ORDER.map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Furnished">
            <select
              value={form.furnishing}
              onChange={(e) => setField('furnishing', e.target.value as PropertyFurnishing | '')}
              className={selectClass}
              disabled={busy}
            >
              <option value="">{ADD_PROPERTY_COPY.UNKNOWN_PLACEHOLDER}</option>
              {PROPERTY_FURNISHING_ORDER.map((option) => (
                <option key={option} value={option}>
                  {PROPERTY_FURNISHING_LABEL[option]}
                </option>
              ))}
            </select>
          </Field>
          {(
            [
              ['Bedrooms', 'bedrooms'],
              ['Bathrooms', 'bathrooms'],
              ['Parking', 'parking'],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={PROPERTY_DETAIL_LIMIT.ROOM_COUNT_MAX}
                step={1}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                placeholder="—"
                disabled={busy}
              />
            </Field>
          ))}
        </div>

        <Collapsible
          title={ADD_PROPERTY_COPY.ADDITIONAL_HEADING}
          aside={ADD_PROPERTY_COPY.OPTIONAL}
          open={additionalOpen}
          onToggle={() => setAdditionalOpen((open) => !open)}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="Internal area (m²)">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.internalAreaSqm}
                onChange={(e) => setField('internalAreaSqm', e.target.value)}
                placeholder={ADD_PROPERTY_COPY.OPTIONAL}
                disabled={busy}
              />
            </Field>
            <Field label="Land area (m²)">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.landAreaSqm}
                onChange={(e) => setField('landAreaSqm', e.target.value)}
                placeholder={ADD_PROPERTY_COPY.OPTIONAL}
                disabled={busy}
              />
            </Field>
            <Field label="Floor / level">
              <Input
                value={form.floorLevel}
                maxLength={PROPERTY_DETAIL_LIMIT.FLOOR_LEVEL_MAX_LENGTH}
                onChange={(e) => setField('floorLevel', e.target.value)}
                placeholder={ADD_PROPERTY_COPY.OPTIONAL}
                disabled={busy}
              />
            </Field>
            <Field label="Storage spaces">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={PROPERTY_DETAIL_LIMIT.STORAGE_SPACES_MAX}
                step={1}
                value={form.storageSpaces}
                onChange={(e) => setField('storageSpaces', e.target.value)}
                placeholder={ADD_PROPERTY_COPY.OPTIONAL}
                disabled={busy}
              />
            </Field>
          </div>
        </Collapsible>

        <Collapsible
          title={ADD_PROPERTY_COPY.FEATURES_HEADING}
          aside={`${form.features.length} selected`}
          open={featuresOpen}
          onToggle={() => setFeaturesOpen((open) => !open)}
        >
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {PROPERTY_FEATURE_ORDER.map((feature: PropertyFeature) => (
              <label key={feature} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.features.includes(feature)}
                  disabled={busy}
                  onChange={(e) =>
                    setField(
                      'features',
                      e.target.checked
                        ? [...form.features, feature]
                        : form.features.filter((item) => item !== feature),
                    )
                  }
                />
                {PROPERTY_FEATURE_LABEL[feature]}
              </label>
            ))}
          </div>
        </Collapsible>
      </Section>

      <Section title={ADD_PROPERTY_COPY.OCCUPANCY_HEADING}>
        <div className="flex flex-wrap gap-6">
          {(
            [
              [PROPERTY_OCCUPANCY.VACANT, ADD_PROPERTY_COPY.VACANT],
              [PROPERTY_OCCUPANCY.TENANTED, ADD_PROPERTY_COPY.TENANTED],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="occupancy"
                value={value}
                checked={form.occupancy === value}
                disabled={busy}
                onChange={() =>
                  setForm((current) => ({
                    ...current,
                    occupancy: value as PropertyOccupancy,
                    upcomingTenancyArranged:
                      value === PROPERTY_OCCUPANCY.VACANT ? current.upcomingTenancyArranged : false,
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        {vacant ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.upcomingTenancyArranged}
              disabled={busy}
              onChange={(e) => setField('upcomingTenancyArranged', e.target.checked)}
            />
            {ADD_PROPERTY_COPY.UPCOMING}
          </label>
        ) : null}
      </Section>

      <Section
        title={ADD_PROPERTY_COPY.OWNERS_HEADING}
        aside={
          <Button
            id={fieldId(ADD_PROPERTY_FIELD.OWNERS)}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
            disabled={busy}
          >
            <Plus className="size-3.5" />
            {owners.length > 0 ? ADD_PROPERTY_COPY.MANAGE_OWNERS : ADD_PROPERTY_COPY.LINK_OWNER}
          </Button>
        }
      >
        {owners.length === 0 ? (
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-3',
              invalidFields.has(ADD_PROPERTY_FIELD.OWNERS) && 'border-rose-300',
            )}
          >
            <p className="text-muted-foreground text-sm">{ADD_PROPERTY_COPY.NO_OWNER}</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {ADD_PROPERTY_COPY.REQUIRED}
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {owners.map((owner) => (
              <li key={owner.key} className="flex items-center gap-3 py-2">
                <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {owner.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{owner.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {[owner.email, owner.phone].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {owner.isPrimary ? (
                  <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                    {ADD_PROPERTY_COPY.PRIMARY}
                  </span>
                ) : null}
                {owner.ownershipPercent ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {owner.ownershipPercent}%
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {owners.length > 0 && !ownersSaved ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {ADD_PROPERTY_COPY.OWNERS_UNSAVED}
          </p>
        ) : null}
      </Section>

      {issues.length > 0 ? (
        <div
          id={ACTIVATION_ISSUES_ID}
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900/50 dark:bg-rose-950/30"
        >
          <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
            {ADD_PROPERTY_COPY.ACTIVATION_ERRORS_HEADING}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-rose-700 dark:text-rose-400">
            {issues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:underline"
                  onClick={() => focusField(issue.field)}
                >
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Buttons sit on the left: the Cros chat button floats over the bottom right corner. */}
      <div className="bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t px-1 py-3 backdrop-blur">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void saveDraft()}
            disabled={busy || saveState === ADD_PROPERTY_SAVE_STATE.SAVING}
          >
            {ADD_PROPERTY_COPY.SAVE_DRAFT}
          </Button>
          <Button type="button" onClick={() => void activate()} disabled={busy || !!duplicateHref}>
            {activating ? ADD_PROPERTY_COPY.ACTIVATING : ADD_PROPERTY_COPY.ACTIVATE}
          </Button>
        </div>
        <p
          aria-live="polite"
          className={cn(
            'flex items-center gap-1.5 text-xs',
            saveState === ADD_PROPERTY_SAVE_STATE.ERROR
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground',
          )}
        >
          {saveState === ADD_PROPERTY_SAVE_STATE.ERROR ? (
            <CloudOff className="size-3.5" />
          ) : (
            <Cloud className="size-3.5" />
          )}
          {saveState === ADD_PROPERTY_SAVE_STATE.SAVING
            ? ADD_PROPERTY_COPY.SAVING
            : saveState === ADD_PROPERTY_SAVE_STATE.SAVED
              ? ADD_PROPERTY_COPY.SAVED
              : saveState === ADD_PROPERTY_SAVE_STATE.ERROR
                ? ADD_PROPERTY_COPY.SAVE_FAILED
                : ADD_PROPERTY_COPY.NOT_SAVED}
          {saveState === ADD_PROPERTY_SAVE_STATE.ERROR ? (
            <button type="button" className="font-medium underline" onClick={() => void saveDraft()}>
              {ADD_PROPERTY_COPY.SAVE_RETRY}
            </button>
          ) : null}
        </p>
        {issues.length > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-rose-600 underline dark:text-rose-400"
            onClick={() =>
              document
                .getElementById(ACTIVATION_ISSUES_ID)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          >
            {issues.length} {ADD_PROPERTY_COPY.ISSUES_TO_FIX}
          </button>
        ) : null}
      </div>

      <OwnerDrawer
        open={drawerOpen}
        agencyId={agencyId}
        owners={owners}
        onClose={() => setDrawerOpen(false)}
        onSave={saveOwners}
      />
    </div>
  );
}
