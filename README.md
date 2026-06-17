# Calendar Weather

A Chrome extension (Manifest V3) that overlays weather onto Google Calendar:

- A configurable **default location** (set in the options page).
- **Per-day weather** in the date headers of **day**, **week**, and **schedule**
  views. Month view is intentionally excluded (too cramped).
- **Per-event weather** for events whose location differs from your default —
  read directly from the event chip where the location is shown inline, with the
  event detail popover as a richer secondary source.

Weather data comes from [Open-Meteo](https://open-meteo.com/) (free, no API key);
geocoding uses [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/),
which resolves place names, full addresses, business/POI names, and postcodes.
All processing is client-side; there is no backend. Geocode lookups are cached
and throttled to respect Nominatim's usage policy.

## Build & install (unpacked)

```bash
npm install
npm run build          # type-checks, then builds to dist/
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/` folder.
4. Open the extension's **options** (click the toolbar icon, or via the
   extensions menu) and set your default location and units.
5. Open [Google Calendar](https://calendar.google.com) and switch to day, week,
   or schedule view.

For live development with HMR: `npm run dev`, then load `dist/` as above.

## How it works

```
src/
  background/service-worker.ts  Network + cache hub for all Open-Meteo traffic
  content/
    index.ts                    Orchestrates rendering on DOM/URL/settings change
    selectors.ts                ALL Google DOM coupling (the fragile bit)
    viewDetector.ts             day | week | schedule | month | other
    dayBadges.ts                Injects per-day header badges
    eventWeather.ts             Annotates events away from the default location
    badge.ts                    Idempotent badge DOM builder
  options/                      Settings UI (location, units, toggles)
  lib/                          weather, geocode, cache, settings, messaging, types
  styles/weather.css            Injected badge styles (gcw- prefix)
```

The content script watches for DOM mutations and SPA navigation (debounced),
detects the current view, fetches the forecast for your default location via the
service worker (cached, deduped), and injects/updates badges idempotently.

## Known limitations

- **Forecast horizon ~16 days.** Open-Meteo only forecasts ~today → 16 days
  ahead. Past dates and far-future dates show a muted `–` placeholder. There is
  no historical weather.
- **DOM scraping is fragile.** Google ships unannounced markup changes to
  Calendar. If badges stop appearing, the fix is almost always in
  [`src/content/selectors.ts`](src/content/selectors.ts) — particularly the
  `data-datekey` decoder and the header/chip selectors.
- **Event locations depend on what Calendar renders.** Most chips that have a
  location render it inline (which we parse), and the open popover exposes it via
  its maps link — but events with no rendered location can't be annotated without
  the Google Calendar API (deliberately not used here).
- **No icons in v0.1.** Chrome shows a default toolbar icon. Add an `icons/`
  folder and the corresponding manifest entries when artwork is ready.

## Tech

TypeScript + Vite, built for MV3 via
[`@crxjs/vite-plugin`](https://github.com/crxjs/chrome-extension-tools).
