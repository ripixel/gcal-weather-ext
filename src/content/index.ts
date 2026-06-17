import { getSettings, onSettingsChanged } from '../lib/settings';
import { requestForecast } from '../lib/messaging';
import type { Forecast, Settings } from '../lib/types';
import { renderDayBadges } from './dayBadges';
import { renderEventWeather } from './eventWeather';
import { detectView, isBadgeableView } from './viewDetector';

let settings: Settings;
let defaultForecast: Forecast | null = null;
let lastForecastKey = '';

/** Ensures we have a forecast for the default location at the active units. */
async function ensureDefaultForecast(): Promise<void> {
  if (!settings.defaultLocation) {
    defaultForecast = null;
    return;
  }
  const { lat, lon } = settings.defaultLocation;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}:${settings.units}`;
  if (key === lastForecastKey && defaultForecast) return;
  try {
    defaultForecast = await requestForecast(
      { lat, lon },
      settings.units,
    );
    lastForecastKey = key;
  } catch {
    defaultForecast = null;
  }
}

async function render(): Promise<void> {
  const view = detectView();
  if (isBadgeableView(view)) {
    await ensureDefaultForecast();
    renderDayBadges(view, defaultForecast, settings);
  }
  // Event weather applies across views wherever chips/popovers appear.
  void renderEventWeather(settings);
}

/** Debounces bursts of DOM mutations into a single render pass. */
function debounce(fn: () => void, ms: number): () => void {
  let timer = 0;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  };
}

async function main(): Promise<void> {
  settings = await getSettings();

  const scheduleRender = debounce(() => void render(), 250);

  // Re-render on DOM changes (SPA re-renders, navigation, popovers).
  const observer = new MutationObserver(scheduleRender);
  observer.observe(document.body, { childList: true, subtree: true });

  // Re-render on settings changes (forecast key may change → refetch).
  onSettingsChanged((next) => {
    settings = next;
    lastForecastKey = '';
    scheduleRender();
  });

  // Re-render on SPA URL changes (view switches don't reload the page).
  let lastPath = location.pathname;
  window.setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      scheduleRender();
    }
  }, 500);

  void render();
}

void main();
