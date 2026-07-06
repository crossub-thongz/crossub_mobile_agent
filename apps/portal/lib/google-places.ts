import { Loader } from '@googlemaps/js-api-loader';

import {
  AUSTRALIAN_STATE_ORDER,
  type AustralianStateKey,
} from '@/constants/api-enums';

export interface ParsedAustralianAddress {
  address: string;
  suburb: string;
  state: AustralianStateKey | '';
  postcode: string;
  lat?: number;
  lng?: number;
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

function formatStreetAddress(components: google.maps.GeocoderAddressComponent[]): string {
  const streetNumber = componentValue(components, 'street_number');
  const route = componentValue(components, 'route');
  const subpremise = componentValue(components, 'subpremise');

  if (subpremise && streetNumber && route) {
    return `${subpremise}/${streetNumber} ${route}`;
  }
  if (streetNumber && route) {
    return `${streetNumber}, ${route}`;
  }
  if (route) return route;
  return '';
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

  const address =
    formatStreetAddress(components) ||
    place.name?.trim() ||
    place.formatted_address?.split(',')[0]?.trim() ||
    '';

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
    address,
    suburb,
    state,
    postcode,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
  };
}
