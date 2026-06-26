import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  DEFAULT_SETTINGS, getSettings, setSettings, hostOf, isEnabledForHost, type Settings,
  isCategoryEnabled, toggleCategory, addWord, removeWord, effectiveLang,
} from '../src/core/settings';

beforeEach(() => fakeBrowser.reset());

describe('hostOf', () => {
  it('extracts host (incl. port) from a URL', () => {
    expect(hostOf('https://mail.google.com/x')).toBe('mail.google.com');
    expect(hostOf('http://localhost:5193/a.html')).toBe('localhost:5193');
  });
  it('returns "" for an invalid/empty URL', () => {
    expect(hostOf('')).toBe('');
    expect(hostOf('not a url')).toBe('');
  });
});

describe('isEnabledForHost', () => {
  const base: Settings = { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '' };
  it('falls back to globalEnabled when no override', () => {
    expect(isEnabledForHost(base, 'a.com')).toBe(true);
    expect(isEnabledForHost({ ...base, globalEnabled: false }, 'a.com')).toBe(false);
  });
  it('honors a per-site override over the global value', () => {
    expect(isEnabledForHost({ ...base, siteOverrides: { 'a.com': false } }, 'a.com')).toBe(false);
    expect(isEnabledForHost({ ...base, globalEnabled: false, siteOverrides: { 'a.com': true } }, 'a.com')).toBe(true);
  });
});

describe('getSettings/setSettings', () => {
  it('returns defaults when storage is empty', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips and merges over defaults', async () => {
    await setSettings({ globalEnabled: false, siteOverrides: { 'x.com': true }, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '' });
    const s = await getSettings();
    expect(s.globalEnabled).toBe(false);
    expect(s.siteOverrides).toEqual({ 'x.com': true });
  });
});

describe('getSettings (malformed storage is normalized)', () => {
  it('fills missing siteOverrides with {}', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { globalEnabled: false } });
    const s = await getSettings();
    expect(s.globalEnabled).toBe(false);
    expect(s.siteOverrides).toEqual({});
    expect(() => isEnabledForHost(s, 'a.com')).not.toThrow();
  });
  it('replaces a null siteOverrides with {}', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: null } });
    const s = await getSettings();
    expect(s.siteOverrides).toEqual({});
    expect(isEnabledForHost(s, 'a.com')).toBe(true);
  });
  it('falls back to defaults for a non-object stored value', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': 'garbage' });
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settings: defaults include empty disabledCategories + dictionary', () => {
  it('getSettings fills new arrays when absent', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { globalEnabled: true } });
    const s = await getSettings();
    expect(s.disabledCategories).toEqual([]);
    expect(s.dictionary).toEqual([]);
  });
  it('normalizes non-array disabledCategories/dictionary to []', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { disabledCategories: 'x', dictionary: 5 } });
    const s = await getSettings();
    expect(s.disabledCategories).toEqual([]);
    expect(s.dictionary).toEqual([]);
  });
});

describe('category transforms', () => {
  const base = { globalEnabled: true, siteOverrides: {}, disabledCategories: [] as string[], dictionary: [] as string[], uiLanguage: 'auto' as const, defaultTone: '' };
  it('isCategoryEnabled is true unless disabled', () => {
    expect(isCategoryEnabled(base, 'Style')).toBe(true);
    expect(isCategoryEnabled({ ...base, disabledCategories: ['Style'] }, 'Style')).toBe(false);
  });
  it('toggleCategory adds/removes from disabledCategories', () => {
    const off = toggleCategory(base, 'Style', false);
    expect(off.disabledCategories).toEqual(['Style']);
    const on = toggleCategory(off, 'Style', true);
    expect(on.disabledCategories).toEqual([]);
  });
  it('toggleCategory is idempotent', () => {
    const off = toggleCategory(toggleCategory(base, 'Style', false), 'Style', false);
    expect(off.disabledCategories).toEqual(['Style']);
  });
});

describe('dictionary transforms', () => {
  const base = { globalEnabled: true, siteOverrides: {}, disabledCategories: [] as string[], dictionary: [] as string[], uiLanguage: 'auto' as const, defaultTone: '' };
  it('addWord stores lowercased, trimmed, deduped', () => {
    let s = addWord(base, '  Inkly ');
    expect(s.dictionary).toEqual(['inkly']);
    s = addWord(s, 'INKLY');
    expect(s.dictionary).toEqual(['inkly']);
  });
  it('addWord ignores empty', () => {
    expect(addWord(base, '   ').dictionary).toEqual([]);
  });
  it('removeWord removes case-insensitively', () => {
    const s = removeWord({ ...base, dictionary: ['inkly', 'foo'] }, 'INKLY');
    expect(s.dictionary).toEqual(['foo']);
  });
});

describe('uiLanguage', () => {
  it('defaults to "auto" and normalizes invalid values to "auto"', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { uiLanguage: 'klingon' } });
    expect((await getSettings()).uiLanguage).toBe('auto');
    await fakeBrowser.reset();
    expect((await getSettings()).uiLanguage).toBe('auto');
  });
  it('round-trips a valid uiLanguage', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { uiLanguage: 'pt-br' } });
    expect((await getSettings()).uiLanguage).toBe('pt-br');
  });
});

describe('defaultTone', () => {
  it('defaults to "" (neutral)', async () => {
    await fakeBrowser.reset();
    expect((await getSettings()).defaultTone).toBe('');
  });
  it('round-trips a tone', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { defaultTone: 'formal' } });
    expect((await getSettings()).defaultTone).toBe('formal');
  });
  it('normalizes a non-string defaultTone to ""', async () => {
    await fakeBrowser.storage.sync.set({ 'inkly:settings': { defaultTone: 42 } });
    expect((await getSettings()).defaultTone).toBe('');
  });
});

describe('effectiveLang', () => {
  const base = { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], defaultTone: '' };
  it('uses the explicit language when not auto', () => {
    expect(effectiveLang({ ...base, uiLanguage: 'pt-br' }, 'en-US')).toBe('pt-br');
    expect(effectiveLang({ ...base, uiLanguage: 'en' }, 'pt-BR')).toBe('en');
  });
  it('detects from locale when auto', () => {
    expect(effectiveLang({ ...base, uiLanguage: 'auto' }, 'pt-BR')).toBe('pt-br');
    expect(effectiveLang({ ...base, uiLanguage: 'auto' }, 'en-US')).toBe('en');
  });
});
