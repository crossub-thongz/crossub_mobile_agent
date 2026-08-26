import { OUTGOING_COMPARISON_AREAS } from '@/constants/outgoing-comparison-areas';
import type {
  InspectionDetailArea,
  InspectionDetailPhoto,
} from '@/lib/inspections-types';

export interface OutgoingAreaPhotoPair {
  room: string;
  ingoingPhotos: InspectionDetailPhoto[];
  outgoingPhotos: InspectionDetailPhoto[];
}

export type ReferenceIngoingAreas = ReadonlyArray<{
  name: string;
  photos: InspectionDetailPhoto[];
}>;

export type ReferenceIngoingContext = {
  areas?: ReferenceIngoingAreas;
  areaPlan?: {
    rooms: Array<{ name: string; sections: string[] }>;
  } | null;
} | null;

const INGOING_SUFFIX = /\s*\(Ingoing\)\s*$/i;
const OUTGOING_SUFFIX = /\s*\(Outgoing\)\s*$/i;

export function isReportPhotoUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function reportPhotos(photos: InspectionDetailPhoto[]): InspectionDetailPhoto[] {
  return photos.filter((photo) => isReportPhotoUrl(photo.url));
}

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function bucketForAreaName(name: string): {
  room: string;
  side: 'ingoing' | 'outgoing';
} | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (INGOING_SUFFIX.test(trimmed)) {
    return {
      room: trimmed.replace(INGOING_SUFFIX, '').trim(),
      side: 'ingoing',
    };
  }
  if (OUTGOING_SUFFIX.test(trimmed)) {
    return {
      room: trimmed.replace(OUTGOING_SUFFIX, '').trim(),
      side: 'outgoing',
    };
  }
  return { room: trimmed, side: 'outgoing' };
}

function emptyPair(room: string): OutgoingAreaPhotoPair {
  return { room, ingoingPhotos: [], outgoingPhotos: [] };
}

function matchReferencePhotos(
  room: string,
  referenceAreas: ReferenceIngoingAreas | undefined,
): InspectionDetailPhoto[] {
  if (!referenceAreas?.length) return [];
  const target = normalizeKey(room);
  const exact = referenceAreas.find((a) => normalizeKey(a.name) === target);
  if (exact) return reportPhotos(exact.photos);

  const starts = referenceAreas.find((a) => {
    const key = normalizeKey(a.name);
    return key.startsWith(target) || target.startsWith(key);
  });
  if (starts) return reportPhotos(starts.photos);

  const roomOnly = target.split(' · ')[0]?.trim();
  if (roomOnly && roomOnly !== target) {
    const roomMatch = referenceAreas.find((a) => normalizeKey(a.name) === roomOnly);
    if (roomMatch) return reportPhotos(roomMatch.photos);
  }
  return [];
}

function sectionAreaName(room: string, section: string): string {
  return `${room} · ${section}`;
}

function seedPairsFromAreaPlan(
  map: Map<string, OutgoingAreaPhotoPair>,
  reference: ReferenceIngoingContext,
): void {
  const plan = reference?.areaPlan;
  if (!plan?.rooms?.length) return;

  for (const planRoom of plan.rooms) {
    for (const section of planRoom.sections) {
      const room = sectionAreaName(planRoom.name, section);
      const key = normalizeKey(room);
      if (map.has(key)) continue;
      map.set(key, {
        room,
        ingoingPhotos: matchReferencePhotos(room, reference?.areas),
        outgoingPhotos: [],
      });
    }
  }
}

/**
 * `Array.isArray` narrows to `any[]`, which does not remove a `ReadonlyArray` member from a
 * union — so the false branch still held the areas array and `.areas` was not on it. An
 * explicit predicate is what actually splits these two shapes.
 */
function isReferenceIngoingAreas(
  reference: ReferenceIngoingContext | ReferenceIngoingAreas | undefined,
): reference is ReferenceIngoingAreas {
  return Array.isArray(reference);
}

/** Group inspector uploads into before/after pairs; seed empty ingoing from reference. */
export function buildOutgoingAreaPhotoPairs(
  areas: readonly InspectionDetailArea[],
  reference?: ReferenceIngoingContext | ReferenceIngoingAreas,
): OutgoingAreaPhotoPair[] {
  const referenceAreas = isReferenceIngoingAreas(reference)
    ? reference
    : reference?.areas;
  const referenceContext: ReferenceIngoingContext = isReferenceIngoingAreas(reference)
    ? { areas: reference }
    : (reference ?? null);
  const map = new Map<string, OutgoingAreaPhotoPair>();

  for (const room of OUTGOING_COMPARISON_AREAS) {
    map.set(normalizeKey(room), emptyPair(room));
  }

  for (const area of areas) {
    const parsed = bucketForAreaName(area.name ?? '');
    if (!parsed) continue;
    const key = normalizeKey(parsed.room);
    const bucket = map.get(key) ?? emptyPair(parsed.room);
    const photos = reportPhotos([
      ...area.photos,
      ...area.items.flatMap((item) => item.photos),
    ]);
    if (parsed.side === 'ingoing') {
      bucket.ingoingPhotos = [...bucket.ingoingPhotos, ...photos];
    } else {
      bucket.outgoingPhotos = [...bucket.outgoingPhotos, ...photos];
    }
    map.set(key, bucket);
  }

  for (const [key, bucket] of map) {
    if (bucket.ingoingPhotos.length > 0) continue;
    const seeded = matchReferencePhotos(bucket.room, referenceAreas);
    if (seeded.length === 0) continue;
    map.set(key, { ...bucket, ingoingPhotos: seeded });
  }

  for (const ref of referenceAreas ?? []) {
    const key = normalizeKey(ref.name);
    if (map.has(key)) continue;
    const photos = reportPhotos(ref.photos);
    if (photos.length === 0) continue;
    map.set(key, {
      room: ref.name,
      ingoingPhotos: photos,
      outgoingPhotos: [],
    });
  }

  seedPairsFromAreaPlan(map, referenceContext);

  const preferred = OUTGOING_COMPARISON_AREAS.map((room) =>
    map.get(normalizeKey(room)),
  ).filter((p): p is OutgoingAreaPhotoPair => Boolean(p));

  const extras = [...map.values()].filter(
    (pair) =>
      !OUTGOING_COMPARISON_AREAS.some(
        (room) => normalizeKey(room) === normalizeKey(pair.room),
      ),
  );

  return [...preferred, ...extras];
}

export function countOutgoingReportPhotos(
  pairs: readonly OutgoingAreaPhotoPair[],
): number {
  return pairs.reduce(
    (sum, pair) => sum + pair.ingoingPhotos.length + pair.outgoingPhotos.length,
    0,
  );
}
