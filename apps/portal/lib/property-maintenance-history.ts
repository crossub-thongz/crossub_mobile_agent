import type { MaintenanceRequest } from '@/lib/types';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';

/** Spawned from an End Leasing case — not a standalone agent Task. */
export function isEndLeasingSpawnedMaintenance(
  request: Pick<MaintenanceRequest, 'endLeasingMaintenance' | 'title' | 'description'>,
): boolean {
  if (request.endLeasingMaintenance === true) return true;
  const title = request.title?.trim().toLowerCase() ?? '';
  if (title === 'end of lease') return true;
  return /^end-of-lease make-good/i.test(request.description?.trim() ?? '');
}

export function isDeletedMaintenance(request: MaintenanceRequest): boolean {
  if (request.apiStatus === MAINTENANCE_STATUS.CANCELLED) return true;
  if (request.status.toLowerCase() === 'deleted') return true;
  const status = request.status.toLowerCase();
  return status.includes('cancelled') || status.includes('deleted');
}

export function isHistoryMaintenance(request: MaintenanceRequest): boolean {
  if (isDeletedMaintenance(request)) return false;
  const status = request.status.toLowerCase();
  return status.includes('complete') || status.includes('closed');
}

export function isActiveMaintenance(request: MaintenanceRequest): boolean {
  return !isDeletedMaintenance(request) && !isHistoryMaintenance(request);
}

export function canDeleteMaintenance(request: MaintenanceRequest): boolean {
  return isActiveMaintenance(request);
}
