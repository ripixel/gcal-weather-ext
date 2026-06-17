export type CalendarView = 'day' | 'week' | 'schedule' | 'month' | 'other';

/**
 * Detects the active calendar view. Google Calendar is an SPA; the view keyword
 * follows `/r/` in the path (e.g. /calendar/u/0/r/week/2026/6/15), so we read the
 * segment right after `/r/`. Bare `/r` defaults to week. DOM checks back it up.
 */
export function detectView(): CalendarView {
  const path = location.pathname.toLowerCase();
  const seg = path.match(/\/r\/([a-z]+)/)?.[1];

  switch (seg) {
    case 'month':
      return 'month';
    case 'year':
      return 'other';
    case 'agenda':
    case 'schedule':
      return 'schedule';
    case 'day':
      return 'day';
    case 'week':
    case 'customweek':
    case 'custom':
    case 'customday':
      return 'week';
  }

  // Bare `/r` (opening Calendar lands here) or an unknown segment carries no
  // view hint, so infer from the DOM — the user's default view may be anything.
  return detectViewFromDom();
}

/**
 * Infers the view from DOM structure, exploiting a useful asymmetry:
 *  - schedule: events are grouped in `[role="rowgroup"][data-datekey]`,
 *  - week (and multi-day): several columnheaders, each with a `[data-datekey]`,
 *  - day: exactly one columnheader (its date lives on grid cells, not the header),
 *  - month: seven weekday-name columnheaders, none carrying a date.
 */
function detectViewFromDom(): CalendarView {
  if (document.querySelector('[role="rowgroup"][data-datekey]')) return 'schedule';

  const headers = [...document.querySelectorAll('[role="columnheader"]')];
  const datedHeaders = headers.filter((h) =>
    h.querySelector('[data-datekey]'),
  );
  if (datedHeaders.length > 1) return 'week';
  if (headers.length === 1) return 'day';
  if (headers.length > 1) return 'month';

  return 'other';
}

/** True when the view is one where we render per-day badges. */
export function isBadgeableView(view: CalendarView): boolean {
  return view === 'day' || view === 'week' || view === 'schedule';
}
