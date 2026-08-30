'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapPin } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getGoogleMapsApiKey,
  loadGoogleMaps,
  parsePlaceResult,
  type ParsedAustralianAddress,
} from '@/lib/google-places';
import { cn } from '@/lib/utils';

/** Default map centre — Sydney CBD, good starting point for AU address search. */
const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 11;
const SELECTED_ZOOM = 16;

interface PropertyAddressAutocompleteProps {
  onPlaceSelect: (parsed: ParsedAustralianAddress) => void;
  latitude?: number;
  longitude?: number;
  disabled?: boolean;
  /** Address fields shown on the left beside the map. */
  locationFields?: ReactNode;
  /** Called when map search is ready / failed so parent can lock address fields. */
  onMapsStatusChange?: (status: { ready: boolean; failed: boolean; enabled: boolean }) => void;
}

export function PropertyAddressAutocomplete({
  onPlaceSelect,
  latitude,
  longitude,
  disabled,
  locationFields,
  onMapsStatusChange,
}: PropertyAddressAutocompleteProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  /** PlacesService requires a map or HTMLDivElement for attributions — not an <input>. */
  const placesAttributionRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapsFailed, setMapsFailed] = useState(false);
  const apiKey = getGoogleMapsApiKey();
  const mapsEnabled = !!apiKey;

  const coords = useMemo(
    () =>
      latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null,
    [latitude, longitude],
  );
  const coordsSignature =
    coords != null ? `${coords.lat}:${coords.lng}` : 'none';
  const lastCoordsSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    onMapsStatusChange?.({ ready: mapsReady, failed: mapsFailed, enabled: mapsEnabled });
  }, [mapsReady, mapsFailed, mapsEnabled, onMapsStatusChange]);

  const applyParsedPlace = useCallback((parsed: ParsedAustralianAddress) => {
    onPlaceSelectRef.current(parsed);
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    if (!mapsEnabled || !searchInputRef.current) return;

    let cancelled = false;

    void loadGoogleMaps()
      .then(() => {
        if (cancelled || !searchInputRef.current || autocompleteRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: 'au' },
          fields: ['address_components', 'geometry', 'formatted_address', 'name', 'place_id'],
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const placeId = place.place_id;
          const attributionEl = placesAttributionRef.current;

          // Prefer getDetails — first pac selection often returns place_id only
          // (no address_components), so parsePlaceResult(getPlace()) fails until reselect.
          if (placeId && attributionEl) {
            const service = new google.maps.places.PlacesService(attributionEl);
            service.getDetails(
              {
                placeId,
                fields: ['address_components', 'geometry', 'formatted_address', 'name'],
              },
              (detail, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
                  const fromDetails = parsePlaceResult(detail);
                  if (fromDetails) {
                    applyParsedPlace(fromDetails);
                    return;
                  }
                }
                const fallback = parsePlaceResult(place);
                if (fallback) applyParsedPlace(fallback);
              },
            );
            return;
          }

          const parsed = parsePlaceResult(place);
          if (parsed) applyParsedPlace(parsed);
        });

        autocompleteRef.current = autocomplete;
        setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapsFailed(true);
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [mapsEnabled, applyParsedPlace]);

  useEffect(() => {
    if (!mapsEnabled || !mapsReady || !mapContainerRef.current) return;

    void loadGoogleMaps().then(() => {
      if (!mapContainerRef.current) return;

      const center = coords ?? DEFAULT_CENTER;
      const zoom = coords ? SELECTED_ZOOM : DEFAULT_ZOOM;

      const coordsChanged = lastCoordsSignatureRef.current !== coordsSignature;

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: center,
          visible: !!coords,
        });
        lastCoordsSignatureRef.current = coordsSignature;
      } else if (coordsChanged) {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(zoom);
        if (coords) {
          markerRef.current?.setPosition(center);
          markerRef.current?.setVisible(true);
        } else {
          markerRef.current?.setVisible(false);
        }
        lastCoordsSignatureRef.current = coordsSignature;
      }

      google.maps.event.trigger(mapRef.current, 'resize');
    });
  }, [mapsEnabled, mapsReady, coords, coordsSignature]);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || !mapRef.current) return;
    const el = mapContainerRef.current;
    const observer = new ResizeObserver(() => {
      if (!mapRef.current) return;
      google.maps.event.trigger(mapRef.current, 'resize');
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapsReady]);

  const showMap = mapsEnabled && mapsReady;
  const showMapColumn = mapsEnabled && !mapsFailed;

  const searchBlock = mapsEnabled ? (
    <div className="max-w-md space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        Search address
      </Label>
      <div className="relative">
        <MapPin
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          ref={searchInputRef}
          defaultValue=""
          placeholder="Search Google Maps — pick a result to auto-fill"
          disabled={disabled || mapsFailed}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      {mapsReady ? (
        <p className="text-muted-foreground text-xs">
          Pick a suggestion to fill street, suburb, state, postcode, and coordinates. Add a
          unit manually if needed — most street addresses do not include one.
        </p>
      ) : mapsFailed ? (
        <p className="text-amber-700 text-xs dark:text-amber-400">
          Map search is unavailable — enter the address fields manually below.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">Loading map search…</p>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      <div ref={placesAttributionRef} className="hidden" aria-hidden />

      {showMapColumn ? (
        <div className="space-y-3">
          {searchBlock}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
            <div className="flex min-w-0 flex-col gap-3">
              {locationFields}
            </div>
            <div className="relative mt-2 mb-6 min-h-[220px] w-full lg:mt-6 lg:mb-8 lg:min-h-[260px]">
              {!showMap ? (
                <div className="border-border/60 text-muted-foreground flex h-full min-h-[220px] items-center justify-center rounded-md border bg-muted/20 text-xs lg:min-h-[260px]">
                  Loading map…
                </div>
              ) : null}
              <div
                ref={mapContainerRef}
                className={cn(
                  'border-border/60 absolute inset-0 overflow-hidden rounded-md border',
                  !showMap && 'invisible',
                )}
                aria-label="Property location map"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {searchBlock}
          {locationFields ? <div className="flex flex-col gap-3">{locationFields}</div> : null}
        </>
      )}
    </div>
  );
}
