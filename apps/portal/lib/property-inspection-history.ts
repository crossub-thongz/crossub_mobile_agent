import { isDeletedInspection } from '@/lib/open-inspection-delete';
import { isInspectionDone } from '@/lib/inspections/presentation';
import type { Inspection } from '@/lib/types';

export function isActiveInspection(inspection: Inspection): boolean {
  if (isDeletedInspection(inspection)) return false;
  return !isInspectionDone(inspection);
}

export function isHistoryInspection(inspection: Inspection): boolean {
  if (isDeletedInspection(inspection)) return false;
  return isInspectionDone(inspection);
}

export { isDeletedInspection };
