import { browser } from 'wxt/browser';
import { type Lang, detectLang } from './i18n';

export interface Settings {
  globalEnabled: boolean;
  siteOverrides: Record<string, boolean>; // host (incl. port) -> enabled
  disabledCategories: string[];
  dictionary: string[];
  uiLanguage: 'auto' | 'en' | 'pt-br';
}

export const DEFAULT_SETTINGS: Settings = {
  globalEnabled: true,
  siteOverrides: {},
  disabledCategories: [],
  dictionary: [],
  uiLanguage: 'auto',
};

const KEY = 'inkly:settings';

function normalize(raw: unknown): Settings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return {
    globalEnabled: typeof o.globalEnabled === 'boolean' ? o.globalEnabled : DEFAULT_SETTINGS.globalEnabled,
    siteOverrides:
      o.siteOverrides && typeof o.siteOverrides === 'object' && !Array.isArray(o.siteOverrides)
        ? (o.siteOverrides as Record<string, boolean>)
        : {},
    disabledCategories: strArray(o.disabledCategories),
    dictionary: strArray(o.dictionary),
    uiLanguage:
      o.uiLanguage === 'en' || o.uiLanguage === 'pt-br' || o.uiLanguage === 'auto'
        ? o.uiLanguage
        : 'auto',
  };
}

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get(KEY);
  return normalize((stored as Record<string, unknown>)[KEY]);
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
      cb(normalize(changes[KEY].newValue));
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

export function isCategoryEnabled(s: Settings, category: string): boolean {
  return !s.disabledCategories.includes(category);
}

export function toggleCategory(s: Settings, category: string, enabled: boolean): Settings {
  const set = new Set(s.disabledCategories);
  if (enabled) set.delete(category);
  else set.add(category);
  return { ...s, disabledCategories: [...set] };
}

export function addWord(s: Settings, word: string): Settings {
  const w = word.trim().toLowerCase();
  if (!w || s.dictionary.includes(w)) return s;
  return { ...s, dictionary: [...s.dictionary, w] };
}

export function removeWord(s: Settings, word: string): Settings {
  const w = word.trim().toLowerCase();
  return { ...s, dictionary: s.dictionary.filter((x) => x !== w) };
}

export function effectiveLang(s: Settings, locale: string): Lang {
  return s.uiLanguage === 'auto' ? detectLang(locale) : s.uiLanguage;
}
