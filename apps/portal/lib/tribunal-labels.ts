import { TRIBUNAL_CASE_STATUS } from '@/constants/api-enums';

const TRIBUNAL_TYPE_LABEL: Record<string, string> = {
  RENTAL_ARREARS: 'Rental Arrears',
  BOND_CLAIM: 'Bond Claim',
  PROPERTY_DAMAGE: 'Property Damage',
  LEASE_TERMINATION: 'Lease Termination',
  LEASE_BREACH: 'Lease Breach',
  MAINTENANCE_DISPUTE: 'Maintenance Dispute',
};

const TRIBUNAL_STATUS_LABEL: Record<string, string> = {
  [TRIBUNAL_CASE_STATUS.DRAFT]: 'Draft',
  [TRIBUNAL_CASE_STATUS.SUBMITTED]: 'Submitted',
  [TRIBUNAL_CASE_STATUS.AWAITING_HEARING]: 'Awaiting Hearing',
  [TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED]: 'Hearing Scheduled',
  [TRIBUNAL_CASE_STATUS.COMPLETED]: 'Completed',
  [TRIBUNAL_CASE_STATUS.CLOSED]: 'Closed',
};

export function tribunalTypeLabel(type?: string | null): string {
  if (!type?.trim()) return '—';
  return TRIBUNAL_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

export function tribunalStatusLabel(status?: string | null): string {
  if (!status?.trim()) return '—';
  return TRIBUNAL_STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
}

export function tribunalStatusBadgeVariant(
  status?: string | null,
): 'default' | 'approval' | 'success' {
  switch (status) {
    case TRIBUNAL_CASE_STATUS.COMPLETED:
      return 'success';
    case TRIBUNAL_CASE_STATUS.SUBMITTED:
    case TRIBUNAL_CASE_STATUS.AWAITING_HEARING:
    case TRIBUNAL_CASE_STATUS.HEARING_SCHEDULED:
      return 'approval';
    default:
      return 'default';
  }
}

export function tribunalCaseHasArrears(caseRow: {
  rentArrearsAmount?: number | null;
  billArrearsAmount?: number | null;
  bondArrearsAmount?: number | null;
  tribunalType?: string;
}): boolean {
  return (
    caseRow.rentArrearsAmount != null ||
    caseRow.billArrearsAmount != null ||
    caseRow.bondArrearsAmount != null ||
    caseRow.tribunalType === 'RENTAL_ARREARS'
  );
}

/** Best overdue-day count for list/table badges (rent → bill → bond). */
export function tribunalPrimaryDaysOverdue(caseRow: {
  rentArrearsDaysOverdue?: number | null;
  billArrearsDaysOverdue?: number | null;
  bondArrearsDaysOverdue?: number | null;
}): number | null {
  const values = [
    caseRow.rentArrearsDaysOverdue,
    caseRow.billArrearsDaysOverdue,
    caseRow.bondArrearsDaysOverdue,
  ].filter((value): value is number => value != null);
  if (values.length === 0) return null;
  return Math.max(...values);
}
