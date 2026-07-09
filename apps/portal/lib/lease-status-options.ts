import type { Property } from '@/lib/types';

/** Lease status choices for property intake forms. Fixed term maps to `active`. */
export const LEASE_STATUS_FORM_OPTIONS: {
  value: Property['leaseStatus'];
  label: string;
}[] = [
  { value: 'active', label: 'Fixed term' },
  { value: 'periodic', label: 'Periodic' },
  { value: 'vacating', label: 'Vacating' },
  { value: 'vacant', label: 'Vacant' },
];

export function mapLeaseStatusToPropertyStatus(
  leaseStatus: Property['leaseStatus'],
): 'OCCUPIED' | 'VACANT' | 'SHOWING' | 'MAINTENANCE' {
  if (leaseStatus === 'vacant') return 'VACANT';
  return 'OCCUPIED';
}
