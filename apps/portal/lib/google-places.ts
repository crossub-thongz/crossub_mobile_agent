import { Loader } from '@googlemaps/js-api-loader';

import {
  AUSTRALIAN_STATE_ORDER,
  type AustralianStateKey,
} from '@/constants/api-enums';

export interface ParsedAustralianAddress {
  unit: string;
  streetNumber: string;
  streetName: string;
  /** Composed street line for API `address` (unit/number + street name). */
  address: string;
  suburb: string;
  state: AustralianStateKey | '';
  postcode: string;
  lat?: number;
  lng?: number;
}

/** Build the single street-address string stored on the property. */
export function composeStreetAddress(
  unit: string,
  streetNumber: string,
  streetName: string,
): string {
  const u = unit.trim();
  const n = streetNumber.trim();
  const name = streetName.trim();
  if (u && n && name) return `${u}/${n} ${name}`;
  if (n && name) return `${n}, ${name}`;
  if (name) return name;
  if (u && n) return `${u}/${n}`;
  if (n) return n;
  if (u) return u;
  return '';
}

let loaderPromise: Promise<typeof google> | null = null;

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || undefined;
}

export function loadGoogleMaps(): Promise<typeof google> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'));
  }
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });
    loaderPromise = loader.load();
  }
  return loaderPromise;
}

function componentValue(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
  short = false,
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return '';
  return short ? match.short_name : match.long_name;
}

function parseStreetParts(components: google.maps.GeocoderAddressComponent[]): {
  unit: string;
  streetNumber: string;
  streetName: string;
} {
  let unit = componentValue(components, 'subpremise');
  let streetNumber = componentValue(components, 'street_number');
  const streetName = componentValue(components, 'route');

  // AU Places often returns "12/66" as street_number with no subpremise.
  if (!unit && streetNumber.includes('/')) {
    const [left, right] = streetNumber.split('/');
    if (left?.trim() && right?.trim()) {
      unit = left.trim();
      streetNumber = right.trim();
    }
  }

  return { unit, streetNumber, streetName };
}

/** Pull unit from "Unit 5", "U5", "Apt 5", or leading "5/66 …" when components omit subpremise. */
function extractUnitFromText(text: string): { unit: string; remainder: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const labeled = trimmed.match(
    /^(?:unit|apt|apartment|suite|flat|level|lvl|u)\s*([A-Za-z0-9-]+)\b[,/\s-]*/i,
  );
  if (labeled?.[1]) {
    return { unit: labeled[1], remainder: trimmed.slice(labeled[0].length).trim() };
  }

  const slash = trimmed.match(/^([A-Za-z0-9-]+)\s*\/\s*(\d+[A-Za-z]?)\b(.*)$/);
  if (slash?.[1] && slash[2]) {
    return {
      unit: slash[1],
      remainder: `${slash[2]}${slash[3] ?? ''}`.trim(),
    };
  }

  return null;
}

function resolveAustralianState(shortName: string): AustralianStateKey | '' {
  const upper = shortName.toUpperCase();
  return AUSTRALIAN_STATE_ORDER.includes(upper as AustralianStateKey)
    ? (upper as AustralianStateKey)
    : '';
}

/** Map a Google Places result into the property registry address fields. */
export function parsePlaceResult(
  place: google.maps.places.PlaceResult,
): ParsedAustralianAddress | null {
  const components = place.address_components;
  if (!components?.length) return null;

  const parts = parseStreetParts(components);
  let { unit, streetNumber, streetName } = parts;

  // Fallback: unit often only appears in name / formatted_address for AU flats.
  if (!unit) {
    const candidates = [
      place.name?.trim() ?? '',
      place.formatted_address?.split(',')[0]?.trim() ?? '',
    ].filter(Boolean);

    for (const candidate of candidates) {
      const extracted = extractUnitFromText(candidate);
      if (!extracted) continue;
      unit = extracted.unit;
      // If street number is still empty, try to take it from the remainder ("66 Berry Street").
      if (!streetNumber) {
        const numMatch = extracted.remainder.match(/^(\d+[A-Za-z]?)\b/);
        if (numMatch?.[1]) streetNumber = numMatch[1];
      }
      break;
    }
  }

  if (!streetName && !streetNumber) {
    const fallback =
      place.name?.trim() || place.formatted_address?.split(',')[0]?.trim() || '';
    if (fallback) streetName = fallback;
  }

  const suburb =
    componentValue(components, 'locality') ||
    componentValue(components, 'postal_town') ||
    componentValue(components, 'sublocality_level_1') ||
    componentValue(components, 'sublocality');

  const state = resolveAustralianState(
    componentValue(components, 'administrative_area_level_1', true),
  );

  const postcode = componentValue(components, 'postal_code').replace(/\D/g, '').slice(0, 4);

  const lat = place.geometry?.location?.lat();
  const lng = place.geometry?.location?.lng();

  return {
    unit,
    streetNumber,
    streetName,
    address: composeStreetAddress(unit, streetNumber, streetName),
    suburb,
    state,
    postcode,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
  };
}
