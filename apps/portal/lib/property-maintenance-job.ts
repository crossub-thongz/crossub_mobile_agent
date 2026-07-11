import type { MaintenanceRequest } from '@/lib/types';

const PRIORITY_ORDER: Record<MaintenanceRequest['priority'], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function pickPrimaryMaintenance(
  jobs: MaintenanceRequest[],
): MaintenanceRequest | undefined {
  if (jobs.length === 0) return undefined;
  return [...jobs].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  )[0];
}

export {
  maintenanceCurrentStepLabel,
  maintenanceStepShortLabel,
} from '@/lib/case-workflows/maintenance';
