import {
  SessionStatusEnum,
  type OpenInspectionSession,
} from '@/constants/open-inspection-ops';
import { inspectionsApi } from '@/lib/inspections-api';
import { mergeInspectionRows } from '@/lib/inspection-mappers';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import type { Property } from '@/lib/types';

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

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

/** Page through staff `/inspections` so completed cases are not dropped by pageSize. */
async function listAllInspectionRecords() {
  const all: Awaited<ReturnType<typeof inspectionsApi.list>>['inspections'] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (page <= MAX_PAGES && all.length < total) {
    const result = await inspectionsApi.list({ page, pageSize: PAGE_SIZE });
    total = result.total;
    all.push(...result.inspections);
    if (result.inspections.length === 0) break;
    page += 1;
  }

  return all;
}

/** Load inspections from the same staff APIs as crossub_web (scoped to assigned agencies). */
export async function fetchAgentInspections(
  properties: Property[] = [],
): Promise<Inspection[]> {
  const addressMap = propertyIdByAddress(properties);
  const [records, liveSessions, cancelledSessions] = await Promise.all([
    listAllInspectionRecords(),
    openViewingsApi.list().catch(() => [] as OpenInspectionSession[]),
    openViewingsApi
      .list({ sessionStatus: SessionStatusEnum.CANCELLED })
      .catch(() => [] as OpenInspectionSession[]),
  ]);
  const byId = new Map<string, OpenInspectionSession>();
  for (const session of [...liveSessions, ...cancelledSessions]) {
    byId.set(session.id, session);
  }
  return mergeInspectionRows(records, [...byId.values()], addressMap);
}

export async function fetchInspectionDetail(
  inspection: Inspection,
): Promise<InspectionDetail | OpenInspectionSession | null> {
  if (inspection.source === 'open_viewing') {
    try {
      return await openViewingsApi.get(inspection.id);
    } catch {
      return null;
    }
  }
  if (inspection.type === 'OPEN' && inspection.source !== 'inspection') {
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
