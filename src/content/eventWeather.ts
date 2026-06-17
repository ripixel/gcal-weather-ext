import type { Coords, Settings } from '../lib/types';
import { requestForecast, requestGeocode } from '../lib/messaging';
import { isWithinHorizon } from '../lib/weather';
import { renderBadge } from './badge';
import {
  extractChipLocation,
  extractPopoverLocation,
  findEventChips,
  findEventPopover,
  isoDateForPopover,
  MARKER_ATTR,
} from './selectors';

const EVENT_KEY = 'event';

/** ~1km rounding; events within this of the default location are skipped. */
function sameAsDefault(coords: Coords, def: Coords): boolean {
  return (
    coords.lat.toFixed(2) === def.lat.toFixed(2) &&
    coords.lon.toFixed(2) === def.lon.toFixed(2)
  );
}

/** Stable signature so we don't re-process an unchanged chip every mutation. */
function signature(location: string, isoDate: string): string {
  return `${location}@@${isoDate}`;
}

/**
 * Annotates events whose location differs from the user's default with that
 * location's weather. Chip-scraping is the primary path (many chips render the
 * location inline); the open popover is a richer secondary source.
 */
export async function renderEventWeather(settings: Settings): Promise<void> {
  if (!settings.eventWeather || !settings.defaultLocation) return;
  const def = settings.defaultLocation;

  const targets: Array<{
    el: HTMLElement;
    location: string;
    isoDate: string;
  }> = [];

  for (const { el, isoDate } of findEventChips()) {
    if (!isoDate) continue;
    const location = extractChipLocation(el);
    if (location) targets.push({ el, location, isoDate });
  }

  const popover = findEventPopover();
  if (popover) {
    const location = extractPopoverLocation(popover);
    const isoDate = isoDateForPopover(popover);
    if (location && isoDate) targets.push({ el: popover, location, isoDate });
  }

  await Promise.all(
    targets.map((t) => annotate(t.el, t.location, t.isoDate, def, settings)),
  );
}

async function annotate(
  el: HTMLElement,
  location: string,
  isoDate: string,
  def: Coords,
  settings: Settings,
): Promise<void> {
  if (!isWithinHorizon(isoDate)) return;

  // Skip if we've already rendered weather for this exact location+date.
  const sig = signature(location, isoDate);
  const existing = el.querySelector<HTMLElement>(`[${MARKER_ATTR}="${EVENT_KEY}"]`);
  if (existing?.dataset.gcwSig === sig) return;

  try {
    const geo = await requestGeocode(location);
    if (!geo) return;
    if (sameAsDefault(geo, def)) {
      existing?.remove();
      return;
    }

    const forecast = await requestForecast(geo, settings.units);
    const day = forecast.days[isoDate];
    if (!day) return;

    renderBadge(el, EVENT_KEY, day, settings.units, {
      variant: 'event',
      locationLabel: geo.label,
    });
    const badge = el.querySelector<HTMLElement>(`[${MARKER_ATTR}="${EVENT_KEY}"]`);
    if (badge) badge.dataset.gcwSig = sig;
  } catch {
    // Network/geocode hiccup — leave the event unannotated, try again later.
  }
}
