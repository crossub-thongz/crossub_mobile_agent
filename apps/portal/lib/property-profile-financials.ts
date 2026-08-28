import type {
  PropertyPortalAccounting,
  PropertyPortalFinancial,
  PropertyPortalLedgerEntry,
  PropertyPortalOverview,
  PropertyPortalStatement,
  PropertyRecord,
} from '@/lib/property-registry-api';
import { resolveRentPaidTo } from '@/lib/property-overview';
import type { Property, PropertyAccounting, RentIncomeEntry } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export type PropertyFinancialSnapshot = {
  rentPaidUpToLabel: string;
  rentStatusLabel: string;
  rentStatusTone: 'good' | 'warn' | 'muted';
  arrearsAmountLabel: string;
  arrearsDaysLabel: string;
  nextDisbursementDateLabel: string;
  nextDisbursementEstimateLabel?: string;
  managementFeeLabel: string;
  managementFeeSubLabel: string;
};

export type PropertyRentLedgerRow = {
  id: string;
  dueDate: string;
  dueSort: number;
  description: string;
  amount: number;
  status: 'paid' | 'outstanding' | 'overdue';
  statusLabel: string;
  paidDate?: string;
};

function parseMonthLabel(month: string): Date | null {
  const trimmed = month.trim();
  if (!trimmed) return null;
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);
  const parsed = new Date(`${trimmed} 1`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return null;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function resolveNextDisbursement(statements: PropertyPortalStatement[]): {
  dateLabel: string;
  estimateLabel?: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ranked = statements
    .map((statement) => {
      const monthDate = parseMonthLabel(statement.month);
      if (!monthDate) return null;
      const payoutDate = endOfMonth(monthDate);
      return {
        payoutDate,
        amount: statement.amount,
      };
    })
    .filter((row): row is { payoutDate: Date; amount: number } => row != null)
    .sort((a, b) => a.payoutDate.getTime() - b.payoutDate.getTime());

  const upcoming =
    ranked.find((row) => row.payoutDate.getTime() >= today.getTime()) ??
    ranked[ranked.length - 1];

  if (!upcoming) {
    return { dateLabel: '—' };
  }

  return {
    dateLabel: formatDate(upcoming.payoutDate.toISOString()),
    estimateLabel:
      upcoming.amount > 0 ? `Est. ${formatCurrency(upcoming.amount)}` : undefined,
  };
}

function managementFeeSubLabel(gst?: string | null): string {
  if (gst === 'include') return 'Incl. GST';
  if (gst === 'exclude') return 'Excl. GST';
  return '—';
}

function ledgerStatus(entry: {
  status?: PropertyRentLedgerRow['status'] | RentIncomeEntry['status'];
  paidDate?: string;
  dueDate: string;
}): PropertyRentLedgerRow['status'] {
  if (
    entry.status === 'paid' ||
    entry.status === 'outstanding' ||
    entry.status === 'overdue'
  ) {
    return entry.status;
  }
  if (entry.paidDate) return 'paid';
  const due = Date.parse(entry.dueDate);
  if (Number.isNaN(due)) return 'outstanding';
  return due < Date.now() ? 'overdue' : 'outstanding';
}

function statusLabel(status: PropertyRentLedgerRow['status']): string {
  if (status === 'paid') return 'Paid';
  if (status === 'overdue') return 'Overdue';
  return 'Outstanding';
}

function dueSortValue(dueDate: string): number {
  const parsed = Date.parse(dueDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapLedgerEntry(
  entry: PropertyPortalLedgerEntry | RentIncomeEntry,
): PropertyRentLedgerRow {
  const status = ledgerStatus({
    status: 'status' in entry ? entry.status : undefined,
    dueDate: entry.dueDate,
    paidDate: entry.paidDate,
  });
  return {
    id: entry.id,
    dueDate: formatDate(entry.dueDate),
    dueSort: dueSortValue(entry.dueDate),
    description: entry.description?.trim() || 'Rent',
    amount: entry.amount,
    status,
    statusLabel: statusLabel(status),
    paidDate: entry.paidDate ? formatDate(entry.paidDate) : undefined,
  };
}

export function buildPropertyFinancialSnapshot(input: {
  property: Property;
  record?: PropertyRecord | null;
  overview?: PropertyPortalOverview | null;
  portalAccounting?: PropertyPortalAccounting | null;
  portalFinancial?: PropertyPortalFinancial | null;
  fallbackAccounting?: PropertyAccounting | null;
}): PropertyFinancialSnapshot {
  const {
    property,
    record,
    overview,
    portalAccounting,
    portalFinancial,
    fallbackAccounting,
  } = input;

  const rentPaidTo = resolveRentPaidTo(
    record?.rentPaidUntil ?? overview?.rentPaidUntilDate ?? property.rentPaidUntil,
    portalAccounting ?? undefined,
  );

  const outstandingDays =
    portalAccounting?.outstandingRentDays ?? fallbackAccounting?.daysInArrears ?? 0;
  const outstandingAmount =
    portalAccounting?.outstandingRentAmount ??
    portalFinancial?.outstandingRent ??
    fallbackAccounting?.rentOutstanding ??
    fallbackAccounting?.arrearsAmount ??
    0;

  const rentStatusTone: PropertyFinancialSnapshot['rentStatusTone'] =
    outstandingDays > 0 ? 'warn' : rentPaidTo ? 'good' : 'muted';
  const rentStatusLabel =
    outstandingDays > 0
      ? `${outstandingDays} day${outstandingDays === 1 ? '' : 's'} overdue`
      : rentPaidTo
        ? 'On track'
        : '—';

  const statements =
    portalAccounting?.statements ??
    fallbackAccounting?.statements?.map((statement) => ({
      id: statement.id,
      month: statement.period,
      amount: statement.amount,
    })) ??
    [];

  const disbursement = resolveNextDisbursement(statements);
  const managementRate =
    overview?.managementRatePercent ??
    record?.managementRatePercent ??
    property.managementRatePercent;
  const managementGst =
    overview?.managementRateGst ??
    (record?.managementRateGst === 'include' || record?.managementRateGst === 'exclude'
      ? record.managementRateGst
      : property.managementRateGst);

  return {
    rentPaidUpToLabel: rentPaidTo ? formatDate(rentPaidTo) : '—',
    rentStatusLabel,
    rentStatusTone,
    arrearsAmountLabel: formatCurrency(outstandingAmount),
    arrearsDaysLabel: `${outstandingDays} day${outstandingDays === 1 ? '' : 's'}`,
    nextDisbursementDateLabel: disbursement.dateLabel,
    nextDisbursementEstimateLabel: disbursement.estimateLabel,
    managementFeeLabel:
      managementRate != null && managementRate > 0 ? `${managementRate}%` : '—',
    managementFeeSubLabel: managementFeeSubLabel(managementGst),
  };
}

export function buildPropertyRentLedgerRows(input: {
  portalAccounting?: PropertyPortalAccounting | null;
  fallbackAccounting?: PropertyAccounting | null;
}): PropertyRentLedgerRow[] {
  const ledger =
    input.portalAccounting?.ledger ??
    input.fallbackAccounting?.rentIncomeHistory?.map((entry) => ({
      id: entry.id,
      dueDate: entry.dueDate,
      paidDate: entry.paidDate,
      amount: entry.amount,
      description: entry.description,
    })) ??
    [];

  return ledger
    .map((entry) => mapLedgerEntry(entry))
    .sort((a, b) => b.dueSort - a.dueSort);
}
