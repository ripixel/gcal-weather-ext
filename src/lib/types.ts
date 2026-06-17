// Shared types used across the content script, options page, and service worker.

export type Units = 'metric' | 'imperial';

export interface Coords {
  lat: number;
  lon: number;
}

/** A resolved, geocoded location the user can pin as their default. */
export interface Location extends Coords {
  label: string;
}

export interface Settings {
  /** The user's home/default location. null until they set one. */
  defaultLocation: Location | null;
  units: Units;
  /** Which calendar views get per-day badges. Month is intentionally absent. */
  views: {
    day: boolean;
    week: boolean;
    schedule: boolean;
  };
  /** Whether to annotate events whose location differs from the default. */
  eventWeather: boolean;
}

/** Weather for a single calendar day at a single location. */
export interface DayWeather {
  /** ISO date, YYYY-MM-DD, in the location's local time. */
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  /** Max precipitation probability for the day, 0-100, if available. */
  precipProbability: number | null;
}

/** A full forecast keyed by ISO date for quick lookup. */
export interface Forecast {
  coords: Coords;
  units: Units;
  /** ISO date -> day weather. Only in-horizon dates are present. */
  days: Record<string, DayWeather>;
  /** When this forecast was fetched (epoch ms). */
  fetchedAt: number;
}

export interface GeocodeResult extends Location {}

// ---- Messaging between content script and service worker ----

export interface GetForecastRequest {
  type: 'GET_FORECAST';
  coords: Coords;
  units: Units;
}

export interface GeocodeRequest {
  type: 'GEOCODE';
  query: string;
}

export type WorkerRequest = GetForecastRequest | GeocodeRequest;

export interface WorkerOk<T> {
  ok: true;
  data: T;
}

export interface WorkerErr {
  ok: false;
  error: string;
}

export type WorkerResponse<T> = WorkerOk<T> | WorkerErr;
