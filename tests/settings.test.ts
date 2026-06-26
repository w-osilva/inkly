import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  DEFAULT_SETTINGS, getSettings, setSettings, hostOf, isEnabledForHost, type Settings,
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
  const base: Settings = { globalEnabled: true, siteOverrides: {} };
  it('falls back to globalEnabled when no override', () => {
    expect(isEnabledForHost(base, 'a.com')).toBe(true);
    expect(isEnabledForHost({ ...base, globalEnabled: false }, 'a.com')).toBe(false);
  });
  it('honors a per-site override over the global value', () => {
    expect(isEnabledForHost({ globalEnabled: true, siteOverrides: { 'a.com': false } }, 'a.com')).toBe(false);
    expect(isEnabledForHost({ globalEnabled: false, siteOverrides: { 'a.com': true } }, 'a.com')).toBe(true);
  });
});

describe('getSettings/setSettings', () => {
  it('returns defaults when storage is empty', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips and merges over defaults', async () => {
    await setSettings({ globalEnabled: false, siteOverrides: { 'x.com': true } });
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
