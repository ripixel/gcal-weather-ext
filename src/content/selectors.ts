/**
 * ALL Google Calendar DOM coupling lives here. Google ships unannounced markup
 * changes, so when badges stop appearing this is the first (usually only) file
 * to update. Each lookup tries several candidate selectors and degrades safely.
 */

/** Marker attribute placed on every node we inject, for idempotent updates. */
export const MARKER_ATTR = 'data-gcw';

/**
 * Decodes Google Calendar's `data-datekey` integer into a calendar date.
 *
 * The datekey packs the date into bit fields:
 *   bits 0-4  -> day of month (1-31)
 *   bits 5-8  -> month (0-indexed, 0-11)
 *   bits 9+   -> years since 1970
 *
 * This is locale-independent, which is why it is the primary date source.
 * Returns null if the decoded date looks implausible (guards a formula drift).
 */
export function decodeDateKey(datekey: number): string | null {
  const day = datekey & 0b11111;
  const month = (datekey >> 5) & 0b1111;
  const year = (datekey >> 9) + 1970;

  if (day < 1 || day > 31 || month > 11) return null;
  const now = new Date().getFullYear();
  if (year < now - 2 || year > now + 2) return null;

  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Reads an ISO date from an element (or its closest ancestor) with a datekey. */
export function isoDateForElement(el: Element): string | null {
  const holder = el.closest<HTMLElement>('[data-datekey]');
  if (!holder) return null;
  const raw = holder.getAttribute('data-datekey');
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return decodeDateKey(num);
}

/**
 * Finds the per-day header cells in day/week views. These carry `data-datekey`
 * and `role="columnheader"`. Returns each header element paired with its date.
 */
export function findDayHeaders(): Array<{ el: HTMLElement; isoDate: string }> {
  const out: Array<{ el: HTMLElement; isoDate: string }> = [];
  const headers = document.querySelectorAll<HTMLElement>(
    '[role="columnheader"][data-datekey], h2[data-datekey], div[data-datekey][role="columnheader"]',
  );
  for (const el of headers) {
    const iso = isoDateForElement(el);
    if (iso) out.push({ el, isoDate: iso });
  }
  return out;
}

/**
 * Finds date-group headers in schedule (agenda) view. Each day's group is keyed
 * by `data-datekey`; we anchor the badge to the group's date label.
 */
export function findScheduleHeaders(): Array<{ el: HTMLElement; isoDate: string }> {
  const out: Array<{ el: HTMLElement; isoDate: string }> = [];
  const seen = new Set<string>();
  const groups = document.querySelectorAll<HTMLElement>(
    '[data-datekey] [role="heading"], [role="row"][data-datekey], [data-datekey][role="listitem"]',
  );
  for (const el of groups) {
    const iso = isoDateForElement(el);
    if (!iso || seen.has(iso)) continue;
    seen.add(iso);
    out.push({ el, isoDate: iso });
  }
  return out;
}

/**
 * Finds rendered event chips. Event chips are buttons with `data-eventid`.
 * Returns the chip plus its date (from the enclosing datekey column/row).
 */
export function findEventChips(): Array<{ el: HTMLElement; isoDate: string | null }> {
  const out: Array<{ el: HTMLElement; isoDate: string | null }> = [];
  const chips = document.querySelectorAll<HTMLElement>(
    '[data-eventid][role="button"], [role="button"][data-eventchip], [jslog][data-eventid]',
  );
  for (const el of chips) {
    out.push({ el, isoDate: isoDateForElement(el) });
  }
  return out;
}

/**
 * Best-effort extraction of an event's location text from its chip.
 *
 * Many chips render the location on its own line within the chip (confirmed in
 * day/week views). We read the chip's text/aria-label and try to isolate the
 * location line. Returns null when no location is visible on the chip.
 */
export function extractChipLocation(chip: HTMLElement): string | null {
  // The aria-label is the most structured source and usually contains an
  // explicit "Location: <place>" segment; the visible text is the fallback.
  const aria = chip.getAttribute('aria-label') ?? '';
  const text = chip.textContent ?? '';
  return guessLocationFromText(aria) ?? guessLocationFromText(text);
}

/**
 * Heuristically pulls a location out of an event's combined text. Chip text is
 * roughly: "<title>, <time>, Location: <place>" in aria-labels, or title/time/
 * place on separate lines in the visible chip. We look for an explicit
 * "Location:" marker first, then fall back to a trailing address-like line.
 */
export function guessLocationFromText(text: string): string | null {
  if (!text) return null;

  const locMatch = text.match(/location:\s*(.+?)(?:[\n\r]|$)/i);
  if (locMatch) {
    const loc = locMatch[1].trim();
    return loc.length > 1 ? loc : null;
  }
  return null;
}

/** Finds the open event detail popover/dialog, if any. */
export function findEventPopover(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[role="dialog"][aria-modal="true"], [role="dialog"]',
  );
}

/**
 * Extracts the location text from an open event popover. The popover renders the
 * location next to a place/map icon; we look for the map link or a labelled row.
 */
export function extractPopoverLocation(popover: HTMLElement): string | null {
  // A maps link is the most reliable signal.
  const mapsLink = popover.querySelector<HTMLAnchorElement>(
    'a[href*="google.com/maps"], a[href*="maps.google"]',
  );
  if (mapsLink) {
    const txt = mapsLink.textContent?.trim();
    if (txt) return txt;
    const q = new URL(mapsLink.href).searchParams.get('q');
    if (q) return decodeURIComponent(q);
  }
  return null;
}

/** Reads the ISO date for an open popover from its associated event chip. */
export function isoDateForPopover(popover: HTMLElement): string | null {
  const eventId =
    popover.getAttribute('data-eventid') ??
    popover.querySelector('[data-eventid]')?.getAttribute('data-eventid');
  if (eventId) {
    const chip = document.querySelector<HTMLElement>(
      `[data-eventid="${CSS.escape(eventId)}"]`,
    );
    if (chip) {
      const iso = isoDateForElement(chip);
      if (iso) return iso;
    }
  }
  return null;
}
