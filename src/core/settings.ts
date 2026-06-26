import { browser } from 'wxt/browser';

export interface Settings {
  globalEnabled: boolean;
  siteOverrides: Record<string, boolean>; // host (incl. port) -> enabled
}

export const DEFAULT_SETTINGS: Settings = { globalEnabled: true, siteOverrides: {} };

const KEY = 'inkly:settings';

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get(KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[KEY] as Partial<Settings> | undefined) };
}

export async function setSettings(next: Settings): Promise<void> {
  await browser.storage.sync.set({ [KEY]: next });
}

/** Subscribe to settings changes; returns an unsubscribe fn. */
export function onSettingsChanged(cb: (s: Settings) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    area: string,
  ) => {
    if (area === 'sync' && changes[KEY]) {
      cb({ ...DEFAULT_SETTINGS, ...(changes[KEY].newValue as Partial<Settings> | undefined) });
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

export function isEnabledForHost(settings: Settings, host: string): boolean {
  if (host in settings.siteOverrides) return settings.siteOverrides[host];
  return settings.globalEnabled;
}
