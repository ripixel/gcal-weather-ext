import { getSettings, saveSettings } from '../lib/settings';
import { requestGeocode } from '../lib/messaging';
import type { Units } from '../lib/types';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const locationInput = $<HTMLInputElement>('location-input');
const locationSearch = $<HTMLButtonElement>('location-search');
const locationStatus = $<HTMLParagraphElement>('location-status');
const saveStatus = $<HTMLParagraphElement>('save-status');
const viewDay = $<HTMLInputElement>('view-day');
const viewWeek = $<HTMLInputElement>('view-week');
const viewSchedule = $<HTMLInputElement>('view-schedule');
const eventWeather = $<HTMLInputElement>('event-weather');

function flashSaved(): void {
  saveStatus.textContent = 'Saved';
  window.clearTimeout(flashSaved.timer);
  flashSaved.timer = window.setTimeout(() => {
    saveStatus.textContent = '';
  }, 1500);
}
flashSaved.timer = 0;

function selectedUnits(): Units {
  const checked = document.querySelector<HTMLInputElement>(
    'input[name="units"]:checked',
  );
  return checked?.value === 'imperial' ? 'imperial' : 'metric';
}

async function init(): Promise<void> {
  const settings = await getSettings();

  if (settings.defaultLocation) {
    locationInput.value = settings.defaultLocation.label;
    locationStatus.textContent = `Saved: ${settings.defaultLocation.label}`;
    locationStatus.className = 'status ok';
  } else {
    // First run (e.g. opened automatically on install): nudge the user to set a
    // location, since nothing renders until one is configured.
    locationStatus.textContent = 'Set a default location to get started.';
    locationInput.focus();
  }

  const unitsRadio = document.querySelector<HTMLInputElement>(
    `input[name="units"][value="${settings.units}"]`,
  );
  if (unitsRadio) unitsRadio.checked = true;

  viewDay.checked = settings.views.day;
  viewWeek.checked = settings.views.week;
  viewSchedule.checked = settings.views.schedule;
  eventWeather.checked = settings.eventWeather;
}

async function searchLocation(): Promise<void> {
  const query = locationInput.value.trim();
  if (!query) return;

  locationSearch.disabled = true;
  locationStatus.textContent = 'Searching…';
  locationStatus.className = 'status';

  try {
    const result = await requestGeocode(query);
    if (!result) {
      locationStatus.textContent = `No match for "${query}".`;
      locationStatus.className = 'status err';
      return;
    }
    await saveSettings({ defaultLocation: result });
    locationInput.value = result.label;
    locationStatus.textContent = `Saved: ${result.label}`;
    locationStatus.className = 'status ok';
    flashSaved();
  } catch (err) {
    locationStatus.textContent =
      err instanceof Error ? err.message : 'Search failed.';
    locationStatus.className = 'status err';
  } finally {
    locationSearch.disabled = false;
  }
}

async function persistPrefs(): Promise<void> {
  await saveSettings({
    units: selectedUnits(),
    views: {
      day: viewDay.checked,
      week: viewWeek.checked,
      schedule: viewSchedule.checked,
    },
    eventWeather: eventWeather.checked,
  });
  flashSaved();
}

locationSearch.addEventListener('click', searchLocation);
locationInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchLocation();
});

for (const el of [viewDay, viewWeek, viewSchedule, eventWeather]) {
  el.addEventListener('change', persistPrefs);
}
for (const el of document.querySelectorAll('input[name="units"]')) {
  el.addEventListener('change', persistPrefs);
}

void init();
