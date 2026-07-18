import {
  INSPECTION_RECORD_STATUS,
  INSPECTION_RECORD_TYPE,
} from '@/constants/inspection-records';
import { inspectionsApi } from '@/lib/inspections-api';
import type { InspectionDetail, InspectionRecord } from '@/lib/inspections-types';

function pickLatestIngoing(records: InspectionRecord[]): InspectionRecord | null {
  const completed = records.filter(
    (row) =>
      row.status === INSPECTION_RECORD_STATUS.COMPLETED ||
      row.status === INSPECTION_RECORD_STATUS.PUBLISHED,
  );
  const pool = completed.length > 0 ? completed : records;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => {
    const aAt = a.completedDate ?? a.updatedAt ?? a.createdAt;
    const bAt = b.completedDate ?? b.updatedAt ?? b.createdAt;
    return bAt.localeCompare(aAt);
  })[0]!;
}

/**
 * Load the Compare-step ingoing report: linked id first, else latest
 * completed/published INGOING for the property.
 */
export async function resolveCompareIngoingDetail(args: {
  ingoingInspectionId?: string | null;
  propertyId?: string | null;
}): Promise<InspectionDetail | null> {
  if (args.ingoingInspectionId) {
    const linked = await inspectionsApi.getDetail(args.ingoingInspectionId).catch(() => null);
    if (linked) return linked;
  }

  if (!args.propertyId) return null;

  const list = await inspectionsApi
    .list({
      propertyId: args.propertyId,
      type: INSPECTION_RECORD_TYPE.INGOING,
      pageSize: 25,
    })
    .catch(() => null);
  const latest = pickLatestIngoing(list?.inspections ?? []);
  if (!latest) return null;
  return inspectionsApi.getDetail(latest.id).catch(() => null);
}
