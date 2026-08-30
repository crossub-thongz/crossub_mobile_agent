import {
  SessionStatusEnum,
  type OpenInspectionSession,
} from '@/constants/open-inspection-ops';
import { inspectionsApi } from '@/lib/inspections-api';
import {
  collectOpenViewingTwinKeys,
  foldOpenPoolTwinIntoSession,
  isOpenPoolTwinOfViewingSession,
  mergeInspectionRows,
  openPoolMatchesViewingSession,
} from '@/lib/inspection-mappers';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { InspectionDetail } from '@/lib/inspections-types';
import type { Inspection } from '@/lib/types';
import type { Property } from '@/lib/types';

const PAGE_SIZE = 100;
const MAX_PAGES_PER_PROPERTY = 10;

export type FetchAgentInspectionsOptions = {
  /**
   * When false, skip the paginated `/inspections` crawl (expensive on large agencies).
   * Open-viewing sessions are still loaded.
   */
  includeStaffRecords?: boolean;
};

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

/** Open + cancelled viewing sessions — small, safe to poll frequently. */
export async function fetchOpenInspectionSessions(): Promise<OpenInspectionSession[]> {
  const [liveSessions, cancelledSessions] = await Promise.all([
    openViewingsApi.list().catch(() => [] as OpenInspectionSession[]),
    openViewingsApi
      .list({ sessionStatus: SessionStatusEnum.CANCELLED })
      .catch(() => [] as OpenInspectionSession[]),
  ]);
  const byId = new Map<string, OpenInspectionSession>();
  for (const session of [...liveSessions, ...cancelledSessions]) {
    byId.set(session.id, session);
  }
  return [...byId.values()];
}

/** Staff inspection records scoped to the agent's property book (not the whole agency). */
async function listInspectionRecordsForProperties(propertyIds: string[]) {
  const uniqueIds = [...new Set(propertyIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [] as Awaited<ReturnType<typeof inspectionsApi.list>>['inspections'];
  }

  const all: Awaited<ReturnType<typeof inspectionsApi.list>>['inspections'] = [];
  const seen = new Set<string>();

  await Promise.all(
    uniqueIds.map(async (propertyId) => {
      let page = 1;
      while (page <= MAX_PAGES_PER_PROPERTY) {
        const result = await inspectionsApi.list({ page, pageSize: PAGE_SIZE, propertyId });
        for (const row of result.inspections) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          all.push(row);
        }
        if (result.inspections.length === 0 || result.inspections.length < PAGE_SIZE) {
          break;
        }
        page += 1;
      }
    }),
  );

  return all;
}

/** Refresh open-viewing rows on a background poll without re-crawling `/inspections`. */
export function mergeOpenSessionsIntoInspections(
  previous: Inspection[] | null,
  properties: Property[],
  sessions: OpenInspectionSession[],
): Inspection[] {
  const addressMap = propertyIdByAddress(properties);
  const openRows = mergeInspectionRows([], sessions, addressMap);
  const sessionTwinKeys = collectOpenViewingTwinKeys(openRows);
  const previousPools = (previous ?? []).filter((row) =>
    isOpenPoolTwinOfViewingSession(row, sessionTwinKeys),
  );
  const kept = (previous ?? []).filter(
    (row) =>
      row.source !== 'open_viewing' && !isOpenPoolTwinOfViewingSession(row, sessionTwinKeys),
  );
  const foldedSessions = openRows.map((session) => {
    const pool = previousPools.find((item) => openPoolMatchesViewingSession(item, session));
    return pool ? foldOpenPoolTwinIntoSession(session, pool) : session;
  });
  const byId = new Map<string, Inspection>();
  for (const row of kept) byId.set(row.id, row);
  for (const row of foldedSessions) byId.set(row.id, row);
  return [...byId.values()];
}

/** Load inspections from staff APIs + open viewings (scoped to assigned properties). */
export async function fetchAgentInspections(
  properties: Property[] = [],
  options: FetchAgentInspectionsOptions = {},
): Promise<Inspection[]> {
  const includeStaffRecords = options.includeStaffRecords !== false;
  const addressMap = propertyIdByAddress(properties);
  const propertyIds = properties.map((p) => p.id).filter(Boolean);
  const [records, sessions] = await Promise.all([
    includeStaffRecords
      ? listInspectionRecordsForProperties(propertyIds)
      : Promise.resolve([] as Awaited<ReturnType<typeof inspectionsApi.list>>['inspections']),
    fetchOpenInspectionSessions(),
  ]);
  return mergeInspectionRows(records, sessions, addressMap);
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
