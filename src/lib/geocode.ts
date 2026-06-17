import type { GeocodeResult } from './types';

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

interface OpenMeteoGeocodeItem {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country_code?: string;
  country?: string;
}

interface OpenMeteoGeocodeResponse {
  results?: OpenMeteoGeocodeItem[];
}

/** Builds a human-friendly label from a geocoding result. */
function buildLabel(item: OpenMeteoGeocodeItem): string {
  return [item.name, item.admin1, item.country_code]
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolves a free-text place name to coordinates via Open-Meteo geocoding.
 * Returns the best (first) match, or null if nothing matched.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    name: trimmed,
    count: '1',
    language: 'en',
    format: 'json',
  });

  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status}`);
  }
  const json = (await res.json()) as OpenMeteoGeocodeResponse;
  const item = json.results?.[0];
  if (!item) return null;

  return {
    label: buildLabel(item),
    lat: item.latitude,
    lon: item.longitude,
  };
}
