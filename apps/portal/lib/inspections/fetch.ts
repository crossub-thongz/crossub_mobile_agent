import { inspectionsApi } from '@/lib/inspections-api';
import { mergeInspectionRows } from '@/lib/inspection-mappers';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import type { Inspection } from '@/lib/types';
import type { Property } from '@/lib/types';

const WORKING_SET_SIZE = 100;

function propertyIdByAddress(properties: Property[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of properties) {
    const key = p.address.toLowerCase().trim();
    map.set(key, p.id);
    const full = [p.address, p.suburb, p.state, p.postcode]
      .filter(Boolean)
      .join(', ')
      .toLowerCase()
      .trim();
    if (full) map.set(full, p.id);
  }
  return map;
}

/** Load inspections from the same staff APIs as crossub_web (scoped to assigned agencies). */
export async function fetchAgentInspections(
  properties: Property[] = [],
): Promise<Inspection[]> {
  const addressMap = propertyIdByAddress(properties);
  const [recordResult, sessions] = await Promise.all([
    inspectionsApi.list({ pageSize: WORKING_SET_SIZE }),
    openViewingsApi.list().catch(() => [] as OpenInspectionSession[]),
  ]);
  return mergeInspectionRows(recordResult.inspections, sessions, addressMap);
}

export async function fetchInspectionDetail(
  inspection: Inspection,
): Promise<InspectionDetail | OpenInspectionSession | null> {
  if (inspection.source === 'open_viewing' || inspection.type === 'OPEN') {
    try {
      return await openViewingsApi.get(inspection.id);
    } catch {
      return null;
    }
  }
  try {
    return await inspectionsApi.getDetail(inspection.id);
  } catch {
    return null;
  }
}

export { inspectionsApi, openViewingsApi };
