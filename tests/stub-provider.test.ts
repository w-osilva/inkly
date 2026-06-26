import { describe, it, expect } from 'vitest';
import { StubProvider } from '../src/core/providers/stub-provider';

describe('StubProvider', () => {
  it('flags every occurrence of "teh" as a suggestion to "the"', async () => {
    const p = new StubProvider();
    const out = await p.check('teh cat ate teh fish', {
      fieldType: 'textarea',
      language: 'en',
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ offset: 0, length: 3, source: 'stub' });
    expect(out[0].replacements).toEqual(['the']);
    expect(out[1].offset).toBe(12);
  });

  it('returns nothing when the trigger word is absent', async () => {
    const p = new StubProvider();
    const out = await p.check('the cat', { fieldType: 'input', language: 'en' });
    expect(out).toEqual([]);
  });
});
