import type {
  PropertyPortalAccounting,
  PropertyPortalFinancial,
} from '@/lib/property-registry-api';
import type { PropertyAccounting } from '@/lib/types';

export interface PropertyAccountingSummary {
  id: string;
  label: string;
  status: string;
  currentStep: string;
  detail?: string;
}

export function buildPropertyAccountingSummary(input: {
  propertyId: string;
  accounting?: PropertyPortalAccounting | null;
  financial?: PropertyPortalFinancial | null;
  fallback?: PropertyAccounting | null;
}): PropertyAccountingSummary {
  const accounting = input.accounting;
  const outstandingDays =
    accounting?.outstandingRentDays ?? input.fallback?.daysInArrears ?? 0;
  const outstandingAmount =
    accounting?.outstandingRentAmount ??
    input.financial?.outstandingRent ??
    input.fallback?.rentOutstanding ??
    input.fallback?.arrearsAmount ??
    0;

  if (outstandingDays > 0) {
    return {
      id: `accounting-${input.propertyId}`,
      label: 'Rent arrears',
      status: 'Active',
      currentStep: 'Arrears follow-up',
      detail: `${outstandingDays} days outstanding`,
    };
  }

  const latestReminder = accounting?.debtCollection[0];
  if (latestReminder) {
    return {
      id: `accounting-${input.propertyId}`,
      label: 'Rent collection',
      status: 'In progress',
      currentStep: latestReminder.channel.replaceAll('_', ' '),
      detail: latestReminder.summary,
    };
  }

  return {
    id: `accounting-${input.propertyId}`,
    label: 'Rent ledger',
    status: 'Current',
    currentStep:
      (accounting?.ledger.length ?? 0) > 0 ? 'Ledger monitoring' : 'No ledger activity',
    detail: 'No outstanding arrears on file',
  };
}

export function hasPropertyAccountingData(input: {
  accounting?: PropertyPortalAccounting | null;
  fallback?: PropertyAccounting | null;
}): boolean {
  const accounting = input.accounting;
  if (!accounting && !input.fallback) return false;
  return Boolean(
    (accounting?.ledger.length ?? 0) > 0 ||
      (accounting?.statements.length ?? 0) > 0 ||
      (accounting?.debtCollection.length ?? 0) > 0 ||
      accounting?.outstandingRentDays != null ||
      input.fallback,
  );
}
