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

const INGOING_SUFFIX = / \(Ingoing\)$/;
const OUTGOING_SUFFIX = / \(Outgoing\)$/;

export function isReportPhotoUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function reportPhotos(photos: InspectionDetailPhoto[]): InspectionDetailPhoto[] {
  return photos.filter((photo) => isReportPhotoUrl(photo.url));
}

function bucketForAreaName(name: string): {
  room: string;
  side: 'ingoing' | 'outgoing';
} | null {
  const trimmed = name.trim();
  if (INGOING_SUFFIX.test(trimmed)) {
    return {
      room: trimmed.replace(INGOING_SUFFIX, ''),
      side: 'ingoing',
    };
  }
  if (OUTGOING_SUFFIX.test(trimmed)) {
    return {
      room: trimmed.replace(OUTGOING_SUFFIX, ''),
      side: 'outgoing',
    };
  }
  return null;
}

/** Group inspector-app area uploads into ingoing/outgoing pairs per room. */
export function buildOutgoingAreaPhotoPairs(
  areas: readonly InspectionDetailArea[],
): OutgoingAreaPhotoPair[] {
  const map = new Map<string, OutgoingAreaPhotoPair>();

  for (const room of OUTGOING_COMPARISON_AREAS) {
    map.set(room, { room, ingoingPhotos: [], outgoingPhotos: [] });
  }

  for (const area of areas) {
    const parsed = bucketForAreaName(area.name ?? '');
    if (!parsed) continue;

    const bucket =
      map.get(parsed.room) ??
      ({ room: parsed.room, ingoingPhotos: [], outgoingPhotos: [] } satisfies OutgoingAreaPhotoPair);

    if (parsed.side === 'ingoing') {
      bucket.ingoingPhotos = [...bucket.ingoingPhotos, ...reportPhotos(area.photos)];
    } else {
      bucket.outgoingPhotos = [...bucket.outgoingPhotos, ...reportPhotos(area.photos)];
    }
    map.set(parsed.room, bucket);
  }

  return OUTGOING_COMPARISON_AREAS.map((room) => map.get(room)!);
}

export function countOutgoingReportPhotos(
  pairs: readonly OutgoingAreaPhotoPair[],
): number {
  return pairs.reduce(
    (sum, pair) => sum + pair.ingoingPhotos.length + pair.outgoingPhotos.length,
    0,
  );
}
