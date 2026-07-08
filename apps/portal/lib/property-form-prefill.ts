import { addDays, format } from 'date-fns';

import type { Agency } from '@/lib/types';
import type { Property } from '@/lib/types';
import type { LeasingRecord } from '@/lib/types';

export const LEASING_CYCLE_DEPOSIT_RENT_MULTIPLIER = 2;
export const LEASING_CYCLE_BOND_RENT_MULTIPLIER = 4;
export const LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS = 7;

function isoDateAddYears(isoDate: string, years: number): string {
  const d = new Date(isoDate.slice(0, 10));
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function isoDateAddDays(isoDate: string, days: number): string {
  const d = new Date(isoDate.slice(0, 10));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatPropertyAddress(property: Property): string {
  const parts = [property.address, property.suburb, property.state, property.postcode].filter(
    Boolean,
  );
  return parts.join(', ');
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
  const minAvailable = format(
    addDays(new Date(), LEASING_CYCLE_AVAILABLE_FROM_MIN_DAYS),
    'yyyy-MM-dd',
  );
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
  tenantId: string;
  leaseType: 'fixed' | 'periodic';
  fixedTermWeeks: 26 | 52;
  initialLeaseStartDate: string;
  currentWeeklyRent: string;
  managingAgentLabel: string;
  rentReviewDate: string;
}

export function buildRentReviewPrefill(
  property: Property,
  agency: Agency | null | undefined,
  currentLease?: LeasingRecord,
): RentReviewPrefill {
  const contact = buildAgentContactPrefill(agency);
  const tenantName =
    property.tenantName?.trim() ||
    currentLease?.approvedTenant?.trim() ||
    '';
  const weekly =
    currentLease?.rentWeekly && currentLease.rentWeekly > 0
      ? currentLease.rentWeekly
      : property.rentWeekly > 0
        ? property.rentWeekly
        : 0;
  const initialLeaseStartDate = isoDateAddDays(
    new Date().toISOString().slice(0, 10),
    60,
  );
  return {
    propertyAddress: formatPropertyAddress(property),
    tenantName,
    tenantId: `t-${property.id.slice(0, 8)}`,
    leaseType: 'fixed',
    fixedTermWeeks: 52,
    initialLeaseStartDate,
    currentWeeklyRent: weekly > 0 ? String(Math.round(weekly)) : '',
    managingAgentLabel: contact.managingAgentLabel,
    rentReviewDate: isoDateAddYears(initialLeaseStartDate, 1),
  };
}

export interface TerminationPrefill {
  bondHeld: string;
}

export function buildTerminationPrefill(
  property: Property,
  currentLease?: LeasingRecord,
): TerminationPrefill {
  const bond =
    property.bondAmount ??
    currentLease?.bondAmount ??
    0;
  return {
    bondHeld: bond > 0 ? String(Math.round(bond)) : '',
  };
}

export interface MaintenancePrefill {
  address: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
}

export function buildMaintenancePrefill(property: Property): MaintenancePrefill {
  return {
    address: formatPropertyAddress(property),
    tenantName: property.tenantName?.trim() ?? '',
    tenantEmail: property.tenantContact?.email?.trim() ?? '',
    tenantPhone: property.tenantContact?.phone?.trim() ?? '',
  };
}

export interface IngoingInspectionPrefill {
  address: string;
  propertyType: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  moveInDate: string;
  scheduledTime: string;
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
  leasingCycle?: { availableFrom?: string },
): IngoingInspectionPrefill {
  const moveInDate =
    currentLease?.moveInDate?.slice(0, 10) ??
    leasingCycle?.availableFrom?.slice(0, 10) ??
    format(addDays(new Date(), 14), 'yyyy-MM-dd');
  return {
    address: formatPropertyAddress(property),
    propertyType: property.propertyType ?? 'House',
    tenantName: property.tenantName?.trim() || currentLease?.approvedTenant?.trim() || '',
    tenantEmail: property.tenantContact?.email?.trim() ?? '',
    tenantPhone: property.tenantContact?.phone?.trim() ?? '',
    moveInDate,
    scheduledTime: suggestIngoingScheduledTime(moveInDate),
  };
}
