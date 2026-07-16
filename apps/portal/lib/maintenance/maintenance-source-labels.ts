import type { ApiMaintenanceRequest } from '@/lib/crossub-api/types';

export function maintenanceSourceLabel(
  source: ApiMaintenanceRequest['source'] | undefined,
): string {
  switch (source) {
    case 'tenant_app':
      return 'Tenant Requested';
    case 'agent_submission':
    case 'email':
      return 'Agent Created';
    default:
      return 'Unknown';
  }
}
