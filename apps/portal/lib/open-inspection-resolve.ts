import { INSPECTION_RECORD_TYPE } from '@/constants/inspection-records';
import { mapInspectionRecordToView } from '@/lib/inspection-mappers';
import { inspectionsApi } from '@/lib/inspections-api';
import type { Inspection } from '@/lib/types';

/** Latest OPEN pool inspection record for a property (no viewing session yet). */
export async function fetchLatestOpenPoolInspection(
  propertyId: string,
): Promise<Inspection | null> {
  const { inspections } = await inspectionsApi.list({ pageSize: 100 });
  const match = inspections
    .filter((r) => r.type === INSPECTION_RECORD_TYPE.OPEN && r.propertyId === propertyId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return match ? mapInspectionRecordToView(match) : null;
}
