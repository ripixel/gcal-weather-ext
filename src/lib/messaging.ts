import type {
  Coords,
  Forecast,
  GeocodeResult,
  Units,
  WorkerRequest,
  WorkerResponse,
} from './types';

/** Sends a typed request to the service worker and unwraps the response. */
async function send<T>(request: WorkerRequest): Promise<T> {
  const response = (await chrome.runtime.sendMessage(
    request,
  )) as WorkerResponse<T>;
  if (!response) {
    throw new Error('No response from service worker');
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.data;
}

export function requestForecast(
  coords: Coords,
  units: Units,
): Promise<Forecast> {
  return send<Forecast>({ type: 'GET_FORECAST', coords, units });
}

export function requestGeocode(query: string): Promise<GeocodeResult | null> {
  return send<GeocodeResult | null>({ type: 'GEOCODE', query });
}
