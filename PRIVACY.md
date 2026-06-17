# Privacy Policy — Calendar Weather

_Last updated: 17 June 2026_

Calendar Weather is a browser extension that displays weather information inside
Google Calendar. This policy explains exactly what the extension does and does
not do with your data.

## Summary

The extension does **not** collect, store, sell, or transmit any personal data
to the developer or any analytics/tracking service. Everything runs locally in
your browser, except for the weather and geocoding lookups described below.

## What data the extension handles

- **Your settings** — your default location, preferred units, and which views to
  show badges in. These are stored using the browser's extension storage
  (`chrome.storage`) on your device / your browser's sync storage. They are never
  sent to the developer.
- **Location text** — the default location you enter, and the location text shown
  on calendar events you view. This is read only to look up a forecast.
- **Calendar page content** — the extension reads dates and event location text
  from the Google Calendar page in order to place weather badges. This data is
  used in-memory to render badges and is not stored or transmitted to the
  developer.

## Third-party services

To turn a location into a forecast, the extension sends requests to two
third-party services. Only the minimum needed for the lookup is sent:

- **Open-Meteo** (`api.open-meteo.com`) — receives coordinates (latitude and
  longitude) to return a weather forecast.
  Privacy: <https://open-meteo.com/en/terms>
- **Nominatim / OpenStreetMap** (`nominatim.openstreetmap.org`) — receives a
  location string (a place name, address, or postcode) to return coordinates.
  Privacy: <https://osmfoundation.org/wiki/Privacy_Policy>

These services receive only the location/coordinate values required to fulfil
the request. The extension does not send your identity, browsing history, or any
other calendar content to them. Lookups are cached locally to minimise requests.

## Data retention

- Settings remain until you change them or remove the extension.
- Cached forecast and geocoding results are stored locally with a limited
  lifetime and are cleared automatically; removing the extension deletes them.

## What the extension does NOT do

- No analytics, telemetry, advertising, or tracking.
- No selling or sharing of data with third parties (beyond the functional
  lookups above).
- No remotely hosted or remotely executed code — all logic ships inside the
  extension package.
- No account, sign-in, or access to your Google account or calendar data via any
  Google API; the extension only reads the page you are already viewing.

## Permissions, and why

- **Storage** — to save your settings and cache lookups locally.
- **Access to `calendar.google.com`** — to read dates/event locations on the page
  and inject weather badges.
- **Access to `api.open-meteo.com` and `nominatim.openstreetmap.org`** — to fetch
  forecasts and geocode locations.

## Changes to this policy

If this policy changes, the updated version will be published in this repository
with a new "Last updated" date.

## Contact

Questions about this policy can be raised via the project's GitHub repository:
<https://github.com/ripixel/gcal-weather-ext>
