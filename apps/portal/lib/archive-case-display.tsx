import { TERMINATION_UI } from '@/constants/end-leasing';
import { isHistoryEndLeasingCase } from '@/lib/property-leasing-history';
import type { ArchivedEndLeasingCase, VacatingCase } from '@/lib/types';

export type ArchiveOutcome = 'deleted' | 'tenancy_ended';

export const ARCHIVE_OUTCOME_LABEL: Record<ArchiveOutcome, string> = {
  deleted: 'Deleted',
  tenancy_ended: 'Tenancy ended',
};

export const ARCHIVE_OUTCOME_BADGE: Record<ArchiveOutcome, string> = {
  deleted: TERMINATION_UI.deletedBadge,
  tenancy_ended:
    'inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200',
};

export interface ArchiveEndLeasingRow {
  id: string;
  propertyId: string | null;
  propertyAddress: string;
  vacateDate?: string;
  note: string;
  closedAt: string;
  outcome: ArchiveOutcome;
}

export function archiveOutcomeBadge(outcome: ArchiveOutcome) {
  return (
    <span className={ARCHIVE_OUTCOME_BADGE[outcome]}>{ARCHIVE_OUTCOME_LABEL[outcome]}</span>
  );
}

export function buildEndLeasingArchiveRows(
  cancelled: ArchivedEndLeasingCase[],
  vacating: VacatingCase[],
): ArchiveEndLeasingRow[] {
  const cancelledIds = new Set(cancelled.map((item) => item.id));

  const deletedRows: ArchiveEndLeasingRow[] = cancelled.map((item) => ({
    id: item.id,
    propertyId: item.propertyId,
    propertyAddress: item.propertyAddress,
    vacateDate: item.vacateDate,
    note: item.cancelReason,
    closedAt: item.cancelledAt,
    outcome: 'deleted',
  }));

  const completedRows: ArchiveEndLeasingRow[] = vacating
    .filter((item) => isHistoryEndLeasingCase(item) && !cancelledIds.has(item.id))
    .map((item) => ({
      id: item.id,
      propertyId: item.propertyId || null,
      propertyAddress: item.propertyAddress,
      vacateDate: item.vacateDate,
      note: item.reason || 'End-of-tenancy workflow completed',
      closedAt: item.vacateDate || item.createdAt || '',
      outcome: 'tenancy_ended',
    }));

  return [...deletedRows, ...completedRows].sort(
    (a, b) => Date.parse(b.closedAt || '') - Date.parse(a.closedAt || ''),
  );
}
