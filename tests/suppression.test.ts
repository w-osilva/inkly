import { describe, it, expect } from 'vitest';
import { isSuppressed, isDictionaryCategory } from '../src/core/suppression';
import { makeSuggestion } from '../src/core/types';

const noCats = new Set<string>();
const noDict = new Set<string>();

describe('isSuppressed', () => {
  it('suppresses a suggestion whose category is disabled', () => {
    const s = makeSuggestion({ offset: 0, length: 3, category: 'Style', source: 'harper' });
    expect(isSuppressed(s, 'foo', new Set(['Style']), noDict)).toBe(true);
    expect(isSuppressed(s, 'foo', noCats, noDict)).toBe(false);
  });

  it('suppresses a Spelling/Typo whose covered word is in the dictionary (case-insensitive)', () => {
    const sp = makeSuggestion({ offset: 0, length: 5, category: 'Spelling', source: 'harper' });
    expect(isSuppressed(sp, 'Inkly', noCats, new Set(['inkly']))).toBe(true);
    const ty = makeSuggestion({ offset: 0, length: 5, category: 'Typo', source: 'harper' });
    expect(isSuppressed(ty, 'inkly', noCats, new Set(['inkly']))).toBe(true);
  });

  it('does NOT dictionary-suppress non-spelling categories', () => {
    const g = makeSuggestion({ offset: 0, length: 5, category: 'Grammar', source: 'harper' });
    expect(isSuppressed(g, 'inkly', noCats, new Set(['inkly']))).toBe(false);
  });

  it('trims surrounding whitespace of the covered text before dictionary match', () => {
    const sp = makeSuggestion({ offset: 0, length: 7, category: 'Spelling', source: 'harper' });
    expect(isSuppressed(sp, ' inkly ', noCats, new Set(['inkly']))).toBe(true);
  });

  it('returns false when nothing matches', () => {
    const s = makeSuggestion({ offset: 0, length: 3, category: 'Spelling', source: 'harper' });
    expect(isSuppressed(s, 'cat', noCats, noDict)).toBe(false);
  });
});

describe('isDictionaryCategory', () => {
  it('returns true for Spelling and Typo, false for everything else', () => {
    expect(isDictionaryCategory('Spelling')).toBe(true);
    expect(isDictionaryCategory('Typo')).toBe(true);
    expect(isDictionaryCategory('Grammar')).toBe(false);
  });
});
