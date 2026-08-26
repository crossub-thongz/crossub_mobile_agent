import type { ExtraLeasingDocumentRow } from '@/components/agent/property-leasing-details-section';
import type { LeasingDetailsValues } from '@/components/agent/property-leasing-details-section';
import type {
  ExtraManagementDocumentRow,
  ManagementDetailsValues,
  ManagementFeeRow,
} from '@/components/agent/property-management-details-section';
import { EMPTY_MANAGEMENT_DETAILS } from '@/components/agent/property-management-details-section';
import type {
  FurnishedChoice,
  NewPropertyRegistryValues,
} from '@/components/agent/new-property-registry-form';
import {
  mapLeaseStatusToPropertyStatusForApi,
  parseCount,
  parseMoney,
  parsePercent,
} from '@/components/agent/new-property-registry-form';
import { EMPTY_STRATA_DETAILS, type StrataDetailsValues } from '@/components/agent/property-strata-details-section';
import type { CreateAgentPropertyInput, UpdateAgentPropertyInput } from '@/lib/crossub-api/agent-client';
import { composeStreetAddress } from '@/lib/google-places';
import { emptyPartyContact } from '@/lib/property-parties';
import { bondFromWeekly, weeklyRentFromAmount } from '@/lib/rent-calculations';
import { syncManagementFeesToScalars } from '@/components/agent/property-management-details-section';
import type { Property, PropertyPartyContact } from '@/lib/types';

export type PropertyRegistryWizardStep =
  | 'property'
  | 'tenant'
  | 'landlord'
  | 'strata'
  | 'documents';

// A `type` rather than an `interface` so it carries an implicit index signature and is
// assignable to `registryDraft?: Record<string, unknown> | null` on its own. An interface
// has no index signature, which is why the call site needed a cast TS flagged as unsound.
export type PropertyRegistryDraftPayload = {
  version: 1;
  step: PropertyRegistryWizardStep;
  furthestStepIndex: number;
  unit: string;
  streetNumber: string;
  streetName: string;
  agencyCompany: string;
  leaseStatus: string;
  furnished: FurnishedChoice;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  routineInspectionFrequency?: 2 | 3;
  landlords: PropertyPartyContact[];
  tenants: PropertyPartyContact[];
  rentPeriod: string;
  rentAmount: string;
  agreementStart: string;
  agreementEnd: string;
  strata: StrataDetailsValues;
  managementFees: ManagementFeeRow[];
  managementExtraDocuments: ExtraManagementDocumentRow[];
  leasingExtraDocuments: ExtraLeasingDocumentRow[];
  leasingExtraPropertyDocuments: ExtraLeasingDocumentRow[];
};

export interface PropertyRegistryAutosaveState {
  form: NewPropertyRegistryValues;
  step: PropertyRegistryWizardStep;
  furthestStepIndex: number;
}

const WIZARD_STEPS: PropertyRegistryWizardStep[] = [
  'property',
  'tenant',
  'landlord',
  'strata',
  'documents',
];

function isWizardStep(value: string): value is PropertyRegistryWizardStep {
  return (WIZARD_STEPS as string[]).includes(value);
}

function countToString(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? String(value) : '';
}

function moneyToString(value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? String(value) : '';
}

function furnishedChoice(value: boolean | null | undefined): FurnishedChoice {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
}

export function draftRegistryAddress(
  form: Pick<NewPropertyRegistryValues, 'unit' | 'streetNumber' | 'streetName' | 'suburb'>,
): string | null {
  const composed = composeStreetAddress(form.unit, form.streetNumber, form.streetName).trim();
  if (composed) return composed;
  const suburb = form.suburb.trim();
  if (suburb) return `Draft — ${suburb}`;
  return null;
}

export function canAutoSaveRegistry(
  form: Pick<NewPropertyRegistryValues, 'unit' | 'streetNumber' | 'streetName' | 'suburb'>,
): boolean {
  return draftRegistryAddress(form) != null;
}

export function buildRegistryDraftPayload(
  state: PropertyRegistryAutosaveState,
): PropertyRegistryDraftPayload {
  const { form, step, furthestStepIndex } = state;
  return {
    version: 1,
    step,
    furthestStepIndex,
    unit: form.unit,
    streetNumber: form.streetNumber,
    streetName: form.streetName,
    agencyCompany: form.agencyCompany,
    leaseStatus: form.leaseStatus,
    furnished: form.furnished,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    parking: form.parking,
    routineInspectionFrequency: form.routineInspectionFrequency,
    landlords: form.landlords,
    tenants: form.tenants,
    rentPeriod: form.leasing.rentPeriod,
    rentAmount: form.leasing.rentAmount,
    agreementStart: form.leasing.agreementStart,
    agreementEnd: form.leasing.agreementEnd,
    strata: form.strata,
    managementFees: form.management.fees,
    managementExtraDocuments: form.management.extraDocuments,
    leasingExtraDocuments: form.leasing.extraDocuments,
    leasingExtraPropertyDocuments: form.leasing.extraPropertyDocuments,
  };
}

function parseDraftPayload(raw: unknown): PropertyRegistryDraftPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const draft = raw as Partial<PropertyRegistryDraftPayload>;
  if (draft.version !== 1 || !draft.step || !isWizardStep(draft.step)) return null;
  return {
    version: 1,
    step: draft.step,
    furthestStepIndex:
      typeof draft.furthestStepIndex === 'number' && draft.furthestStepIndex >= 0
        ? draft.furthestStepIndex
        : 0,
    unit: draft.unit ?? '',
    streetNumber: draft.streetNumber ?? '',
    streetName: draft.streetName ?? '',
    agencyCompany: draft.agencyCompany ?? '',
    leaseStatus: draft.leaseStatus ?? '',
    furnished: draft.furnished === 'yes' || draft.furnished === 'no' ? draft.furnished : '',
    bedrooms: draft.bedrooms ?? '',
    bathrooms: draft.bathrooms ?? '',
    parking: draft.parking ?? '',
    landlords: Array.isArray(draft.landlords) && draft.landlords.length > 0
      ? draft.landlords
      : [emptyPartyContact()],
    tenants: Array.isArray(draft.tenants) && draft.tenants.length > 0
      ? draft.tenants
      : [emptyPartyContact()],
    rentPeriod: draft.rentPeriod ?? '',
    rentAmount: draft.rentAmount ?? '',
    agreementStart: draft.agreementStart ?? '',
    agreementEnd: draft.agreementEnd ?? '',
    strata: { ...EMPTY_STRATA_DETAILS, ...(draft.strata ?? {}) },
    managementFees: Array.isArray(draft.managementFees) ? draft.managementFees : EMPTY_MANAGEMENT_DETAILS.fees,
    managementExtraDocuments: Array.isArray(draft.managementExtraDocuments)
      ? draft.managementExtraDocuments
      : [],
    leasingExtraDocuments: Array.isArray(draft.leasingExtraDocuments) ? draft.leasingExtraDocuments : [],
    leasingExtraPropertyDocuments: Array.isArray(draft.leasingExtraPropertyDocuments)
      ? draft.leasingExtraPropertyDocuments
      : [],
  };
}

export function hydrateRegistryFormFromProperty(
  property: Property,
  draftRaw: unknown,
  defaults: { agencyName: string; agencyCompany?: string },
): PropertyRegistryAutosaveState {
  const draft = parseDraftPayload(draftRaw);
  const managementScalars = syncManagementFeesToScalars({
    ...EMPTY_MANAGEMENT_DETAILS,
    fees: draft?.managementFees ?? EMPTY_MANAGEMENT_DETAILS.fees,
  });

  const form: NewPropertyRegistryValues = {
    agencyName: defaults.agencyName,
    agencyCompany: draft?.agencyCompany ?? defaults.agencyCompany ?? '',
    unit: draft?.unit ?? '',
    streetNumber: draft?.streetNumber ?? '',
    streetName: draft?.streetName || property.address,
    address: property.address,
    suburb: property.suburb ?? '',
    state: (property.state as NewPropertyRegistryValues['state']) ?? '',
    postcode: property.postcode ?? '',
    latitude: property.latitude,
    longitude: property.longitude,
    propertyType: (property.propertyType as NewPropertyRegistryValues['propertyType']) ?? '',
    leaseStatus: (draft?.leaseStatus as NewPropertyRegistryValues['leaseStatus']) || property.leaseStatus || '',
    bedrooms: draft?.bedrooms ?? countToString(property.bedrooms),
    bathrooms: draft?.bathrooms ?? countToString(property.bathrooms),
    parking: draft?.parking ?? countToString(property.carSpaces),
    furnished: draft?.furnished ?? furnishedChoice(property.furnished),
    routineInspectionFrequency:
      draft?.routineInspectionFrequency === 3 ? 3 : 2,
    landlords: draft?.landlords ?? [
      {
        name: property.homeOwnerName === '—' ? '' : property.homeOwnerName,
        email: property.homeOwnerContact.email ?? '',
        phone: property.homeOwnerContact.phone ?? '',
      },
    ],
    tenants: draft?.tenants ?? [
      {
        name: property.tenantName === '—' || property.tenantName === 'Vacant' ? '' : property.tenantName,
        email: property.tenantContact.email ?? '',
        phone: property.tenantContact.phone ?? '',
      },
    ],
    strata: draft?.strata ?? {
      buildingName: property.buildingName ?? '',
      strataPlanNumber: property.strataPlanNumber ?? '',
      strataName: '',
      strataEmail: '',
      strataContactNumber: '',
      buildingManagerName: '',
      buildingManagerEmail: '',
      buildingManagerContactNumber: '',
    },
    management: {
      ...EMPTY_MANAGEMENT_DETAILS,
      landlordInsuranceExpiry: property.landlordInsuranceExpiry?.slice(0, 10) ?? '',
      fees: draft?.managementFees ?? EMPTY_MANAGEMENT_DETAILS.fees,
      extraDocuments: draft?.managementExtraDocuments ?? [],
      uploads: {},
      ...managementScalars,
    },
    leasing: {
      rentAmount: draft?.rentAmount ?? (property.rentWeekly > 0 ? String(property.rentWeekly) : ''),
      rentPeriod: (draft?.rentPeriod ?? '') as LeasingDetailsValues['rentPeriod'],
      agreementStart: draft?.agreementStart ?? property.leaseStart?.slice(0, 10) ?? '',
      agreementEnd: draft?.agreementEnd ?? property.leaseEnd?.slice(0, 10) ?? '',
      uploads: {},
      extraDocuments: draft?.leasingExtraDocuments ?? [],
      extraPropertyDocuments: draft?.leasingExtraPropertyDocuments ?? [],
    },
    pendingDocuments: [],
  };

  return {
    form,
    step: draft?.step ?? 'property',
    furthestStepIndex: draft?.furthestStepIndex ?? 0,
  };
}

export function buildRegistryApiBody(
  values: NewPropertyRegistryValues,
  options: {
    complete: boolean;
    step: PropertyRegistryWizardStep;
    furthestStepIndex: number;
  },
): CreateAgentPropertyInput & UpdateAgentPropertyInput {
  const address =
    composeStreetAddress(values.unit, values.streetNumber, values.streetName).trim() ||
    draftRegistryAddress(values) ||
    'Draft property';
  const { leasing, strata, management } = values;
  const managementSynced = syncManagementFeesToScalars(management);
  const weeklyRent = weeklyRentFromAmount(Number(leasing.rentAmount), leasing.rentPeriod);
  const landlords = values.landlords;
  const tenants = values.tenants;
  const primaryLandlord = landlords[0];
  const primaryTenant = tenants[0];

  return {
    address,
    suburb: values.suburb.trim() || undefined,
    state: values.state || undefined,
    postcode: values.postcode.trim() || undefined,
    propertyType: values.propertyType || undefined,
    status: values.leaseStatus
      ? mapLeaseStatusToPropertyStatusForApi(values.leaseStatus as Property['leaseStatus'])
      : undefined,
    bedrooms: parseCount(values.bedrooms),
    bathrooms: parseCount(values.bathrooms),
    parking: parseCount(values.parking),
    furnished: values.furnished === 'yes' ? true : values.furnished === 'no' ? false : undefined,
    landlordName: primaryLandlord?.name?.trim() || undefined,
    landlordEmail: primaryLandlord?.email?.trim() || undefined,
    landlordPhone: primaryLandlord?.phone?.trim() || undefined,
    tenantName: primaryTenant?.name?.trim() || undefined,
    tenantEmail: primaryTenant?.email?.trim() || undefined,
    tenantPhone: primaryTenant?.phone?.trim() || undefined,
    latitude: values.latitude,
    longitude: values.longitude,
    leaseStartDate: leasing.agreementStart || undefined,
    leaseEndDate: leasing.agreementEnd || undefined,
    rentWeekly: weeklyRent || undefined,
    bondAmount: bondFromWeekly(weeklyRent) || undefined,
    buildingName: strata.buildingName.trim() || undefined,
    strataPlanNumber: strata.strataPlanNumber.trim() || undefined,
    buildingManagerName: strata.buildingManagerName.trim() || undefined,
    buildingManagerEmail: strata.buildingManagerEmail.trim() || undefined,
    buildingManagerPhone: strata.buildingManagerContactNumber.trim() || undefined,
    strataContactName: strata.strataName.trim() || undefined,
    strataContactEmail: strata.strataEmail.trim() || undefined,
    strataContactPhone: strata.strataContactNumber.trim() || undefined,
    landlordInsuranceExpiry: management.landlordInsuranceExpiry || undefined,
    administrationFee: parseMoney(managementSynced.administrationFee),
    documentationFee: parseMoney(managementSynced.documentationFee),
    lettingFee: parseMoney(managementSynced.lettingFee),
    managementRatePercent: parsePercent(managementSynced.managementRatePercent),
    managementRateGst:
      managementSynced.managementRateGst === 'include' ||
      managementSynced.managementRateGst === 'exclude'
        ? managementSynced.managementRateGst
        : undefined,
    managementFees: management.fees.filter((f) => f.feeType || f.amount.trim()),
    routineInspectionFrequency:
      values.leaseStatus && values.leaseStatus !== 'vacant'
        ? values.routineInspectionFrequency
        : undefined,
    registryIntakeComplete: options.complete ? true : undefined,
    registryDraft: options.complete
      ? null
      : (buildRegistryDraftPayload({
          form: values,
          step: options.step,
          furthestStepIndex: options.furthestStepIndex,
        })),
  };
}
