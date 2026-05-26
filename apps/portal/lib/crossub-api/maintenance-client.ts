import { api } from '@/lib/api';
import type {
  ApiMaintenanceState,
  ApiMaintenanceUserRole,
} from '@/lib/crossub-api/types';

export async function fetchMaintenanceState(): Promise<ApiMaintenanceState> {
  return api.get<ApiMaintenanceState>('/maintenance/state');
}

export async function fetchMaintenanceKpis(role: ApiMaintenanceUserRole = 'agent') {
  return api.get<{ total: number; overdue: number; breachRate: number }>(
    `/maintenance/kpis?role=${role}`,
  );
}

export async function approveMaintenanceQuotation(
  quotationId: string,
  actorRole: ApiMaintenanceUserRole = 'agent',
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/approve', {
    quotationId,
    actorRole,
  });
}

export async function declineMaintenanceQuotation(
  quotationId: string,
  declineReason: string,
  actorRole: ApiMaintenanceUserRole = 'agent',
): Promise<ApiMaintenanceState> {
  return api.post<ApiMaintenanceState>('/maintenance/quotations/decline', {
    quotationId,
    declineReason,
    actorRole,
  });
}
