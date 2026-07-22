import { resolveRentPaidTo } from '@/lib/property-overview';
import type {
  PropertyPortalAccounting,
  PropertyPortalFinancial,
} from '@/lib/property-registry-api';
import type { Property, PropertyAccounting } from '@/lib/types';

export interface RentReconciliationProperty {
  id: string;
  referenceCode: string;
  address: string;
  suburb: string;
  ownerName: string;
  tenantName: string;
  agentName: string;
  currentRent: number;
  rentCycleLabel: string;
  paidToDate: string;
  rentArrearsAmount: number;
  bondHeld: number;
}

export function propertyReferenceCode(propertyId: string): string {
  const compact = propertyId.replace(/-/g, '').toUpperCase();
  return `PROP-${compact.slice(0, 8)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildRentReconciliationProperty(input: {
  property: Property;
  agentName?: string | null;
  accounting?: PropertyPortalAccounting | null;
  financial?: PropertyPortalFinancial | null;
  fallbackAccounting?: PropertyAccounting | null;
  rentPaidUntil?: string | null;
}): RentReconciliationProperty {
  const { property, accounting, financial, fallbackAccounting } = input;
  const paidTo =
    resolveRentPaidTo(input.rentPaidUntil ?? property.rentPaidUntil, accounting) ?? todayIso();
  const rentWeekly =
    financial?.currentRentWeekly ?? property.rentWeekly ?? fallbackAccounting?.rentOutstanding ?? 0;
  const rentArrearsAmount =
    accounting?.outstandingRentAmount ??
    financial?.outstandingRent ??
    fallbackAccounting?.arrearsAmount ??
    fallbackAccounting?.rentOutstanding ??
    0;

  return {
    id: property.id,
    referenceCode: propertyReferenceCode(property.id),
    address: property.address,
    suburb: property.suburb,
    ownerName: property.homeOwnerName || '—',
    tenantName: property.tenantName || fallbackAccounting?.tenantName || '—',
    agentName: input.agentName?.trim() || property.propertyManager || 'Agent',
    currentRent: rentWeekly,
    rentCycleLabel: rentWeekly > 0 ? 'Weekly' : '—',
    paidToDate: paidTo,
    rentArrearsAmount: Math.max(0, rentArrearsAmount),
    bondHeld: financial?.bondAmount ?? property.bondAmount ?? 0,
  };
}
