import { getCachedForecast, getCachedGeocode } from '../lib/cache';
import { fetchForecast } from '../lib/weather';
import { geocode } from '../lib/geocode';
import type { WorkerRequest, WorkerResponse } from '../lib/types';

/**
 * Network + cache hub. All Open-Meteo traffic flows through here so that:
 *  - host_permissions cover requests (no page CORS surprises),
 *  - responses are cached and concurrent requests deduped,
 *  - the content script stays focused on the DOM.
 */
async function handle(request: WorkerRequest): Promise<WorkerResponse<unknown>> {
  try {
    switch (request.type) {
      case 'GET_FORECAST': {
        const data = await getCachedForecast(
          request.coords,
          request.units,
          () => fetchForecast(request.coords, request.units),
        );
        return { ok: true, data };
      }
      case 'GEOCODE': {
        const data = await getCachedGeocode(request.query, () =>
          geocode(request.query),
        );
        return { ok: true, data };
      }
      default: {
        const _exhaustive: never = request;
        return { ok: false, error: `Unknown request: ${JSON.stringify(_exhaustive)}` };
      }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  handle(request as WorkerRequest).then(sendResponse);
  // Return true to keep the message channel open for the async response.
  return true;
});

// Clicking the toolbar icon (no popup) opens the options page.
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// On first install, open the options page so the user can set a default
// location straight away (nothing renders until one is configured).
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
