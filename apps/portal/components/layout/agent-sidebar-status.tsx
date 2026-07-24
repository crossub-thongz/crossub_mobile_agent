'use client';

import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Loader2,
  Moon,
  Sun,
} from 'lucide-react';

import {
  SIDEBAR_DEFAULT_WEATHER,
  fetchSidebarWeather,
  formatSidebarDateTime,
  type SidebarWeatherSnapshot,
} from '@/lib/sidebar-weather';
import { cn } from '@/lib/utils';

function WeatherIcon({
  code,
  className,
}: {
  code: number;
  className?: string;
}) {
  if (code === 0) return <Sun className={className} />;
  if (code <= 3) return <CloudSun className={className} />;
  if (code <= 48) return <CloudFog className={className} />;
  if (code <= 67 || code >= 80) return <CloudRain className={className} />;
  if (code <= 77) return <Moon className={className} />;
  return <Cloud className={className} />;
}

function resolveWeatherLocation(): Promise<{
  latitude: number;
  longitude: number;
  label: string;
}> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(SIDEBAR_DEFAULT_WEATHER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: 'Your location',
        });
      },
      () => resolve(SIDEBAR_DEFAULT_WEATHER),
      { maximumAge: 15 * 60_000, timeout: 8_000 },
    );
  });
}

export function AgentSidebarStatus({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<SidebarWeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const location = await resolveWeatherLocation();
        const snapshot = await fetchSidebarWeather(
          location.latitude,
          location.longitude,
          location.label,
        );
        if (!cancelled) setWeather(snapshot);
      } catch {
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { date, time } = now ? formatSidebarDateTime(now) : { date: '—', time: '—' };

  return (
    <div
      className={cn(
        'border-border/70 border-b px-3 py-2.5',
        compact && 'px-2 group-hover/sidebar:px-3',
      )}
    >
      <div
        className={cn(
          'text-muted-foreground space-y-1 text-[11px] leading-snug',
          compact &&
            'max-h-0 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:max-h-24 group-hover/sidebar:opacity-100',
        )}
      >
        <p className="text-foreground font-medium tabular-nums">
          <span>{date}</span>
          <span className="text-muted-foreground mx-1.5">·</span>
          <span>{time}</span>
        </p>

        <div className="flex items-center gap-1.5">
          {weatherLoading ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin opacity-60" />
          ) : weather ? (
            <>
              <WeatherIcon code={weather.weatherCode} className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">
                {weather.temperatureC}°C · {weather.condition} · {weather.locationLabel}
              </span>
            </>
          ) : (
            <span className="truncate">Weather unavailable</span>
          )}
        </div>
      </div>

      {compact ? (
        <div className="flex flex-col items-center gap-1 group-hover/sidebar:hidden">
          <span className="text-foreground text-[10px] font-semibold tabular-nums">{time}</span>
          {weatherLoading ? (
            <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
          ) : weather ? (
            <div className="flex items-center gap-0.5">
              <WeatherIcon code={weather.weatherCode} className="size-3.5 text-primary" />
              <span className="text-muted-foreground text-[10px] font-medium tabular-nums">
                {weather.temperatureC}°
              </span>
            </div>
          ) : (
            <Cloud className="text-muted-foreground size-3.5 opacity-60" />
          )}
        </div>
      ) : null}
    </div>
  );
}
