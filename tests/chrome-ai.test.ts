import { describe, it, expect, vi } from 'vitest';
import { tryChromeAI } from '../src/core/ai/chrome-ai';

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
