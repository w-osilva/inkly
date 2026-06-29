import { describe, it, expect } from 'vitest';
import { isEnglishLang } from '../src/core/lang-detect';

describe('isEnglishLang', () => {
  it('treats empty/unknown as English (safe default)', () => {
    expect(isEnglishLang('')).toBe(true);
    expect(isEnglishLang(null)).toBe(true);
    expect(isEnglishLang(undefined)).toBe(true);
  });
  it('recognizes English tags (case/region-insensitive)', () => {
    expect(isEnglishLang('en')).toBe(true);
    expect(isEnglishLang('EN')).toBe(true);
    expect(isEnglishLang('en-US')).toBe(true);
    expect(isEnglishLang('en_GB')).toBe(true);
  });
  it('is false for non-English tags', () => {
    for (const t of ['pt', 'pt-BR', 'es', 'fr', 'de', 'ru', 'zh-CN']) {
      expect(isEnglishLang(t)).toBe(false);
    }
  });
});
