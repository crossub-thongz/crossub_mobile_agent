import { addDays, format, startOfDay } from 'date-fns';

import { LEASING_AGENT_DECISION } from '@/lib/leasing/constants';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import { defaultRoutineScheduledDate, suggestedOutgoingInspectionIso } from '@/lib/inspections/outgoing-schedule';
import {
  derivePreferredLeaseStart,
  isoDateAddDays,
  leaseEndFromFixedTermWeeks,
  parseLeaseTermWeeks,
  type FixedTermWeeks,
} from '@/lib/rent-review-lease-helpers';
import {
  deriveRentReviewDueDateFromInput,
  RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE,
  resolveCurrentTenancyLeaseEnd,
} from '@/lib/rent-review/scheduling';
import { leasingCycleApprovalRef } from '@/lib/workflow-case-reference';
import { resolveRentPaidTo } from '@/lib/property-overview';
import { fetchProperty } from '@/lib/crossub-api/agent-client';
import { propertyRegistryApi } from '@/lib/property-registry-api';

import type { Agency } from '@/lib/types';
import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';
import type { LeasingRecord } from '@/lib/types';
import type { LeasingCycle } from '@/lib/types';
import type { TenantSelectionCase } from '@/lib/types';
import type { VacatingCase } from '@/lib/types';

export const LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER = 2;
export const LEASING_CYCLE_BOND_RENT_MULTIPLIER = 4;
export const LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS = 7;

export function minLeasingCycleAvailableFrom(): string {
  return format(
    addDays(startOfDay(new Date()), LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS),
    'yyyy-MM-dd',
  );
}

/** Suggested lease start / available-from when relisting after a vacate or termination. */
export function deriveRelistAvailableFrom(vacateOrTerminationDate?: string): string {
  const min = minLeasingCycleAvailableFrom();
  const basis = vacateOrTerminationDate?.trim().slice(0, 10);
  if (!basis) return min;
  return basis >= min ? basis : min;
}

function isoDateAddYears(isoDate: string, years: number): string {
  const d = new Date(isoDate.slice(0, 10));
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function formatPropertyAddress(property: Property): string {
  return formatPropertyFullAddress(property);
}

function isUsableTenantLabel(name: string | null | undefined): name is string {
  const trimmed = name?.trim();
  return Boolean(trimmed && trimmed !== '—');
}

function formatWeeklyRent(weekly: number): string {
  return String(Math.round(weekly));
}

function tenantNameFromCycleView(
  cycleView: ServerLeasingCycleView | null | undefined,
): { name: string; hint?: string } | null {
  if (!cycleView) return null;
  const approved = cycleView.applications.find(
    (a) =>
      a.agentDecision === LEASING_AGENT_DECISION.APPROVED &&
      isUsableTenantLabel(a.applicantName),
  );
  if (approved?.applicantName) {
    return { name: approved.applicantName.trim(), hint: 'From approved leasing applicant' };
  }
  const applicant = cycleView.applications.find((a) => isUsableTenantLabel(a.applicantName));
  if (applicant?.applicantName) {
    return { name: applicant.applicantName.trim(), hint: 'From leasing applicant' };
  }
  const contractTenant = cycleView.onboarding?.agreement?.contractDraft?.jointTenants?.[0]?.name;
  if (isUsableTenantLabel(contractTenant)) {
    return { name: contractTenant.trim(), hint: 'From lease agreement draft' };
  }
  return null;
}

function tenantNameFromSelections(
  propertyId: string,
  tenantSelections?: TenantSelectionCase[],
): { name: string; hint?: string } | null {
  if (!tenantSelections?.length) return null;
  const forProperty = tenantSelections.filter((t) => t.propertyId === propertyId);
  const approved = forProperty.find(
    (t) =>
      isUsableTenantLabel(t.applicantName) &&
      (t.status.includes('approved') || t.status.includes('accepted')),
  );
  if (approved) {
    return { name: approved.applicantName.trim(), hint: 'From leasing application' };
  }
  const first = forProperty.find((t) => isUsableTenantLabel(t.applicantName));
  if (first) {
    return { name: first.applicantName.trim(), hint: 'From leasing application' };
  }
  return null;
}

export interface PropertyTenantContact {
  name: string;
  email: string;
  phone: string;
  hint?: string;
}

export function resolvePropertyTenantContact(input: {
  property: Property;
  currentLease?: LeasingRecord;
  cycleView?: ServerLeasingCycleView | null;
  tenantSelections?: TenantSelectionCase[];
  recordTenant?: { name?: string; email?: string; phone?: string };
}): PropertyTenantContact {
  const nameBlock = resolveRentReviewTenantName({
    property: input.property,
    currentLease: input.currentLease,
    cycleView: input.cycleView,
    tenantSelections: input.tenantSelections,
  });
  const draft = input.cycleView?.onboarding?.agreement?.contractDraft;
  const joint = draft?.jointTenants?.[0];
  return {
    name: nameBlock.name,
    email:
      joint?.email?.trim() ||
      input.recordTenant?.email?.trim() ||
      input.property.tenantContact?.email?.trim() ||
      '',
    phone:
      joint?.phone?.trim() ||
      input.recordTenant?.phone?.trim() ||
      input.property.tenantContact?.phone?.trim() ||
      '',
    hint: nameBlock.hint,
  };
}

function resolveRentReviewTenantName(input: {
  property: Property;
  currentLease?: LeasingRecord;
  cycleView?: ServerLeasingCycleView | null;
  tenantSelections?: TenantSelectionCase[];
}): { name: string; hint?: string } {
  if (isUsableTenantLabel(input.currentLease?.approvedTenant)) {
    return { name: input.currentLease.approvedTenant.trim(), hint: 'From active tenancy' };
  }
  const cycleTenant = tenantNameFromCycleView(input.cycleView);
  if (cycleTenant) return cycleTenant;
  const selectionTenant = tenantNameFromSelections(input.property.id, input.tenantSelections);
  if (selectionTenant) return selectionTenant;
  if (isUsableTenantLabel(input.property.tenantName)) {
    return { name: input.property.tenantName.trim(), hint: 'From property record' };
  }
  return { name: '' };
}

function resolveWeeklyRent(input: {
  property: Property;
  currentLease?: LeasingRecord;
  cycleView?: ServerLeasingCycleView | null;
  leasingCycle?: LeasingCycle;
}): number {
  if (input.currentLease?.rentWeekly && input.currentLease.rentWeekly > 0) {
    return input.currentLease.rentWeekly;
  }
  const draftRent = input.cycleView?.onboarding?.agreement?.contractDraft?.weeklyRent;
  if (draftRent != null && draftRent > 0) return draftRent;
  if (input.cycleView?.rental.rentPerWeek != null && input.cycleView.rental.rentPerWeek > 0) {
    return input.cycleView.rental.rentPerWeek;
  }
  if (input.leasingCycle?.rentPerWeek != null && input.leasingCycle.rentPerWeek > 0) {
    return input.leasingCycle.rentPerWeek;
  }
  if (input.property.rentWeekly > 0) return input.property.rentWeekly;
  return 0;
}

function resolveBondHeld(input: {
  property: Property;
  currentLease?: LeasingRecord;
  cycleView?: ServerLeasingCycleView | null;
  leasingCycle?: LeasingCycle;
}): { amount: number; hint?: string } {
  if (input.currentLease?.bondAmount != null && input.currentLease.bondAmount > 0) {
    return { amount: Math.round(input.currentLease.bondAmount), hint: 'From active tenancy' };
  }
  if (input.cycleView?.rental.bond != null && input.cycleView.rental.bond > 0) {
    return { amount: Math.round(input.cycleView.rental.bond), hint: 'From leasing cycle' };
  }
  const draftBond = input.cycleView?.onboarding?.agreement?.contractDraft?.bond;
  if (draftBond != null && draftBond > 0) {
    return { amount: Math.round(draftBond), hint: 'From lease agreement draft' };
  }
  if (input.property.bondAmount != null && input.property.bondAmount > 0) {
    return { amount: Math.round(input.property.bondAmount), hint: 'From property record' };
  }
  const rent = resolveWeeklyRent(input);
  if (rent > 0) {
    return {
      amount: Math.round(rent * LEASING_CYCLE_BOND_RENT_MULTIPLIER),
      hint: 'Estimated from weekly rent (4 weeks)',
    };
  }
  return { amount: 0 };
}

export interface AgentContactPrefill {
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agentCompany: string;
  managingAgentLabel: string;
}

/** Agent + agency contact — auto-filled from the signed-in agent's assigned agency. */
export function buildAgentContactPrefill(
  agency: Agency | null | undefined,
  userName?: string,
): AgentContactPrefill {
  const agentName = agency?.contactName?.trim() || userName?.trim() || '';
  const agentCompany = agency?.company?.trim() || agency?.name?.trim() || '';
  return {
    agentName,
    agentEmail: agency?.contactEmail?.trim() ?? '',
    agentPhone: agency?.contactPhone?.trim() ?? '',
    agentCompany,
    managingAgentLabel: agentCompany || agentName,
  };
}

export interface LeasingCyclePrefill {
  rentPerWeek: string;
  availableFrom: string;
  deposit: string;
  bond: string;
  keyCustody: 'crossub' | 'agent';
}

export function buildLeasingCyclePrefill(
  property: Property,
  currentLease?: LeasingRecord,
): LeasingCyclePrefill {
  const rent =
    currentLease?.rentWeekly && currentLease.rentWeekly > 0
      ? currentLease.rentWeekly
      : property.rentWeekly > 0
        ? property.rentWeekly
        : 0;
  const rentStr = rent > 0 ? String(Math.round(rent)) : '';
  const rentNum = rent > 0 ? rent : 0;
  const minAvailable = minLeasingCycleAvailableFrom();
  return {
    rentPerWeek: rentStr,
    availableFrom: minAvailable,
    deposit: rentNum > 0 ? String(Math.round(rentNum * LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER)) : '',
    bond: rentNum > 0 ? String(Math.round(rentNum * LEASING_CYCLE_BOND_RENT_MULTIPLIER)) : '',
    keyCustody: 'crossub',
  };
}

export function recalcLeasingDepositBond(rentPerWeek: string): {
  deposit: string;
  bond: string;
} {
  const rent = Number(rentPerWeek);
  if (!Number.isFinite(rent) || rent <= 0) return { deposit: '', bond: '' };
  return {
    deposit: String(Math.round(rent * LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER)),
    bond: String(Math.round(rent * LEASING_CYCLE_BOND_RENT_MULTIPLIER)),
  };
}

export interface RentReviewPrefill {
  propertyAddress: string;
  tenantName: string;
  tenantNameHint?: string;
  leaseType: 'fixed' | 'periodic';
  fixedTermWeeks: FixedTermWeeks;
  initialLeaseStartDate: string;
  preferredLeaseStartHint?: string;
  /** Anchor date used to recalculate preferred start when fixed term weeks change. */
  leaseTermAnchor?: string;
  currentWeeklyRent: string;
  managingAgentLabel: string;
  rentReviewDate: string;
  /** Latest rent paid-to date from the property ledger (YYYY-MM-DD). */
  rentPaidUntil?: string;
}

export function buildRentReviewPrefill(
  property: Property,
  agency: Agency | null | undefined,
  currentLease?: LeasingRecord,
  options?: {
    cycleView?: ServerLeasingCycleView | null;
    tenantSelections?: TenantSelectionCase[];
    leasingCycle?: LeasingCycle;
  },
): RentReviewPrefill {
  const contact = buildAgentContactPrefill(agency);
  const tenant = resolveRentReviewTenantName({
    property,
    currentLease,
    cycleView: options?.cycleView,
    tenantSelections: options?.tenantSelections,
  });

  const weekly = resolveWeeklyRent({
    property,
    currentLease,
    cycleView: options?.cycleView,
    leasingCycle: options?.leasingCycle,
  });

  const draft = options?.cycleView?.onboarding?.agreement?.contractDraft;
  const fixedTermWeeks: FixedTermWeeks =
    parseLeaseTermWeeks(draft?.leaseTerm) ??
    parseLeaseTermWeeks(
      options?.tenantSelections?.find((t) => t.propertyId === property.id)?.leaseTerm,
    ) ??
    52;

  const termAnchor =
    currentLease?.leaseStart?.slice(0, 10) ??
    draft?.startDate?.slice(0, 10) ??
    options?.cycleView?.rental.moveInDate?.slice(0, 10) ??
    options?.cycleView?.rental.availableFrom?.slice(0, 10) ??
    options?.leasingCycle?.availableFrom?.slice(0, 10) ??
    null;

  const preferred = derivePreferredLeaseStart({
    leaseEnd: currentLease?.leaseEnd ?? property.leaseEnd,
    agreementEnd: draft?.endDate,
    termAnchor,
    fixedTermWeeks,
  });

  const currentTenancyLeaseEnd = resolveCurrentTenancyLeaseEnd({
    leaseEnd: currentLease?.leaseEnd ?? property.leaseEnd,
    agreementEnd: draft?.endDate,
    termAnchor,
    termWeeks: fixedTermWeeks,
  });

  return {
    propertyAddress: formatPropertyAddress(property),
    tenantName: tenant.name,
    tenantNameHint: tenant.hint,
    leaseType: 'fixed',
    fixedTermWeeks,
    initialLeaseStartDate: preferred.date,
    preferredLeaseStartHint: preferred.hint,
    leaseTermAnchor: preferred.leaseTermAnchor ?? termAnchor ?? undefined,
    currentWeeklyRent: weekly > 0 ? formatWeeklyRent(weekly) : '',
    managingAgentLabel: contact.managingAgentLabel,
    rentReviewDate:
      deriveRentReviewDueDateFromInput({
        leaseEnd: currentLease?.leaseEnd ?? property.leaseEnd,
        agreementEnd: draft?.endDate,
        termAnchor,
        termWeeks: fixedTermWeeks,
        lastRentIncreaseAt: property.lastRentIncrease,
        reviewDue: property.nextRentReview,
      }) ??
      isoDateAddDays(preferred.date, -RENT_REVIEW_DUE_DAYS_BEFORE_NEW_LEASE),
  };
}

/** Load last rent increase date from portal / registry for subsequent review scheduling. */
export async function fetchPropertyLastRentIncrease(
  propertyId: string,
): Promise<string | undefined> {
  try {
    const portal = await propertyRegistryApi.getPortal(propertyId);
    const fromPortal = portal?.overview?.lastRentIncreaseDate?.slice(0, 10);
    if (fromPortal) return fromPortal;
  } catch {
    /* portal optional */
  }

  try {
    const record = await propertyRegistryApi.get(propertyId);
    if (record.lastRentIncreaseAt) return record.lastRentIncreaseAt.slice(0, 10);
  } catch {
    /* staff property row optional */
  }

  return undefined;
}

/** Load rent paid-to from the same sources as the property Overview tab. */
export async function fetchPropertyRentPaidUntil(propertyId: string): Promise<string | undefined> {
  try {
    const portal = await propertyRegistryApi.getPortal(propertyId);
    const fromPortal = resolveRentPaidTo(
      portal?.overview?.rentPaidUntilDate,
      portal?.accounting,
    );
    if (fromPortal) return fromPortal;
  } catch {
    /* portal optional */
  }

  try {
    const record = await propertyRegistryApi.get(propertyId);
    if (record.rentPaidUntil) return record.rentPaidUntil.slice(0, 10);
  } catch {
    /* staff property row optional */
  }

  try {
    const agentProperty = await fetchProperty(propertyId);
    const raw = (agentProperty as { rentPaidUntil?: string | null }).rentPaidUntil;
    if (raw) return raw.slice(0, 10);
  } catch {
    /* agent property row optional */
  }

  return undefined;
}

/** Load leasing cycle detail for richer rent review prefill. */
export async function fetchRentReviewPrefill(
  property: Property,
  agency: Agency | null | undefined,
  currentLease?: LeasingRecord,
  options?: {
    leasingCycle?: LeasingCycle;
    tenantSelections?: TenantSelectionCase[];
  },
): Promise<RentReviewPrefill> {
  const [cycleView, rentPaidUntil, lastRentIncrease] = await Promise.all([
    options?.leasingCycle?.id
      ? leasingOpsApi.get(options.leasingCycle.id).catch(() => null)
      : Promise.resolve(null),
    fetchPropertyRentPaidUntil(property.id),
    fetchPropertyLastRentIncrease(property.id),
  ]);

  const prefill = buildRentReviewPrefill(
    { ...property, lastRentIncrease: property.lastRentIncrease ?? lastRentIncrease },
    agency,
    currentLease,
    {
      cycleView,
      tenantSelections: options?.tenantSelections,
      leasingCycle: options?.leasingCycle,
    },
  );

  return {
    ...prefill,
    rentPaidUntil,
  };
}

export function recalcRentReviewLeaseStart(
  prefill: Pick<RentReviewPrefill, 'leaseTermAnchor' | 'initialLeaseStartDate'>,
  fixedTermWeeks: FixedTermWeeks,
): { initialLeaseStartDate: string; hint: string } {
  if (prefill.leaseTermAnchor) {
    const leaseEnd = leaseEndFromFixedTermWeeks(prefill.leaseTermAnchor, fixedTermWeeks);
    return {
      initialLeaseStartDate: isoDateAddDays(leaseEnd, 1),
      hint: `Day after ${fixedTermWeeks}-week term ending`,
    };
  }
  return {
    initialLeaseStartDate: prefill.initialLeaseStartDate,
    hint: 'Preferred lease start date',
  };
}

export interface TerminationPrefill {
  bondHeld: string;
  bondHeldHint?: string;
}

export function buildTerminationPrefill(
  property: Property,
  currentLease?: LeasingRecord,
  options?: {
    cycleView?: ServerLeasingCycleView | null;
    leasingCycle?: LeasingCycle;
  },
): TerminationPrefill {
  const bond = resolveBondHeld({
    property,
    currentLease,
    cycleView: options?.cycleView,
    leasingCycle: options?.leasingCycle,
  });
  return {
    bondHeld: bond.amount > 0 ? String(bond.amount) : '',
    bondHeldHint: bond.hint,
  };
}

export async function fetchTerminationPrefill(
  property: Property,
  currentLease?: LeasingRecord,
  options?: {
    leasingCycle?: LeasingCycle;
  },
): Promise<TerminationPrefill> {
  let cycleView: ServerLeasingCycleView | null = null;
  if (options?.leasingCycle?.id) {
    try {
      cycleView = await leasingOpsApi.get(options.leasingCycle.id);
    } catch {
      /* fall through */
    }
  }
  return buildTerminationPrefill(property, currentLease, {
    cycleView,
    leasingCycle: options?.leasingCycle,
  });
}

export interface MaintenancePrefill {
  address: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
}

export function buildMaintenancePrefill(
  property: Property,
  options?: {
    currentLease?: LeasingRecord;
    cycleView?: ServerLeasingCycleView | null;
    tenantSelections?: TenantSelectionCase[];
    recordTenant?: { name?: string; email?: string; phone?: string };
  },
): MaintenancePrefill {
  const tenant = resolvePropertyTenantContact({
    property,
    currentLease: options?.currentLease,
    cycleView: options?.cycleView,
    tenantSelections: options?.tenantSelections,
    recordTenant: options?.recordTenant,
  });
  return {
    address: formatPropertyAddress(property),
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    tenantPhone: tenant.phone,
  };
}

export async function fetchMaintenancePrefill(
  property: Property,
  currentLease?: LeasingRecord,
  options?: {
    leasingCycle?: LeasingCycle;
    tenantSelections?: TenantSelectionCase[];
    recordTenant?: { name?: string; email?: string; phone?: string };
  },
): Promise<MaintenancePrefill> {
  const instant = buildMaintenancePrefill(property, {
    currentLease,
    tenantSelections: options?.tenantSelections,
    recordTenant: options?.recordTenant,
  });
  if (!options?.leasingCycle?.id) return instant;

  try {
    const cycleView = await leasingOpsApi.get(options.leasingCycle.id);
    return buildMaintenancePrefill(property, {
      currentLease,
      cycleView,
      tenantSelections: options?.tenantSelections,
      recordTenant: options?.recordTenant,
    });
  } catch {
    return instant;
  }
}

export interface IngoingInspectionPrefill {
  address: string;
  propertyType: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  moveInDate: string;
  scheduledTime: string;
  accessInstructions: string;
  leaseApprovalRef: string;
  priority: 'normal' | 'high' | 'urgent';
  notes: string;
}

export interface RoutineInspectionPrefill {
  tenantName: string;
  tenantEmail: string;
  scheduledDate: string;
  frequency: 2 | 3;
  flow: 'self' | 'in_person';
  inspectorName: string;
}

export interface OutgoingInspectionPrefill {
  inspector: string;
  scheduledAt: string;
  vacatingCaseId: string;
}

export function suggestIngoingScheduledTime(moveInDate: string): string {
  const moveIn = new Date(`${moveInDate.slice(0, 10)}T10:00:00`);
  if (Number.isNaN(moveIn.getTime())) return '';
  const scheduled = addDays(moveIn, -7);
  scheduled.setHours(10, 0, 0, 0);
  if (scheduled.getTime() < Date.now()) {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString();
  }
  return scheduled.toISOString();
}

export function buildIngoingInspectionPrefill(
  property: Property,
  currentLease?: LeasingRecord,
  leasingCycle?: { id?: string; availableFrom?: string; tenancyAgreementId?: string | null },
  options?: {
    cycleView?: ServerLeasingCycleView | null;
    tenantSelections?: TenantSelectionCase[];
    recordTenant?: { name?: string; email?: string; phone?: string };
  },
): IngoingInspectionPrefill {
  const moveInDate =
    currentLease?.moveInDate?.slice(0, 10) ??
    options?.cycleView?.onboarding?.agreement?.contractDraft?.startDate?.slice(0, 10) ??
    options?.cycleView?.rental?.moveInDate?.slice(0, 10) ??
    leasingCycle?.availableFrom?.slice(0, 10) ??
    format(addDays(new Date(), 14), 'yyyy-MM-dd');
  const tenant = resolvePropertyTenantContact({
    property,
    currentLease,
    cycleView: options?.cycleView,
    tenantSelections: options?.tenantSelections,
    recordTenant: options?.recordTenant,
  });
  return {
    address: formatPropertyAddress(property),
    propertyType: property.propertyType ?? 'House',
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    tenantPhone: tenant.phone,
    moveInDate,
    scheduledTime: suggestIngoingScheduledTime(moveInDate),
    accessInstructions: '',
    leaseApprovalRef: leasingCycleApprovalRef(
      options?.cycleView?.id ?? leasingCycle?.id,
      options?.cycleView?.onboarding?.agreement?.contractDraft?.paymentReference ??
        leasingCycle?.tenancyAgreementId,
    ),
    priority: 'normal',
    notes: '',
  };
}

/** Portfolio + live leasing cycle — same depth as property workflow dialogs. */
export async function fetchIngoingInspectionPrefill(
  property: Property,
  currentLease?: LeasingRecord,
  leasingCycle?: LeasingCycle,
  tenantSelections?: TenantSelectionCase[],
): Promise<IngoingInspectionPrefill> {
  const instant = buildIngoingInspectionPrefill(property, currentLease, leasingCycle, {
    tenantSelections,
  });
  if (!leasingCycle?.id) return instant;

  try {
    const cycleView = await leasingOpsApi.get(leasingCycle.id);
    return buildIngoingInspectionPrefill(property, currentLease, leasingCycle, {
      cycleView,
      tenantSelections,
    });
  } catch {
    return instant;
  }
}

export function buildRoutineInspectionPrefill(
  property: Property,
  options?: {
    currentLease?: LeasingRecord;
    cycleView?: ServerLeasingCycleView | null;
    tenantSelections?: TenantSelectionCase[];
  },
): RoutineInspectionPrefill {
  const tenant = resolvePropertyTenantContact({
    property,
    currentLease: options?.currentLease,
    cycleView: options?.cycleView,
    tenantSelections: options?.tenantSelections,
  });
  return {
    tenantName: tenant.name,
    tenantEmail: tenant.email,
    scheduledDate: defaultRoutineScheduledDate(),
    frequency: 2,
    flow: 'self',
    inspectorName: '',
  };
}

export function buildOutgoingInspectionPrefill(
  vacatingCase: VacatingCase,
): OutgoingInspectionPrefill {
  return {
    inspector: 'Pending assignment',
    scheduledAt: suggestedOutgoingInspectionIso(vacatingCase),
    vacatingCaseId: vacatingCase.id,
  };
}
