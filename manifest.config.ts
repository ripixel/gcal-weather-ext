import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Calendar Weather',
  description:
    'Shows weather in Google Calendar day, week, and schedule views, plus weather for events away from your default location.',
  version: pkg.version,
  // No icons shipped in v0.1 — Chrome uses a default. Add icons/ + manifest
  // `icons`/`action.default_icon` entries when artwork is ready.
  action: {
    default_title: 'Calendar Weather settings',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://calendar.google.com/*'],
      js: ['src/content/index.ts'],
      css: ['src/styles/weather.css'],
      run_at: 'document_idle',
    },
  ],
  options_ui: {
    page: 'src/options/options.html',
    open_in_tab: true,
  },
  permissions: ['storage'],
  host_permissions: [
    'https://api.open-meteo.com/*',
    'https://nominatim.openstreetmap.org/*',
  ],
});
