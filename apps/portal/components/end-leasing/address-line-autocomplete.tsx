'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  formatAustralianAddressLine,
  getGoogleMapsApiKey,
  loadGoogleMaps,
  parsePlaceResult,
} from '@/lib/google-places';
import { cn } from '@/lib/utils';

interface AddressLineAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fired after a Google Places selection with the resolved single-line address. */
  onPlaceSelect?: (address: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Single-row Google Places address field — keeps the selected address in the same
 * input (unlike the create-property flow which clears the search box).
 */
export function AddressLineAutocomplete({
  id,
  value,
  onChange,
  onPlaceSelect,
  onBlur,
  disabled,
  placeholder = 'Search or type key return address',
  className,
}: AddressLineAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesAttributionRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapsFailed, setMapsFailed] = useState(false);
  const apiKey = getGoogleMapsApiKey();
  const mapsEnabled = !!apiKey;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  const applyAddress = useCallback((line: string) => {
    onChangeRef.current(line);
    onPlaceSelectRef.current?.(line);
  }, []);

  useEffect(() => {
    if (!mapsEnabled || !inputRef.current) return;

    let cancelled = false;

    void loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current || autocompleteRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'au' },
          fields: ['address_components', 'geometry', 'formatted_address', 'name', 'place_id'],
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const placeId = place.place_id;
          const attributionEl = placesAttributionRef.current;

          const finish = (detail: google.maps.places.PlaceResult) => {
            const parsed = parsePlaceResult(detail);
            const line =
              detail.formatted_address?.trim() ||
              (parsed ? formatAustralianAddressLine(parsed) : '') ||
              detail.name?.trim() ||
              '';
            if (line) applyAddress(line);
          };

          if (placeId && attributionEl) {
            const service = new google.maps.places.PlacesService(attributionEl);
            service.getDetails(
              {
                placeId,
                fields: ['address_components', 'geometry', 'formatted_address', 'name'],
              },
              (detail, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && detail) {
                  finish(detail);
                  return;
                }
                finish(place);
              },
            );
            return;
          }

          finish(place);
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
  }, [mapsEnabled, applyAddress]);

  return (
    <div className={cn('space-y-1', className)}>
      <div ref={placesAttributionRef} className="hidden" aria-hidden />
      <div className="relative">
        {mapsEnabled ? (
          <MapPin
            className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4"
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          ref={inputRef}
          inputKind="property_address"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          className={mapsEnabled ? 'pl-9' : undefined}
        />
      </div>
      {mapsEnabled && !mapsReady && !mapsFailed ? (
        <p className="text-muted-foreground text-[11px]">Loading address search…</p>
      ) : null}
      {mapsFailed ? (
        <p className="text-amber-700 text-[11px] dark:text-amber-400">
          Map search unavailable — type the address manually.
        </p>
      ) : null}
    </div>
  );
}
