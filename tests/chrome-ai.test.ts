import { describe, it, expect, vi } from 'vitest';
import { tryChromeAI, builtinAvailability } from '../src/core/ai/chrome-ai';

function fakeGlobal(opts: { availability: string; prompt?: (t: string) => Promise<string> }) {
  return {
    LanguageModel: {
      availability: async () => opts.availability,
      create: async () => ({
        prompt: opts.prompt ?? (async (t: string) => `BUILTIN: ${t}`),
        destroy: () => {},
      }),
    },
  } as unknown as typeof globalThis;
}

describe('tryChromeAI', () => {
  it('returns the prompt output when LanguageModel is available', async () => {
    const out = await tryChromeAI({ capability: 'rewrite', text: 'hi' }, fakeGlobal({ availability: 'available' }));
    expect(out).toBe('BUILTIN: hi');
  });
  it('treats "readily" as available too', async () => {
    const out = await tryChromeAI({ capability: 'rewrite', text: 'hi' }, fakeGlobal({ availability: 'readily' }));
    expect(out).toBe('BUILTIN: hi');
  });
  it('returns null when availability is not ready', async () => {
    expect(await tryChromeAI({ capability: 'rewrite', text: 'hi' }, fakeGlobal({ availability: 'unavailable' }))).toBeNull();
    expect(await tryChromeAI({ capability: 'rewrite', text: 'hi' }, fakeGlobal({ availability: 'downloadable' }))).toBeNull();
  });
  it('returns null when LanguageModel global is absent', async () => {
    expect(await tryChromeAI({ capability: 'rewrite', text: 'hi' }, {} as typeof globalThis)).toBeNull();
  });
  it('returns null (never throws) when the API throws', async () => {
    const g = { LanguageModel: { availability: async () => { throw new Error('boom'); } } } as unknown as typeof globalThis;
    expect(await tryChromeAI({ capability: 'rewrite', text: 'hi' }, g)).toBeNull();
  });
  it('passes the system prompt into create() and the user text into prompt()', async () => {
    const prompt = vi.fn(async (t: string) => `R: ${t}`);
    const out = await tryChromeAI({ capability: 'rewrite', text: 'fix me' }, fakeGlobal({ availability: 'available', prompt }));
    expect(out).toBe('R: fix me');
    expect(prompt).toHaveBeenCalledWith('fix me');
  });
});

describe('builtinAvailability', () => {
  const g = (availability: string) =>
    ({ LanguageModel: { availability: async () => availability } }) as unknown as typeof globalThis;

  it('maps ready states to "available"', async () => {
    expect(await builtinAvailability(g('available'))).toBe('available');
    expect(await builtinAvailability(g('readily'))).toBe('available');
  });
  it('maps download states to "downloadable"', async () => {
    expect(await builtinAvailability(g('downloadable'))).toBe('downloadable');
    expect(await builtinAvailability(g('downloading'))).toBe('downloadable');
    expect(await builtinAvailability(g('after-download'))).toBe('downloadable');
  });
  it('maps anything else and a missing global to "unavailable"', async () => {
    expect(await builtinAvailability(g('unavailable'))).toBe('unavailable');
    expect(await builtinAvailability({} as typeof globalThis)).toBe('unavailable');
  });
  it('never throws when the API throws', async () => {
    const bad = { LanguageModel: { availability: async () => { throw new Error('x'); } } } as unknown as typeof globalThis;
    expect(await builtinAvailability(bad)).toBe('unavailable');
  });
});
