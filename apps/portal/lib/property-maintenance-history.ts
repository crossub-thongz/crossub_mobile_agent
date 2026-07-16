import type { MaintenanceRequest } from '@/lib/types';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';

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
