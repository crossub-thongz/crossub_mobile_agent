import type { LeasingRecord } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function leaseHistoryLabel(record: LeasingRecord): string {
  const startYear = formatDate(record.leaseStart).slice(-4);
  const endYear = formatDate(record.leaseEnd).slice(-4);
  return `Lease ${startYear}–${endYear} – ${record.approvedTenant}`;
}
