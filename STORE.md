# Chrome Web Store submission

## Build the upload artifact

```bash
npm run package
```

This builds `dist/` and writes `gcal-weather-<version>.zip` (manifest at the zip
root, no source maps). Upload that zip in the Developer Dashboard.

Bump `version` in `package.json` before each new upload — the Web Store rejects a
re-upload with an unchanged version. The manifest version is derived from it.

## Developer Dashboard steps

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time US$5 registration fee if you don't have a developer account).
2. **Add new item** → upload the zip.
3. Fill in the listing (see below), add screenshots, save, then **Submit for review**.

## Listing copy

**Name:** Calendar Weather

**Summary (short):** Weather in your Google Calendar day, week, and schedule
views, plus weather for events away from home.

**Description:**
> Calendar Weather overlays the forecast onto Google Calendar.
>
> • Set a default location and see each day's weather in day, week, and schedule
>   views.
> • Events with their own location (an address, business, or postcode) show that
>   place's weather when it differs from your default.
> • Clean, native-looking badges. No account, no sign-in.
>
> Weather data: Open-Meteo. Geocoding: OpenStreetMap / Nominatim.

**Category:** Productivity

**Language:** English

## Required assets

- **Store icon:** 128×128 — `icons/icon-128.png` (already in the package).
- **Screenshots:** at least one, 1280×800 or 640×400 PNG/JPEG. Capture week view
  and the schedule/event badges.
- (Optional) Small promo tile 440×280.

## Privacy & permissions (you must declare these)

- **Single purpose:** Display weather information inside Google Calendar.
- **`storage`:** stores the user's settings (default location, units, toggles).
- **Host `https://api.open-meteo.com/*`:** fetch weather forecasts.
- **Host `https://nominatim.openstreetmap.org/*`:** convert location text to
  coordinates (geocoding).
- **Content script on `https://calendar.google.com/*`:** read dates/event
  locations from the page and inject weather badges.
- **Data usage:** the extension does **not** collect, store, or transmit any
  personal data to the developer. Location text from settings/events is sent only
  to the weather/geocoding APIs above to fetch a forecast. No analytics, no
  tracking. You'll select the corresponding "data not collected" declarations and
  certify compliance.
- **Privacy policy URL:** the dashboard requires one. Use the published
  [PRIVACY.md](PRIVACY.md) — e.g. its GitHub URL, or a GitHub Pages link.

## Pre-submit checklist

- [ ] `npm run package` succeeds; zip has `manifest.json` at its root.
- [ ] `version` bumped since the last upload.
- [ ] Loaded the zip's `dist/` unpacked once and smoke-tested week/day/schedule.
- [ ] Screenshots captured at a supported size.
- [ ] Privacy policy URL ready ([PRIVACY.md](PRIVACY.md)).
