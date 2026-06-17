import type { DayWeather, Units } from '../lib/types';
import { describeWeatherCode, unitSymbol } from '../lib/weather';
import { MARKER_ATTR } from './selectors';

/** Builds the human-readable tooltip for a day's weather. */
function tooltip(day: DayWeather, units: Units, locationLabel?: string): string {
  const { label } = describeWeatherCode(day.weatherCode);
  const sym = unitSymbol(units);
  const parts = [
    locationLabel,
    `${label}`,
    `High ${day.tempMax}${sym}, Low ${day.tempMin}${sym}`,
  ];
  if (day.precipProbability != null) {
    parts.push(`${day.precipProbability}% precip`);
  }
  return parts.filter(Boolean).join(' · ');
}

/**
 * Creates or updates a weather badge element. The `key` uniquely identifies the
 * badge's purpose (e.g. a date or event id) so repeated renders update in place
 * rather than duplicating.
 */
export function renderBadge(
  parent: HTMLElement,
  key: string,
  day: DayWeather,
  units: Units,
  opts: { variant?: 'day' | 'event'; locationLabel?: string } = {},
): void {
  const variant = opts.variant ?? 'day';
  let badge = parent.querySelector<HTMLElement>(
    `:scope > [${MARKER_ATTR}="${CSS.escape(key)}"]`,
  );
  if (!badge) {
    badge = document.createElement('span');
    badge.setAttribute(MARKER_ATTR, key);
    parent.appendChild(badge);
  }

  const { icon } = describeWeatherCode(day.weatherCode);
  const text = `${icon} ${day.tempMax}°/${day.tempMin}°`;
  const title = tooltip(day, units, opts.locationLabel);
  const className = `gcw-badge gcw-badge--${variant}`;

  // Skip writes when nothing changed — otherwise our own DOM updates would
  // retrigger the MutationObserver and loop. This keeps the steady state quiet.
  if (
    badge.textContent === text &&
    badge.title === title &&
    badge.className === className
  ) {
    return;
  }
  badge.className = className;
  badge.title = title;
  badge.textContent = text;
  badge.setAttribute('aria-label', title);
}

/** Renders a muted placeholder for dates outside the forecast horizon. */
export function renderPlaceholder(parent: HTMLElement, key: string): void {
  let badge = parent.querySelector<HTMLElement>(
    `:scope > [${MARKER_ATTR}="${CSS.escape(key)}"]`,
  );
  if (!badge) {
    badge = document.createElement('span');
    badge.setAttribute(MARKER_ATTR, key);
    parent.appendChild(badge);
  }
  if (badge.classList.contains('gcw-badge--empty') && badge.textContent === '–') {
    return;
  }
  badge.className = 'gcw-badge gcw-badge--empty';
  badge.title = 'No forecast available for this date';
  badge.textContent = '–';
  badge.removeAttribute('aria-label');
}

/** Removes any badge with the given key under parent (used when toggled off). */
export function removeBadge(parent: HTMLElement, key: string): void {
  parent
    .querySelector<HTMLElement>(`:scope > [${MARKER_ATTR}="${CSS.escape(key)}"]`)
    ?.remove();
}
