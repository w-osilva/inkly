import { browser } from 'wxt/browser';
import { type Lang, detectLang } from './i18n';
import { DEFAULT_CORRECTION_ORDER, normalizeOrder } from './tools';

export type ThemePref = 'auto' | 'light' | 'dark';

export interface Settings {
  globalEnabled: boolean;
  siteOverrides: Record<string, boolean>; // host (incl. port) -> enabled
  disabledCategories: string[];
  dictionary: string[];
  uiLanguage: 'auto' | 'en' | 'pt-br';
  defaultTone: string;
  /** Default rewrite style modifiers (confident/technical/persuasive/simple). */
  defaultStyles: string[];
  /** Default rewrite length: 'asis' | 'shorter' | 'longer'. */
  defaultLength: string;
  theme: ThemePref;
  /** Correction tools in PRIORITY order (first wins overlaps); see core/tools.ts. */
  correctionOrder: string[];
  /** Correction tool ids the user turned off (default: all on). */
  correctionDisabled: string[];
  /** Selection-toolbar action ids the user turned off (default: all on). */
  selectionActionsDisabled: string[];
  /** LanguageTool API base (…/v2). Public API by default; point to a self-hosted server for privacy. */
  languageToolEndpoint: string;
}

export const DEFAULT_LT_ENDPOINT = 'https://api.languagetool.org/v2';

export const DEFAULT_SETTINGS: Settings = {
  globalEnabled: true,
  siteOverrides: {},
  disabledCategories: [],
  dictionary: [],
  uiLanguage: 'auto',
  defaultTone: '',
  defaultStyles: [],
  defaultLength: 'asis',
  theme: 'auto',
  correctionOrder: [...DEFAULT_CORRECTION_ORDER],
  correctionDisabled: [],
  selectionActionsDisabled: [],
  languageToolEndpoint: DEFAULT_LT_ENDPOINT,
};

const KEY = 'inkly:settings';

/** Is a correction tool active? (default on unless the user disabled it.) */
export function isToolEnabled(s: Settings, toolId: string): boolean {
  return !s.correctionDisabled.includes(toolId);
}
/** Is a selection action shown in the toolbar? (default on unless disabled.) */
export function isActionEnabled(s: Settings, action: string): boolean {
  return !s.selectionActionsDisabled.includes(action);
}

function normalize(raw: unknown): Settings {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  // Migrate the legacy flags into the unified disabled-list when the new field is absent.
  let correctionDisabled = strArray(o.correctionDisabled);
  if (o.correctionDisabled === undefined) {
    if (o.autoSuggest === false) correctionDisabled.push('aiImprove');
    if (o.languageToolEnabled === false) correctionDisabled.push('languagetool');
  }
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
    defaultTone: typeof o.defaultTone === 'string' ? o.defaultTone : '',
    defaultStyles: strArray(o.defaultStyles),
    defaultLength: o.defaultLength === 'shorter' || o.defaultLength === 'longer' ? o.defaultLength : 'asis',
    theme: o.theme === 'light' || o.theme === 'dark' || o.theme === 'auto' ? o.theme : 'auto',
    correctionOrder: normalizeOrder(o.correctionOrder),
    correctionDisabled,
    selectionActionsDisabled: strArray(o.selectionActionsDisabled),
    languageToolEndpoint: typeof o.languageToolEndpoint === 'string' && o.languageToolEndpoint ? o.languageToolEndpoint : DEFAULT_LT_ENDPOINT,
  };
}

/** Apply a theme preference to an element via the data attribute the tokens read. */
export function applyTheme(el: HTMLElement, theme: ThemePref): void {
  if (theme === 'auto') el.removeAttribute('data-inkly-theme');
  else el.setAttribute('data-inkly-theme', theme);
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
