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
 * The datekey packs the date into bit fields (verified against live markup,
 * e.g. 28879 = 2026-06-15, 28881 = 2026-06-17):
 *   bits 0-4  -> day of month (1-31)
 *   bits 5-8  -> month (1-indexed, 1-12)
 *   bits 9+   -> years since 1970
 *
 * This is locale-independent, which is why it is the primary date source.
 * Returns null if the decoded date looks implausible (guards a formula drift).
 */
export function decodeDateKey(datekey: number): string | null {
  const day = datekey & 0b11111;
  const month = (datekey >> 5) & 0b1111;
  const year = (datekey >> 9) + 1970;

  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const now = new Date().getFullYear();
  if (year < now - 2 || year > now + 2) return null;

  const mm = String(month).padStart(2, '0');
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
 * Finds the per-day header cells in day/week views. The date lives on a
 * `[data-datekey]` button *inside* each `[role="columnheader"]`; the badge is
 * anchored to the header's `<h2>` (or the columnheader itself) so it sits beside
 * the date number. Returns the injection parent paired with its date.
 */
export function findDayHeaders(): Array<{ el: HTMLElement; isoDate: string }> {
  const out: Array<{ el: HTMLElement; isoDate: string }> = [];
  const headers = document.querySelectorAll<HTMLElement>('[role="columnheader"]');
  const single = headers.length === 1;
  for (const header of headers) {
    // Week view: the date is on a [data-datekey] button inside the header.
    // Day view: the header has no datekey, so fall back to the grid cell's date
    // (matched by column index, or the sole grid date when there's one column).
    const keyed = header.querySelector<HTMLElement>('[data-datekey]');
    let iso = keyed ? isoDateForElement(keyed) : null;
    if (!iso) iso = dateFromGridColumn(header, single);
    if (!iso) continue;
    // Anchor to the columnheader itself; the badge is corner-positioned so it
    // sits inside the (short, clip-prone) header box rather than below it.
    out.push({ el: header, isoDate: iso });
  }
  return out;
}

/** Resolves a column header's date from the grid body (day-view fallback). */
function dateFromGridColumn(
  header: HTMLElement,
  singleColumn: boolean,
): string | null {
  const idx = header.getAttribute('data-column-index');
  let cell: HTMLElement | null = null;
  if (idx != null) {
    cell = document.querySelector<HTMLElement>(
      `[role="gridcell"][data-column-index="${CSS.escape(idx)}"][data-datekey]`,
    );
  }
  if (!cell && singleColumn) {
    cell = document.querySelector<HTMLElement>(
      '[role="gridcell"][data-datekey], li[data-datekey]',
    );
  }
  return cell ? isoDateForElement(cell) : null;
}

/**
 * Finds date-group headers in schedule (agenda) view. Each day is a
 * `<div role="rowgroup" data-datekey>` whose first `<h2>` is the date label; we
 * anchor the badge to that h2.
 */
export function findScheduleHeaders(): Array<{ el: HTMLElement; isoDate: string }> {
  const out: Array<{ el: HTMLElement; isoDate: string }> = [];
  const seen = new Set<string>();
  const groups = document.querySelectorAll<HTMLElement>(
    '[role="rowgroup"][data-datekey]',
  );
  for (const group of groups) {
    const iso = isoDateForElement(group);
    if (!iso || seen.has(iso)) continue;
    const h2 = group.querySelector<HTMLElement>('h2');
    if (!h2) continue;
    seen.add(iso);
    // Anchor to the date gridcell (h2's parent) so the badge stacks beneath the
    // date label instead of crowding the narrow date column inline.
    out.push({ el: h2.parentElement ?? h2, isoDate: iso });
  }
  return out;
}

/**
 * Finds rendered event chips. Chips are `[data-eventid]` containers; the same
 * event can nest several `data-eventid` nodes, so we keep only the outermost.
 * Each chip's date comes from its enclosing `[data-datekey]` grid column.
 */
export function findEventChips(): Array<{ el: HTMLElement; isoDate: string | null }> {
  const out: Array<{ el: HTMLElement; isoDate: string | null }> = [];
  const chips = document.querySelectorAll<HTMLElement>('[data-eventid]');
  for (const el of chips) {
    // Skip nested duplicates — only annotate the outermost chip node.
    if (el.parentElement?.closest('[data-eventid]')) continue;
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
  // Location text shows up in a few places depending on view:
  //  - week/day grid: a hidden `.XuJrye` a11y div on the chip,
  //  - schedule view: the aria-label of an inner [role="button"],
  //  - either: the chip's own aria-label.
  // All take the form "…, Location: <place>, <D Month YYYY>".
  const sources = [
    chip.querySelector<HTMLElement>('.XuJrye')?.textContent ?? '',
    chip.getAttribute('aria-label') ?? '',
    chip.querySelector('[aria-label*="Location:" i]')?.getAttribute('aria-label') ??
      '',
    chip.textContent ?? '',
  ];
  for (const text of sources) {
    const loc = guessLocationFromText(text);
    if (loc) return loc;
  }
  return null;
}

/**
 * Pulls a location out of an event's combined text, which takes the form
 * "…, Location: <place>, <date>" where <place> may itself contain commas (full
 * addresses) and <date> may be a single day or a range, e.g.:
 *   "Location: Holme Pierrepont, 21 June 2026"
 *   "Location: …, London, 23 – 24 June 2026"
 * We capture everything after "Location:" then strip any trailing date segments.
 */
export function guessLocationFromText(text: string): string | null {
  if (!text) return null;
  const m = text.match(/location:\s*(.+?)(?:[\n\r]|$)/i);
  if (!m) return null;
  return cleanLocation(m[1]);
}

/**
 * Tidies a raw location: drops trailing comma-segments that contain a 4-digit
 * year (the appended event date / date range), collapses empty segments, trims.
 */
function cleanLocation(raw: string): string | null {
  const parts = raw.split(',').map((s) => s.trim());
  while (parts.length > 1 && /\b(?:19|20)\d{2}\b/.test(parts[parts.length - 1])) {
    parts.pop();
  }
  const loc = parts.filter(Boolean).join(', ').trim();
  return loc.length > 1 ? loc : null;
}

const COUNTRY_RE =
  /^(united kingdom|uk|england|scotland|wales|northern ireland|ireland|united states|usa|us)$/i;

/**
 * Produces fallback geocoding queries for an address. Nominatim usually resolves
 * the full string directly, but if it doesn't (odd formatting, defunct POI) we
 * also try the postcode and the town. For
 * "Rutland Watersports, Bull Brigg Lane, Oakham, LE15 8BL, United Kingdom" this
 * yields the full string, then "LE15 8BL", then "Oakham". Deduped, in order.
 */
export function locationQueryCandidates(location: string): string[] {
  const parts = location
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const candidates = [location];

  const postcode = location.match(
    /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,
  )?.[0];
  if (postcode) candidates.push(postcode.trim());

  // Town guess: scan from the end for the first alphabetic, non-country segment
  // (skips the country and the postcode), e.g. "Oakham".
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/\d/.test(p) || COUNTRY_RE.test(p)) continue;
    candidates.push(p);
    break;
  }

  return [...new Set(candidates.filter((c) => c.length > 1))];
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
