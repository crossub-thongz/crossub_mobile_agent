'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  getGoogleMapsApiKey,
  loadGoogleMaps,
  parsePlaceResult,
  type ParsedAustralianAddress,
} from '@/lib/google-places';

interface PropertyAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (parsed: ParsedAustralianAddress) => void;
  placeholder?: string;
  disabled?: boolean;
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
    if (!mapsEnabled || !coords || !mapContainerRef.current) return;

    void loadGoogleMaps().then(() => {
      if (!mapContainerRef.current) return;

      const center = { lat: coords.lat, lng: coords.lng };

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 16,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        });
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: center,
        });
        return;
      }

      mapRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    });
  }, [mapsEnabled, coords]);

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
          Search for an Australian address — suburb, state, and postcode fill in automatically.
        </p>
      ) : null}

      {coords ? (
        <div
          ref={mapContainerRef}
          className="border-border/60 h-44 w-full overflow-hidden rounded-md border"
          aria-label="Selected property location on map"
        />
      ) : null}
    </div>
  );
}
