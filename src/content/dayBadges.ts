import type { Forecast, Settings } from '../lib/types';
import { isWithinHorizon } from '../lib/weather';
import { renderBadge, renderPlaceholder } from './badge';
import { findDayHeaders, findScheduleHeaders } from './selectors';
import type { CalendarView } from './viewDetector';

const DAY_KEY = 'day';

/**
 * Injects per-day weather badges into the header cells of the current view.
 * Idempotent: existing badges are updated in place, so it is safe to call on
 * every DOM mutation.
 */
export function renderDayBadges(
  view: CalendarView,
  forecast: Forecast | null,
  settings: Settings,
): void {
  if (!viewEnabled(view, settings)) return;
  if (!settings.defaultLocation) return;

  // Schedule rows stack the badge under the date; grid headers are short and
  // clip overflow, so the badge is corner-positioned inside the header box.
  const isSchedule = view === 'schedule';
  const placement = isSchedule ? 'block' : 'corner';
  const headers = isSchedule ? findScheduleHeaders() : findDayHeaders();

  for (const { el, isoDate } of headers) {
    if (!isWithinHorizon(isoDate)) {
      renderPlaceholder(el, DAY_KEY, placement);
      continue;
    }
    const day = forecast?.days[isoDate];
    if (day) {
      renderBadge(el, DAY_KEY, day, settings.units, {
        variant: 'day',
        placement,
        locationLabel: settings.defaultLocation.label,
      });
    } else {
      renderPlaceholder(el, DAY_KEY, placement);
    }
  }
}

function viewEnabled(view: CalendarView, settings: Settings): boolean {
  switch (view) {
    case 'day':
      return settings.views.day;
    case 'week':
      return settings.views.week;
    case 'schedule':
      return settings.views.schedule;
    default:
      return false;
  }
}
