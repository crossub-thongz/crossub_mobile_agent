'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

import { propertyDetail } from '@/constants/routes';
import { getGoogleMapsApiKey, loadGoogleMaps } from '@/lib/google-places';
import type { Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

const DEFAULT_CENTER = { lat: -33.8688, lng: 151.2093 };
const DEFAULT_ZOOM = 11;

type MappableProperty = Property & { latitude: number; longitude: number };

function isMappable(property: Property): property is MappableProperty {
  return (
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    !Number.isNaN(property.latitude) &&
    !Number.isNaN(property.longitude)
  );
}

export function DashboardPropertiesMap({
  properties,
  embedded = false,
  showStats,
}: {
  properties: Property[];
  /** Fill parent grid cell height instead of fixed viewport height. */
  embedded?: boolean;
  /** Show the property-count line when embedded (e.g. dashboard map row). */
  showStats?: boolean;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const apiKey = getGoogleMapsApiKey();
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsFailed, setMapsFailed] = useState(false);

  const mappable = useMemo(() => properties.filter(isMappable), [properties]);
  const missingCoords = properties.length - mappable.length;

  useEffect(() => {
    if (!apiKey) {
      setMapsFailed(true);
      return;
    }
    let cancelled = false;
    void loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMapsReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapsReady || !mapContainerRef.current) return;

    void loadGoogleMaps().then(() => {
      if (!mapContainerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      for (const marker of markersRef.current) {
        marker.setMap(null);
      }
      markersRef.current = [];

      if (mappable.length === 0) {
        mapRef.current.setCenter(DEFAULT_CENTER);
        mapRef.current.setZoom(DEFAULT_ZOOM);
        google.maps.event.trigger(mapRef.current, 'resize');
        return;
      }

      const bounds = new google.maps.LatLngBounds();

      for (const property of mappable) {
        const position = { lat: property.latitude, lng: property.longitude };
        bounds.extend(position);

        const marker = new google.maps.Marker({
          map: mapRef.current!,
          position,
          title: formatPropertyFullAddress(property),
        });

        marker.addListener('click', () => {
          const href = propertyDetail(property.id);
          const address = formatPropertyFullAddress(property);
          const content = `
            <div style="font-family:system-ui,sans-serif;max-width:220px;padding:2px 0">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;line-height:1.35">${address}</p>
              <a href="${href}" style="font-size:12px;font-weight:600;color:#2563eb;text-decoration:none">Open property →</a>
            </div>
          `;
          infoWindowRef.current?.setContent(content);
          infoWindowRef.current?.open({ map: mapRef.current!, anchor: marker });
        });

        markersRef.current.push(marker);
      }

      if (mappable.length === 1) {
        mapRef.current.setCenter({
          lat: mappable[0].latitude,
          lng: mappable[0].longitude,
        });
        mapRef.current.setZoom(14);
      } else {
        mapRef.current.fitBounds(bounds, 48);
      }

      google.maps.event.trigger(mapRef.current, 'resize');
    });
  }, [mapsReady, mappable]);

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

  if (!apiKey || mapsFailed) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
        <MapPin className="text-muted-foreground mx-auto mb-2 size-8" />
        <p className="text-sm font-medium">Map unavailable</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Set <code className="text-foreground">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show
          property locations.
        </p>
      </div>
    );
  }

  return (
    <div className={embedded ? 'flex h-full min-h-0 flex-col gap-2' : 'space-y-2'}>
      <div
        className={
          embedded
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm'
            : 'overflow-hidden rounded-xl border bg-card shadow-sm'
        }
      >
        <div
          ref={mapContainerRef}
          className={
            embedded
              ? 'bg-muted/30 min-h-[180px] w-full flex-1'
              : 'bg-muted/30 h-[min(52vh,360px)] w-full min-h-[220px]'
          }
          aria-label="Portfolio properties map"
        />
      </div>
      {!embedded || showStats ? (
        <p className="text-muted-foreground text-xs">
        {mappable.length > 0 ? (
          <>
            <span className="text-foreground font-medium tabular-nums">{mappable.length}</span>
            {' '}
            propert{mappable.length === 1 ? 'y' : 'ies'} on map
            {missingCoords > 0 ? (
              <>
                {' '}
                · {missingCoords} without coordinates
              </>
            ) : null}
          </>
        ) : (
          'No properties with map coordinates yet — add locations when registering properties.'
        )}
      </p>
      ) : null}
    </div>
  );
}
