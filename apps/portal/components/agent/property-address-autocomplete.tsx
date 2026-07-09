'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getGoogleMapsApiKey,
  loadGoogleMaps,
  parsePlaceResult,
  type ParsedAustralianAddress,
} from '@/lib/google-places';

/** Default map centre — Sydney CBD, good starting point for AU address search. */
const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 11;
const SELECTED_ZOOM = 16;

interface PropertyAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (parsed: ParsedAustralianAddress) => void;
  placeholder?: string;
  disabled?: boolean;
}

function formatCoord(value: number): string {
  return value.toFixed(6);
}

export function PropertyAddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = '66, Berry Street',
  disabled,
}: PropertyAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const apiKey = getGoogleMapsApiKey();
  const mapsEnabled = !!apiKey;

  const handlePlaceSelect = useCallback(
    (parsed: ParsedAustralianAddress) => {
      onPlaceSelect(parsed);
      if (parsed.lat != null && parsed.lng != null) {
        setCoords({ lat: parsed.lat, lng: parsed.lng });
      }
    },
    [onPlaceSelect],
  );

  useEffect(() => {
    if (!mapsEnabled || !inputRef.current) return;

    let cancelled = false;

    void loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'au' },
          fields: ['address_components', 'geometry', 'formatted_address', 'name'],
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const parsed = parsePlaceResult(place);
          if (!parsed) return;
          onChange(parsed.address);
          handlePlaceSelect(parsed);
        });

        autocompleteRef.current = autocomplete;
        setMapsReady(true);
      })
      .catch(() => {
        // Missing/invalid key — fall back to plain text input.
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [mapsEnabled, handlePlaceSelect, onChange]);

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
        return;
      }

      mapRef.current.setCenter(center);
      mapRef.current.setZoom(zoom);
      if (coords) {
        markerRef.current?.setPosition(center);
        markerRef.current?.setVisible(true);
      } else {
        markerRef.current?.setVisible(false);
      }
    });
  }, [mapsEnabled, mapsReady, coords]);

  return (
    <div className="space-y-2">
      <div className="relative">
        {mapsEnabled ? (
          <MapPin
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
        ) : null}
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={mapsEnabled ? 'pl-9' : undefined}
        />
      </div>

      {mapsEnabled && mapsReady ? (
        <p className="text-muted-foreground text-xs">
          Search for an Australian address — suggestions appear as you type. Suburb, state,
          postcode, and coordinates fill in when you pick a result.
        </p>
      ) : null}

      {mapsEnabled && mapsReady ? (
        <div
          ref={mapContainerRef}
          className="border-border/60 h-52 w-full overflow-hidden rounded-md border"
          aria-label="Property location map"
        />
      ) : null}

      {coords ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Latitude
            </Label>
            <Input readOnly value={formatCoord(coords.lat)} className="bg-muted/40 font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Longitude
            </Label>
            <Input readOnly value={formatCoord(coords.lng)} className="bg-muted/40 font-mono text-xs" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
