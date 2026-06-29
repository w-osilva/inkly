import { describe, it, expect, vi } from 'vitest';
import { checkLanguageTool } from '../src/core/providers/languagetool';

function fakeFetch(matches: unknown[], ok = true): typeof fetch {
  return (async () => ({ ok, json: async () => ({ matches }) })) as unknown as typeof fetch;
}

describe('checkLanguageTool', () => {
  it('maps matches to suggestions and posts to {endpoint}/check', async () => {
    const fetchFn = vi.fn(fakeFetch([
      { offset: 5, length: 3, message: 'Add a comma', replacements: [{ value: ', ' }], rule: { id: 'COMMA', issueType: 'typographical' } },
      { offset: 0, length: 4, shortMessage: 'Spelling', replacements: [{ value: 'This' }, { value: 'Thus' }], rule: { id: 'SP', issueType: 'misspelling' } },
    ]));
    const out = await checkLanguageTool('text here', 'https://lt.example/v2', 'auto', fetchFn);
    const url = (fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0];
    expect(url).toBe('https://lt.example/v2/check');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ offset: 5, length: 3, replacements: [', '], category: 'Punctuation', source: 'languagetool', severity: 'correctness' });
    expect(out[1]).toMatchObject({ category: 'Spelling', replacements: ['This', 'Thus'] });
  });

  it('trims a trailing slash on the endpoint', async () => {
    const fetchFn = vi.fn(fakeFetch([]));
    await checkLanguageTool('x', 'https://lt.example/v2/', 'auto', fetchFn);
    expect((fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0]).toBe('https://lt.example/v2/check');
  });

  it('returns [] for blank text, no endpoint, non-ok responses, or fetch errors', async () => {
    expect(await checkLanguageTool('   ', 'https://lt/v2', 'auto', fakeFetch([]))).toEqual([]);
    expect(await checkLanguageTool('x', '', 'auto', fakeFetch([]))).toEqual([]);
    expect(await checkLanguageTool('x', 'https://lt/v2', 'auto', fakeFetch([], false))).toEqual([]);
    const throwing = (async () => { throw new Error('network'); }) as unknown as typeof fetch;
    expect(await checkLanguageTool('x', 'https://lt/v2', 'auto', throwing)).toEqual([]);
  });
});
