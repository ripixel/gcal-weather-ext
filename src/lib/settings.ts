import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  defaultLocation: null,
  units: 'metric',
  views: {
    day: true,
    week: true,
    schedule: true,
  },
  eventWeather: true,
};

const STORAGE_KEY = 'settings';

/** Reads settings from sync storage, merged over defaults. */
export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const partial = (stored[STORAGE_KEY] ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    views: { ...DEFAULT_SETTINGS.views, ...partial.views },
  };
}

/** Persists a partial settings patch, preserving the rest. */
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = {
    ...current,
    ...patch,
    views: { ...current.views, ...patch.views },
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}

/** Subscribes to settings changes; returns an unsubscribe function. */
export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
      cb({
        ...DEFAULT_SETTINGS,
        ...(changes[STORAGE_KEY].newValue as Partial<Settings>),
      });
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
