import type { Coords, Forecast, GeocodeResult, Units } from './types';

const FORECAST_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Rounds coords so nearby requests share a cache entry (~1km granularity). */
function coordKey(coords: Coords, units: Units): string {
  return `forecast:${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}:${units}`;
}

function geocodeKey(query: string): string {
  return `geocode:${query.trim().toLowerCase()}`;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

async function readEntry<T>(key: string): Promise<T | null> {
  const stored = await chrome.storage.local.get(key);
  const entry = stored[key] as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    await chrome.storage.local.remove(key);
    return null;
  }
  return entry.value;
}

async function writeEntry<T>(key: string, value: T, ttl: number): Promise<void> {
  const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttl };
  await chrome.storage.local.set({ [key]: entry });
}

// In-flight request dedupe: concurrent callers share one promise.
const inFlight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = factory().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** Returns a cached forecast or fetches+caches via the provided loader. */
export function getCachedForecast(
  coords: Coords,
  units: Units,
  loader: () => Promise<Forecast>,
): Promise<Forecast> {
  const key = coordKey(coords, units);
  return dedupe(key, async () => {
    const cached = await readEntry<Forecast>(key);
    if (cached) return cached;
    const fresh = await loader();
    await writeEntry(key, fresh, FORECAST_TTL_MS);
    return fresh;
  });
}

/** Returns a cached geocode result (including a cached "no match" null). */
export function getCachedGeocode(
  query: string,
  loader: () => Promise<GeocodeResult | null>,
): Promise<GeocodeResult | null> {
  const key = geocodeKey(query);
  return dedupe(key, async () => {
    const cached = await readEntry<{ result: GeocodeResult | null }>(key);
    if (cached) return cached.result;
    const fresh = await loader();
    await writeEntry(key, { result: fresh }, GEOCODE_TTL_MS);
    return fresh;
  });
}
