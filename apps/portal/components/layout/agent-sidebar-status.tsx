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

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export function AgentSidebarStatus({
  compact = false,
  variant = 'sidebar',
  className,
}: {
  compact?: boolean;
  variant?: 'sidebar' | 'header';
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<SidebarWeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  if (variant === 'header') {
    return (
      <div className={cn('hidden min-w-0 shrink-0 text-right lg:block', className)}>
        <p className="text-foreground truncate text-xs font-medium leading-tight tabular-nums">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal={false}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'rounded-sm text-left transition-colors',
                  'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                )}
                aria-label="Open calendar"
              >
                {date}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="end"
              side="bottom"
              sideOffset={6}
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <Calendar
                mode="single"
                selected={now ?? undefined}
                defaultMonth={now ?? undefined}
                onSelect={() => setCalendarOpen(false)}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground mx-1">·</span>
          <span>{time}</span>
        </p>
        <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center justify-end gap-1 text-[11px] leading-tight">
          {weatherLoading ? (
            <Loader2 className="size-3 shrink-0 animate-spin opacity-60" />
          ) : weather ? (
            <>
              <WeatherIcon code={weather.weatherCode} className="size-3 shrink-0 text-primary" />
              <span className="truncate">
                {weather.temperatureC}°C · {weather.condition}
              </span>
            </>
          ) : (
            <span className="truncate">Weather unavailable</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-w-0',
        compact &&
          'max-w-0 flex-1 overflow-hidden opacity-0 transition-all duration-200 group-hover/sidebar:max-w-none group-hover/sidebar:opacity-100',
        className,
      )}
    >
      <p className="text-foreground truncate text-[10px] font-medium leading-tight tabular-nums">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal={false}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'rounded-sm text-left transition-colors',
                'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              )}
              aria-label="Open calendar"
            >
              {date}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start"
            side="bottom"
            sideOffset={6}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <Calendar
              mode="single"
              selected={now ?? undefined}
              defaultMonth={now ?? undefined}
              onSelect={() => setCalendarOpen(false)}
            />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground mx-1">·</span>
        <span>{time}</span>
      </p>

      <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-[10px] leading-tight">
        {weatherLoading ? (
          <Loader2 className="size-3 shrink-0 animate-spin opacity-60" />
        ) : weather ? (
          <>
            <WeatherIcon code={weather.weatherCode} className="size-3 shrink-0 text-primary" />
            <span className="truncate">
              {weather.temperatureC}°C · {weather.condition}
            </span>
          </>
        ) : (
          <span className="truncate">Weather unavailable</span>
        )}
      </div>
    </div>
  );
}
