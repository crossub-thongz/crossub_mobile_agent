import {
  ACTIVATION_ERROR,
  ADD_PROPERTY_DRAFT_VERSION,
  ADD_PROPERTY_FIELD,
  ADD_PROPERTY_PLACEHOLDER_ADDRESS,
  AU_POSTCODE_LENGTH,
  OWNER_ERROR,
  OWNER_PHONE_MIN_DIGITS,
  OWNERSHIP_TOTAL_PERCENT,
  OWNERSHIP_TOTAL_TOLERANCE,
  PROPERTY_DETAIL_LIMIT,
  PROPERTY_FEATURE_ORDER,
  PROPERTY_OCCUPANCY,
  type AddPropertyField,
  type PropertyFeature,
  type PropertyFurnishing,
  type PropertyOccupancy,
} from '@/constants/add-property';
import {
  PROPERTY_STATUS,
  PROPERTY_TYPE,
  PROPERTY_TYPE_ORDER,
  type AustralianStateKey,
  type PropertyStatus,
  type PropertyType,
} from '@/constants/api-enums';
import { composeStreetAddress } from '@/lib/google-places';

/** Everything the Add Property page collects. Counts and areas stay text until saved. */
export interface AddPropertyFormValues {
  unit: string;
  streetNumber: string;
  streetName: string;
  suburb: string;
  state: AustralianStateKey | '';
  postcode: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId: string | null;
  propertyType: PropertyType | '';
  furnishing: PropertyFurnishing | '';
  bedrooms: string;
  bathrooms: string;
  parking: string;
  internalAreaSqm: string;
  landAreaSqm: string;
  floorLevel: string;
  storageSpaces: string;
  features: PropertyFeature[];
  occupancy: PropertyOccupancy;
  upcomingTenancyArranged: boolean;
}

/** One owner on the page or staged in the drawer. */
export interface AddPropertyOwner {
  /** Stable key for lists; the contact id once saved. */
  key: string;
  contactId?: string;
  personId?: string;
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  /** Text as typed; blank when shares are not recorded. */
  ownershipPercent: string;
}

export interface AddPropertyIssue {
  field: AddPropertyField;
  message: string;
}

export function emptyAddPropertyForm(): AddPropertyFormValues {
  return {
    unit: '',
    streetNumber: '',
    streetName: '',
    suburb: '',
    state: '',
    postcode: '',
    googlePlaceId: null,
    propertyType: '',
    furnishing: '',
    bedrooms: '',
    bathrooms: '',
    parking: '',
    internalAreaSqm: '',
    landAreaSqm: '',
    floorLevel: '',
    storageSpaces: '',
    features: [],
    occupancy: PROPERTY_OCCUPANCY.VACANT,
    upcomingTenancyArranged: false,
  };
}

/** A blank field is unknown (null). Anything that is not a valid number is `undefined`. */
export function parseOptionalNumber(
  raw: string,
  options: { integer: boolean; max: number },
): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const pattern = options.integer ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
  if (!pattern.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value <= options.max ? value : undefined;
}

const COUNT = { integer: true, max: PROPERTY_DETAIL_LIMIT.ROOM_COUNT_MAX } as const;
const STORAGE = { integer: true, max: PROPERTY_DETAIL_LIMIT.STORAGE_SPACES_MAX } as const;
const AREA = { integer: false, max: PROPERTY_DETAIL_LIMIT.AREA_SQM_MAX } as const;

export function streetAddressOf(
  form: Pick<AddPropertyFormValues, 'unit' | 'streetNumber' | 'streetName'>,
): string {
  return composeStreetAddress(form.unit, form.streetNumber, form.streetName).trim();
}

/** True once the agent has typed something worth keeping, which is when a draft is first saved. */
export function hasAddPropertyInput(form: AddPropertyFormValues): boolean {
  return Boolean(streetAddressOf(form) || form.suburb.trim());
}

function statusOf(occupancy: PropertyOccupancy): PropertyStatus {
  return occupancy === PROPERTY_OCCUPANCY.TENANTED
    ? PROPERTY_STATUS.OCCUPIED
    : PROPERTY_STATUS.VACANT;
}

/**
 * The create/update body for a draft. A number that does not parse is left out, so a typo is
 * never saved as something else; activation reports it. Owner and tenant fields are never
 * sent from here: owners are saved as their own set, and a tenancy is added afterwards.
 */
export function buildAddPropertyBody(form: AddPropertyFormValues, placeholderAddress: string) {
  const bedrooms = parseOptionalNumber(form.bedrooms, COUNT);
  const bathrooms = parseOptionalNumber(form.bathrooms, COUNT);
  const parking = parseOptionalNumber(form.parking, COUNT);
  const storageSpaces = parseOptionalNumber(form.storageSpaces, STORAGE);
  const internalAreaSqm = parseOptionalNumber(form.internalAreaSqm, AREA);
  const landAreaSqm = parseOptionalNumber(form.landAreaSqm, AREA);
  const postcode = form.postcode.trim();
  const tenanted = form.occupancy === PROPERTY_OCCUPANCY.TENANTED;

  const address = streetAddressOf(form) || placeholderAddress;

  return {
    address,
    // The API names a property from its address once, at creation, and never again. Sending
    // the name with every save keeps a draft started without a street line from staying
    // "Draft property" after the address is typed.
    name: address,
    ...(form.suburb.trim() ? { suburb: form.suburb.trim() } : {}),
    ...(form.state ? { state: form.state } : {}),
    ...(postcode.length === AU_POSTCODE_LENGTH ? { postcode } : {}),
    ...(form.propertyType ? { propertyType: form.propertyType } : {}),
    status: statusOf(form.occupancy),
    ...(form.latitude != null && form.longitude != null
      ? { latitude: form.latitude, longitude: form.longitude }
      : {}),
    details: {
      ...(bedrooms !== undefined ? { bedrooms } : {}),
      ...(bathrooms !== undefined ? { bathrooms } : {}),
      ...(parking !== undefined ? { parking } : {}),
      ...(storageSpaces !== undefined ? { storageSpaces } : {}),
      ...(internalAreaSqm !== undefined ? { internalAreaSqm } : {}),
      ...(landAreaSqm !== undefined ? { landAreaSqm } : {}),
      furnishing: form.furnishing || null,
      floorLevel: form.floorLevel.trim() || null,
      features: form.features,
      upcomingTenancyArranged: !tenanted && form.upcomingTenancyArranged,
      googlePlaceId: form.googlePlaceId,
    },
    registryDraft: {
      version: ADD_PROPERTY_DRAFT_VERSION,
      unit: form.unit,
      streetNumber: form.streetNumber,
      streetName: form.streetName,
      // A draft is stored with a default type until one is picked; this says which it is.
      propertyTypeChosen: Boolean(form.propertyType),
    },
  };
}

export type AddPropertyBody = ReturnType<typeof buildAddPropertyBody>;

/** A stable string of what would be saved, to tell a real change from a re-render. */
export function addPropertyBodySignature(
  form: AddPropertyFormValues,
  placeholderAddress: string,
): string {
  return JSON.stringify(buildAddPropertyBody(form, placeholderAddress));
}

/**
 * The address a draft is saved under until a street line is typed. The agency cannot hold two
 * properties at one address, so each untitled draft needs its own; the suffix is only that.
 */
export function newPlaceholderAddress(now: Date = new Date()): string {
  return `${ADD_PROPERTY_PLACEHOLDER_ADDRESS} ${now.getTime().toString(36)}`;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

const collapse = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** The same owner twice: one linked person, or one name with the same email or phone. */
export function isSameOwner(a: AddPropertyOwner, b: AddPropertyOwner): boolean {
  if (a.personId && b.personId) return a.personId === b.personId;
  if (collapse(a.name) !== collapse(b.name) || !collapse(a.name)) return false;
  const sameEmail = Boolean(collapse(a.email)) && collapse(a.email) === collapse(b.email);
  const samePhone = Boolean(digitsOf(a.phone)) && digitsOf(a.phone) === digitsOf(b.phone);
  return sameEmail || samePhone;
}

/** What stops one owner being added to the drawer's list. */
export function validateNewOwner(
  owner: AddPropertyOwner,
  existing: readonly AddPropertyOwner[],
): string[] {
  const errors: string[] = [];
  if (!owner.name.trim()) errors.push(OWNER_ERROR.NAME_REQUIRED);
  const email = owner.email.trim();
  const phone = owner.phone.trim();
  if (!email && !phone) errors.push(OWNER_ERROR.CONTACT_REQUIRED);
  if (email && !isEmail(email)) errors.push(OWNER_ERROR.EMAIL_INVALID);
  if (phone && digitsOf(phone).length < OWNER_PHONE_MIN_DIGITS) {
    errors.push(OWNER_ERROR.PHONE_INVALID);
  }
  if (existing.some((other) => isSameOwner(other, owner))) errors.push(OWNER_ERROR.DUPLICATE);
  return errors;
}

export function ownershipTotal(owners: readonly AddPropertyOwner[]): number {
  return owners.reduce((sum, owner) => sum + (Number(owner.ownershipPercent) || 0), 0);
}

function isValidShare(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  return Number(trimmed) <= OWNERSHIP_TOTAL_PERCENT;
}

/** What stops Save Owners. The API checks the same rules again. */
export function validateOwnerSelection(
  owners: readonly AddPropertyOwner[],
  percentEnabled: boolean,
): string[] {
  const errors: string[] = [];
  if (owners.length === 0) return [OWNER_ERROR.NONE];
  if (owners.filter((owner) => owner.isPrimary).length !== 1) errors.push(OWNER_ERROR.PRIMARY);
  if (percentEnabled) {
    if (owners.some((owner) => !isValidShare(owner.ownershipPercent))) {
      errors.push(OWNER_ERROR.PERCENT_INCOMPLETE);
    } else if (
      Math.abs(ownershipTotal(owners) - OWNERSHIP_TOTAL_PERCENT) > OWNERSHIP_TOTAL_TOLERANCE
    ) {
      errors.push(OWNER_ERROR.PERCENT_TOTAL);
    }
  }
  return errors;
}

/** Exactly one primary: the flagged owner, else the first. */
export function withOnePrimary(owners: AddPropertyOwner[], primaryKey?: string): AddPropertyOwner[] {
  if (owners.length === 0) return owners;
  const wanted =
    owners.find((owner) => owner.key === primaryKey)?.key ??
    owners.find((owner) => owner.isPrimary)?.key ??
    owners[0].key;
  return owners.map((owner) => ({ ...owner, isPrimary: owner.key === wanted }));
}

/** The form's own check before Activate, so the agent is not sent to the server to learn it. */
export function validateAddPropertyActivation(
  form: AddPropertyFormValues,
  owners: readonly AddPropertyOwner[],
  ownersSaved: boolean,
): AddPropertyIssue[] {
  const issues: AddPropertyIssue[] = [];
  const add = (field: AddPropertyField, message: string) => issues.push({ field, message });

  if (!form.streetNumber.trim()) add(ADD_PROPERTY_FIELD.STREET_NUMBER, ACTIVATION_ERROR.STREET_NUMBER);
  if (!form.streetName.trim()) add(ADD_PROPERTY_FIELD.STREET_NAME, ACTIVATION_ERROR.STREET_NAME);
  if (!form.suburb.trim()) add(ADD_PROPERTY_FIELD.SUBURB, ACTIVATION_ERROR.SUBURB);
  if (!form.state) add(ADD_PROPERTY_FIELD.STATE, ACTIVATION_ERROR.STATE);
  if (form.postcode.trim().length !== AU_POSTCODE_LENGTH) {
    add(ADD_PROPERTY_FIELD.POSTCODE, ACTIVATION_ERROR.POSTCODE);
  }
  if (!form.propertyType) add(ADD_PROPERTY_FIELD.PROPERTY_TYPE, ACTIVATION_ERROR.PROPERTY_TYPE);

  const numeric: Array<[string, Parameters<typeof parseOptionalNumber>[1], string]> = [
    [form.bedrooms, COUNT, ACTIVATION_ERROR.BEDROOMS],
    [form.bathrooms, COUNT, ACTIVATION_ERROR.BATHROOMS],
    [form.parking, COUNT, ACTIVATION_ERROR.PARKING],
    [form.storageSpaces, STORAGE, ACTIVATION_ERROR.STORAGE],
    [form.internalAreaSqm, AREA, ACTIVATION_ERROR.INTERNAL_AREA],
    [form.landAreaSqm, AREA, ACTIVATION_ERROR.LAND_AREA],
  ];
  for (const [raw, rule, message] of numeric) {
    if (parseOptionalNumber(raw, rule) === undefined) add(ADD_PROPERTY_FIELD.DETAILS, message);
  }

  if (owners.length === 0) {
    add(ADD_PROPERTY_FIELD.OWNERS, ACTIVATION_ERROR.OWNERS);
  } else if (!ownersSaved) {
    add(ADD_PROPERTY_FIELD.OWNERS, ACTIVATION_ERROR.OWNERS_UNSAVED);
  } else if (owners.filter((owner) => owner.isPrimary).length !== 1) {
    add(ADD_PROPERTY_FIELD.OWNERS, ACTIVATION_ERROR.PRIMARY);
  }
  return issues;
}

/** What a saved property needs to give back to refill the form. */
export interface AddPropertySavedProperty {
  address: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  /** As the API sends it; a type this app does not offer is read as not chosen. */
  propertyType: string;
  status: PropertyStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  furnishing: PropertyFurnishing | null;
  internalAreaSqm: number | null;
  landAreaSqm: number | null;
  floorLevel: string | null;
  storageSpaces: number | null;
  features: string[];
  upcomingTenancyArranged: boolean;
  googlePlaceId: string | null;
  registryDraft?: Record<string, unknown> | null;
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const numberText = (value: number | null | undefined): string =>
  value != null && Number.isFinite(value) ? String(value) : '';

function isOfferedPropertyType(value: string): value is PropertyType {
  return (PROPERTY_TYPE_ORDER as readonly string[]).includes(value);
}

function isFeature(value: string): value is PropertyFeature {
  return (PROPERTY_FEATURE_ORDER as readonly string[]).includes(value);
}

/**
 * Refill the form from a saved draft. The street parts come from the draft's own record of
 * them; a draft saved by the earlier stepped form kept them under the same names. A draft
 * still carrying the placeholder address has no street line.
 *
 * `propertyTypeChosen` says whether the stored type is the agent's choice. A draft is stored
 * with a default type until one is picked, and that default must not show as an answer.
 */
export function hydrateAddPropertyForm(
  saved: AddPropertySavedProperty,
  propertyTypeChosen: boolean,
): AddPropertyFormValues {
  const draft = saved.registryDraft ?? {};
  const hasStreet = !saved.address.trim().startsWith('Draft');
  const streetName = text(draft.streetName) || (hasStreet ? saved.address : '');
  return {
    unit: text(draft.unit),
    streetNumber: text(draft.streetNumber),
    streetName,
    suburb: saved.suburb ?? '',
    state: (saved.state as AustralianStateKey | null) ?? '',
    postcode: saved.postcode ?? '',
    latitude: saved.latitude ?? undefined,
    longitude: saved.longitude ?? undefined,
    googlePlaceId: saved.googlePlaceId,
    propertyType: propertyTypeChosen && isOfferedPropertyType(saved.propertyType) ? saved.propertyType : '',
    furnishing: saved.furnishing ?? '',
    bedrooms: numberText(saved.bedrooms),
    bathrooms: numberText(saved.bathrooms),
    parking: numberText(saved.parking),
    internalAreaSqm: numberText(saved.internalAreaSqm),
    landAreaSqm: numberText(saved.landAreaSqm),
    floorLevel: saved.floorLevel ?? '',
    storageSpaces: numberText(saved.storageSpaces),
    features: saved.features.filter(isFeature),
    occupancy:
      saved.status === PROPERTY_STATUS.VACANT
        ? PROPERTY_OCCUPANCY.VACANT
        : PROPERTY_OCCUPANCY.TENANTED,
    upcomingTenancyArranged: saved.upcomingTenancyArranged,
  };
}

/**
 * Whether the stored property type is the agent's own choice. A draft from this page says so.
 * A draft from the earlier stepped form does not, so only a type other than the default
 * (Apartment) is taken as chosen there; the agent re-picks Apartment if that was the answer.
 */
export function draftPropertyTypeChosen(
  registryDraft: Record<string, unknown> | null | undefined,
  storedType: string,
): boolean {
  if (registryDraft?.version === ADD_PROPERTY_DRAFT_VERSION) {
    return registryDraft.propertyTypeChosen === true;
  }
  return storedType !== PROPERTY_TYPE.APARTMENT;
}
