const SYDNEY_TZ = 'Australia/Sydney';

export const SIDEBAR_DEFAULT_WEATHER = {
  latitude: -33.8688,
  longitude: 151.2093,
  label: 'Sydney',
} as const;

export type SidebarWeatherSnapshot = {
  temperatureC: number;
  condition: string;
  locationLabel: string;
  weatherCode: number;
};

const WMO_LABEL: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

export function sidebarWeatherCondition(code: number): string {
  return WMO_LABEL[code] ?? 'Cloudy';
}

export async function fetchSidebarWeather(
  latitude: number,
  longitude: number,
  locationLabel: string,
): Promise<SidebarWeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code',
    timezone: SYDNEY_TZ,
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Weather unavailable');

  const data = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const weatherCode = data.current?.weather_code ?? 3;
  const temperature = data.current?.temperature_2m;

  return {
    temperatureC: Math.round(temperature ?? 0),
    condition: sidebarWeatherCondition(weatherCode),
    locationLabel,
    weatherCode,
  };
}

export function formatSidebarDateTime(now: Date): { date: string; time: string } {
  return {
    date: now.toLocaleDateString('en-AU', {
      timeZone: SYDNEY_TZ,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: now.toLocaleTimeString('en-AU', {
      timeZone: SYDNEY_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}
