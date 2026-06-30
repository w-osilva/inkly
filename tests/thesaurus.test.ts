import { describe, it, expect, vi } from 'vitest';
import { formatThesaurus, lookupSynonyms } from '../src/core/ai/thesaurus';

describe('formatThesaurus', () => {
  it('returns a flat comma list of words (capped)', () => {
    const json = [{ word: 'happy' }, { word: 'glad' }, { word: 'content' }];
    expect(formatThesaurus(json)).toBe('happy, glad, content');
  });
  it('caps to `max` words', () => {
    const json = Array.from({ length: 20 }, (_, i) => ({ word: `w${i}` }));
    expect(formatThesaurus(json, 3)).toBe('w0, w1, w2');
  });
  it('returns null for an empty / non-array payload', () => {
    expect(formatThesaurus([])).toBeNull();
    expect(formatThesaurus({})).toBeNull();
  });
});

const okRes = (json: unknown) => ({ ok: true, json: async () => json }) as Response;

describe('lookupSynonyms', () => {
  it('returns synonyms on a hit and queries Datamuse rel_syn', async () => {
    const fetchFn = vi.fn(async () => okRes([{ word: 'glad' }, { word: 'cheerful' }]));
    expect(await lookupSynonyms('happy', fetchFn as unknown as typeof fetch)).toBe('glad, cheerful');
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('rel_syn=happy'));
  });
  it('returns null when there are no synonyms (e.g. a non-English word)', async () => {
    const fetchFn = vi.fn(async () => okRes([]));
    expect(await lookupSynonyms('asdfqwer', fetchFn as unknown as typeof fetch)).toBeNull();
  });
  it('returns null for a multi-word selection (single words only)', async () => {
    const fetchFn = vi.fn();
    expect(await lookupSynonyms('very happy', fetchFn as unknown as typeof fetch)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('returns null when fetch throws (offline)', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('offline'); });
    expect(await lookupSynonyms('happy', fetchFn as unknown as typeof fetch)).toBeNull();
  });
});
