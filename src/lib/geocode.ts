import type { GeocodeResult } from './types';

// Nominatim (OpenStreetMap) resolves full addresses, business/POI names, and
// postcodes — unlike place-name-only geocoders — which matters for event
// locations like "Rutland Watersports, Oakham" or "LE15 8BL". Results are
// cached aggressively (see cache.ts) to stay well within Nominatim's usage
// policy for light, personal use.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  county?: string;
  state?: string;
  country_code?: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: NominatimAddress;
}

// Nominatim's usage policy asks for at most one request per second. We serialise
// network calls through a promise chain with a minimum spacing so a burst (e.g.
// a schedule view with many distinct event locations) stays polite. Cache hits
// never reach here, so this only paces genuine network lookups.
const MIN_INTERVAL_MS = 1100;
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  chain = run.catch(() => undefined);
  return run;
}

/** Builds a concise label (locality + region + country) from a result. */
function buildLabel(item: NominatimItem): string {
  const a = item.address ?? {};
  const locality =
    a.city ??
    a.town ??
    a.village ??
    a.hamlet ??
    a.suburb ??
    item.name ??
    item.display_name.split(',')[0];
  const region = a.county ?? a.state;
  const country = a.country_code?.toUpperCase();
  return [locality, region, country].filter(Boolean).join(', ');
}

/**
 * Resolves free-text (place name, address, business, or postcode) to
 * coordinates via Nominatim. Returns the best match, or null if nothing matched.
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  });

  const res = await throttle(() =>
    fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    }),
  );
  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status}`);
  }
  const json = (await res.json()) as NominatimItem[];
  const item = json[0];
  if (!item) return null;

  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { label: buildLabel(item), lat, lon };
}
