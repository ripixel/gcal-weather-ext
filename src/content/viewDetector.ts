export type CalendarView = 'day' | 'week' | 'schedule' | 'month' | 'other';

/**
 * Detects the active calendar view from the URL path. Google Calendar is an SPA,
 * so the path (e.g. /r/day, /r/week, /r/agenda) is the most stable signal.
 *
 * Path samples:
 *   /r              -> week (default)
 *   /r/day          -> day
 *   /r/week         -> week
 *   /r/customweek   -> week-like
 *   /r/month        -> month
 *   /r/agenda       -> schedule
 *   /r/custom...    -> treated per keyword
 */
export function detectView(): CalendarView {
  const path = location.pathname.toLowerCase();

  if (path.includes('/month')) return 'month';
  if (path.includes('/agenda') || path.includes('/schedule')) return 'schedule';
  if (path.includes('/day')) return 'day';
  if (path.includes('/week') || path === '/calendar/r' || path === '/calendar/r/')
    return 'week';
  if (path.includes('/custom')) return 'week';

  // Fallback: a week/day grid exposes column headers with datekeys.
  if (document.querySelector('[role="columnheader"][data-datekey]')) return 'week';

  return 'other';
}

/** True when the view is one where we render per-day badges. */
export function isBadgeableView(view: CalendarView): boolean {
  return view === 'day' || view === 'week' || view === 'schedule';
}
