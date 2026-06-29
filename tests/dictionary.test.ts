import { describe, it, expect, vi } from 'vitest';
import { formatDictionary, lookupDefinition } from '../src/core/ai/dictionary';

describe('formatDictionary', () => {
  it('formats meanings as "<part of speech>: <definition>" lines', () => {
    const json = [{
      word: 'world',
      meanings: [
        { partOfSpeech: 'noun', definitions: [{ definition: 'The earth and all its peoples.' }] },
        { partOfSpeech: 'verb', definitions: [{ definition: 'To make real.' }] },
      ],
    }];
    expect(formatDictionary(json)).toBe('noun: The earth and all its peoples.\nverb: To make real.');
  });
  it('returns null for an empty / non-array payload', () => {
    expect(formatDictionary([])).toBeNull();
    expect(formatDictionary({ title: 'No Definitions Found' })).toBeNull();
  });
});

const okRes = (json: unknown) => ({ ok: true, json: async () => json }) as Response;

describe('lookupDefinition', () => {
  it('returns a formatted definition on a hit', async () => {
    const fetchFn = vi.fn(async () => okRes([{ meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'a greeting' }] }] }]));
    expect(await lookupDefinition('hello', 'en', fetchFn as unknown as typeof fetch)).toBe('noun: a greeting');
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining('/entries/en/hello'));
  });
  it('returns null on a 404 (word not found)', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false }) as Response);
    expect(await lookupDefinition('asdfqwer', 'en', fetchFn as unknown as typeof fetch)).toBeNull();
  });
  it('returns null for a multi-word selection (single words only)', async () => {
    const fetchFn = vi.fn();
    expect(await lookupDefinition('hello world', 'en', fetchFn as unknown as typeof fetch)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('returns null when fetch throws (offline)', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('offline'); });
    expect(await lookupDefinition('hello', 'en', fetchFn as unknown as typeof fetch)).toBeNull();
  });
});
