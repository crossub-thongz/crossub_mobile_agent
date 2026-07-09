'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (parsed: ParsedAustralianAddress) => void;
  latitude?: number;
  longitude?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Extra fields shown under street address on the left (state, suburb, postcode). */
  locationFields?: ReactNode;
  /** Called when map search is ready / failed so parent can lock address fields. */
  onMapsStatusChange?: (status: { ready: boolean; failed: boolean; enabled: boolean }) => void;
}

function formatCoord(value: number): string {
  return value.toFixed(6);
}

export function PropertyAddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  latitude,
  longitude,
  placeholder = '66, Berry Street',
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
  /** When Maps works, address fields are search-only (locked). Manual edit only if Maps is down. */
  const addressLocked = mapsEnabled && !mapsFailed;

  const coords =
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null;

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    onMapsStatusChange?.({ ready: mapsReady, failed: mapsFailed, enabled: mapsEnabled });
  }, [mapsReady, mapsFailed, mapsEnabled, onMapsStatusChange]);

  const applyParsedPlace = useCallback((parsed: ParsedAustralianAddress) => {
    // Single parent update — avoid a separate onChange that clears lat/lng first.
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
      } else {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(zoom);
        if (coords) {
          markerRef.current?.setPosition(center);
          markerRef.current?.setVisible(true);
        } else {
          markerRef.current?.setVisible(false);
        }
      }

      google.maps.event.trigger(mapRef.current, 'resize');
      mapRef.current.setCenter(center);
    });
  }, [mapsEnabled, mapsReady, coords]);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current || !mapRef.current) return;
    const el = mapContainerRef.current;
    const observer = new ResizeObserver(() => {
      if (!mapRef.current) return;
      google.maps.event.trigger(mapRef.current, 'resize');
      const center = coords ?? DEFAULT_CENTER;
      mapRef.current.setCenter(center);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapsReady, coords]);

  const showMap = mapsEnabled && mapsReady;

  const coordsFields = coords ? (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Latitude
        </Label>
        <Input
          readOnly
          value={formatCoord(coords.lat)}
          className="bg-muted/40 font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Longitude
        </Label>
        <Input
          readOnly
          value={formatCoord(coords.lng)}
          className="bg-muted/40 font-mono text-xs"
        />
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      <div ref={placesAttributionRef} className="hidden" aria-hidden />
      {mapsEnabled ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
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
              Pick a suggestion to fill street address, suburb, state, postcode, and coordinates.
            </p>
          ) : mapsFailed ? (
            <p className="text-amber-700 text-xs dark:text-amber-400">
              Map search is unavailable — enter the address fields manually below.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Loading map search…</p>
          )}
        </div>
      ) : null}

      <div
        className={
          showMap
            ? 'grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(200px,240px)]'
            : 'space-y-3'
        }
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Street address
            </Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled || addressLocked}
              readOnly={addressLocked}
              autoComplete="street-address"
              className={cn(addressLocked && 'bg-muted/40')}
            />
          </div>
          {locationFields}
          {coordsFields}
        </div>

        {showMap ? (
          <div
            ref={mapContainerRef}
            className="border-border/60 min-h-[220px] w-full overflow-hidden rounded-md border lg:min-h-0 lg:h-full"
            aria-label="Property location map"
          />
        ) : null}
      </div>
    </div>
  );
}
