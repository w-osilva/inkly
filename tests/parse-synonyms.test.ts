import { describe, it, expect } from 'vitest';
import { parseSynonyms } from '../src/core/ai/parse-synonyms';

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
