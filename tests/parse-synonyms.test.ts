import { describe, it, expect } from 'vitest';
import { parseSynonyms, parseSynonymGroups } from '../src/core/ai/parse-synonyms';

describe('parseSynonymGroups', () => {
  it('parses grouped JSON of {sense, synonyms}', () => {
    const raw = '[{"sense":"to be fond of","synonyms":["want","enjoy"]},{"sense":"to pick","synonyms":["select"]}]';
    expect(parseSynonymGroups(raw)).toEqual([
      { sense: 'to be fond of', words: ['want', 'enjoy'] },
      { sense: 'to pick', words: ['select'] },
    ]);
  });
  it('strips code fences around the JSON', () => {
    expect(parseSynonymGroups('```json\n[{"sense":"s","synonyms":["a"]}]\n```')).toEqual([{ sense: 's', words: ['a'] }]);
  });
  it('falls back to a single flat group for a plain comma list', () => {
    expect(parseSynonymGroups('alpha, beta, gamma')).toEqual([{ sense: '', words: ['alpha', 'beta', 'gamma'] }]);
  });
  it('accepts a single object (not wrapped in an array)', () => {
    expect(parseSynonymGroups('{"sense":"s","synonyms":["a","b"]}')).toEqual([{ sense: 's', words: ['a', 'b'] }]);
  });
  it('accepts a flat JSON array of strings', () => {
    expect(parseSynonymGroups('["a","b","c"]')).toEqual([{ sense: '', words: ['a', 'b', 'c'] }]);
  });
  it('salvages complete objects from truncated JSON (no comma-split garbage)', () => {
    // A cut-off stream: two complete groups, then a dangling fragment.
    const raw = '[{"sense":"s1","synonyms":["changes into","turns into"]},{"sense":"s2","synonyms":["basically","fundamentally"]},{"sense';
    expect(parseSynonymGroups(raw)).toEqual([
      { sense: 's1', words: ['changes into', 'turns into'] },
      { sense: 's2', words: ['basically', 'fundamentally'] },
    ]);
  });
  it('never emits raw JSON tokens as chips when JSON is broken beyond salvage', () => {
    const groups = parseSynonymGroups('[{"sense');
    // No chip should be a JSON fragment like `[` or `{"sense`.
    for (const g of groups) for (const w of g.words) expect(w).not.toMatch(/[[\]{}"]/);
  });
  it('returns [] for empty input', () => {
    expect(parseSynonymGroups('')).toEqual([]);
  });
});

describe('parseSynonyms', () => {
  it('splits a clean comma list', () => {
    expect(parseSynonyms('alpha, beta, gamma')).toEqual(['alpha', 'beta', 'gamma']);
  });
  it('splits newline and numbered lists, stripping numbering', () => {
    expect(parseSynonyms('1. alpha\n2. beta\n3) gamma')).toEqual(['alpha', 'beta', 'gamma']);
  });
  it('strips surrounding quotes and trailing punctuation', () => {
    expect(parseSynonyms('"alpha", beta.')).toEqual(['alpha', 'beta']);
  });
  it('drops empties and caps at 6', () => {
    expect(parseSynonyms('a, b, , c, d, e, f, g, h')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });
  it('returns [] for empty input', () => {
    expect(parseSynonyms('')).toEqual([]);
    expect(parseSynonyms('   ')).toEqual([]);
  });
});
