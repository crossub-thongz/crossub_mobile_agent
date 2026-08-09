import type { InspectionRecordType } from '@/constants/inspection-records';
import { INSPECTION_RECORD_TYPE } from '@/constants/inspection-records';
import { inspectionsApi } from '@/lib/inspections-api';
import { resolveOpenBillingInspectionId } from '@/lib/billing/resolve-open-billing-inspection-id';

const IN_PROGRESS_STATUSES = new Set([
  'IN_PROGRESS',
  'FIRST_REVIEW',
  'SECOND_REVIEW',
  'COMPLETED',
  'PUBLISHED',
]);

export type BillableInspectionType = Extract<
  InspectionRecordType,
  'OPEN' | 'INGOING' | 'OUTGOING' | 'ROUTINE'
>;

async function latestPoolInspectionForProperty(args: {
  propertyId: string;
  inspectionType: BillableInspectionType;
}): Promise<string | null> {
  try {
    const { inspections } = await inspectionsApi.list({ pageSize: 100 });
    const matches = inspections
      .filter(
        (row) =>
          row.propertyId === args.propertyId &&
          row.type === args.inspectionType &&
          row.status !== 'CANCELLED',
      )
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const inProgress = matches.find((row) => IN_PROGRESS_STATUSES.has(row.status));
    return inProgress?.id?.trim() ?? matches[0]?.id?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Resolve the pool inspection row id used for platform billing. */
export async function resolveBillingInspectionId(args: {
  inspectionId: string;
  propertyId?: string;
  viewingSessionId?: string;
  inspectionType?: BillableInspectionType;
}): Promise<string> {
  const initial = args.inspectionId.trim();
  const type = args.inspectionType;

  if (type === INSPECTION_RECORD_TYPE.OPEN || args.viewingSessionId?.trim()) {
    return resolveOpenBillingInspectionId({
      inspectionId: initial,
      propertyId: args.propertyId,
      viewingSessionId: args.viewingSessionId,
    });
  }

  if (!initial) {
    if (args.propertyId && type) {
      return (await latestPoolInspectionForProperty({ propertyId: args.propertyId, inspectionType: type })) ?? '';
    }
    return initial;
  }

  try {
    const record = await inspectionsApi.get(initial);
    if (record?.id?.trim()) return record.id.trim();
  } catch {
    /* not a direct pool row id — fall through */
  }

  if (args.propertyId && type) {
    const pooled = await latestPoolInspectionForProperty({
      propertyId: args.propertyId,
      inspectionType: type,
    });
    if (pooled) return pooled;
  }

  return initial;
}
