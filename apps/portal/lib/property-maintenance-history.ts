import type { MaintenanceRequest } from '@/lib/types';

export function isDeletedMaintenance(request: MaintenanceRequest): boolean {
  return request.status.toLowerCase().includes('cancelled');
}

export function isHistoryMaintenance(request: MaintenanceRequest): boolean {
  if (isDeletedMaintenance(request)) return false;
  const status = request.status.toLowerCase();
  return status.includes('complete') || status.includes('closed');
}

export function isActiveMaintenance(request: MaintenanceRequest): boolean {
  return !isDeletedMaintenance(request) && !isHistoryMaintenance(request);
}
