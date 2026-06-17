import type { Coords, DayWeather, Forecast, Units } from './types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Open-Meteo forecast horizon. The free API supports up to 16 forecast days.
 * Dates outside [today, today + HORIZON_DAYS] have no data.
 */
export const HORIZON_DAYS = 16;

interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max?: (number | null)[];
}

interface OpenMeteoResponse {
  daily: OpenMeteoDaily;
}

/** Fetches a daily forecast for the given coords and units from Open-Meteo. */
export async function fetchForecast(
  coords: Coords,
  units: Units,
): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: units === 'imperial' ? 'mph' : 'kmh',
    timezone: 'auto',
    forecast_days: String(HORIZON_DAYS),
  });

  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Forecast request failed: ${res.status}`);
  }
  const json = (await res.json()) as OpenMeteoResponse;
  const daily = json.daily;

  const days: Record<string, DayWeather> = {};
  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    days[date] = {
      date,
      weatherCode: daily.weather_code[i],
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      precipProbability: daily.precipitation_probability_max?.[i] ?? null,
    };
  }

  return { coords, units, days, fetchedAt: Date.now() };
}

/** Returns true if the given ISO date is within the forecast horizon. */
export function isWithinHorizon(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00`);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86_400_000,
  );
  return diffDays >= 0 && diffDays < HORIZON_DAYS;
}

interface WeatherDescriptor {
  icon: string;
  label: string;
}

/**
 * Maps a WMO weather code to an emoji icon and a short label.
 * Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes).
 */
export function describeWeatherCode(code: number): WeatherDescriptor {
  switch (code) {
    case 0:
      return { icon: '☀️', label: 'Clear sky' };
    case 1:
      return { icon: '🌤️', label: 'Mainly clear' };
    case 2:
      return { icon: '⛅', label: 'Partly cloudy' };
    case 3:
      return { icon: '☁️', label: 'Overcast' };
    case 45:
    case 48:
      return { icon: '🌫️', label: 'Fog' };
    case 51:
    case 53:
    case 55:
      return { icon: '🌦️', label: 'Drizzle' };
    case 56:
    case 57:
      return { icon: '🌧️', label: 'Freezing drizzle' };
    case 61:
    case 63:
    case 65:
      return { icon: '🌧️', label: 'Rain' };
    case 66:
    case 67:
      return { icon: '🌧️', label: 'Freezing rain' };
    case 71:
    case 73:
    case 75:
      return { icon: '🌨️', label: 'Snow' };
    case 77:
      return { icon: '🌨️', label: 'Snow grains' };
    case 80:
    case 81:
    case 82:
      return { icon: '🌦️', label: 'Rain showers' };
    case 85:
    case 86:
      return { icon: '🌨️', label: 'Snow showers' };
    case 95:
      return { icon: '⛈️', label: 'Thunderstorm' };
    case 96:
    case 99:
      return { icon: '⛈️', label: 'Thunderstorm with hail' };
    default:
      return { icon: '🌡️', label: 'Unknown' };
  }
}

/** Degree symbol for the active units. */
export function unitSymbol(units: Units): string {
  return units === 'imperial' ? '°F' : '°C';
}
