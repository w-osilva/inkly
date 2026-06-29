import { describe, it, expect, vi } from 'vitest';
import { apiAvailability, detectBuiltins, tryChromeRewrite } from '../src/core/ai/builtin-apis';

const withGlobals = (obj: Record<string, unknown>) => obj as unknown as typeof globalThis;

describe('apiAvailability', () => {
  it('maps the spec states to our three buckets', async () => {
    const g = (a: string) => withGlobals({ Rewriter: { availability: async () => a } });
    expect(await apiAvailability('rewriter', g('available'))).toBe('available');
    expect(await apiAvailability('rewriter', g('readily'))).toBe('available');
    expect(await apiAvailability('rewriter', g('downloadable'))).toBe('downloadable');
    expect(await apiAvailability('rewriter', g('after-download'))).toBe('downloadable');
    expect(await apiAvailability('rewriter', g('unavailable'))).toBe('unavailable');
  });
  it('is "unavailable" when the global is absent or throws', async () => {
    expect(await apiAvailability('proofreader', withGlobals({}))).toBe('unavailable');
    const bad = withGlobals({ Proofreader: { availability: async () => { throw new Error('x'); } } });
    expect(await apiAvailability('proofreader', bad)).toBe('unavailable');
  });
});

describe('detectBuiltins', () => {
  it('reports every capability, defaulting missing ones to unavailable', async () => {
    const g = withGlobals({
      LanguageModel: { availability: async () => 'available' },
      Rewriter: { availability: async () => 'downloadable' },
    });
    const d = await detectBuiltins(g);
    expect(d.languageModel).toBe('available');
    expect(d.rewriter).toBe('downloadable');
    expect(d.writer).toBe('unavailable');
    expect(d.proofreader).toBe('unavailable');
    expect(d.summarizer).toBe('unavailable');
  });
});

describe('tryChromeRewrite', () => {
  function fakeRewriter(opts: { availability?: string; rewrite?: (t: string, o?: unknown) => Promise<string> } = {}) {
    const create = vi.fn(async () => ({
      rewrite: opts.rewrite ?? (async (t: string) => `REW: ${t}`),
      destroy: vi.fn(),
    }));
    return { g: withGlobals({ Rewriter: { availability: async () => opts.availability ?? 'available', create } }), create };
  }

  it('returns the rewritten text when the API is ready', async () => {
    const { g } = fakeRewriter();
    expect(await tryChromeRewrite({ capability: 'rewrite', text: 'hi' }, g)).toBe('REW: hi');
  });
  it('maps inkly tones/lengths onto the Rewriter options', async () => {
    const { g, create } = fakeRewriter();
    await tryChromeRewrite({ capability: 'rewrite', text: 'hi', options: { tone: 'professional', length: 'shorter' } }, g);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tone: 'more-formal', length: 'shorter', format: 'plain-text' }));
    await tryChromeRewrite({ capability: 'rewrite', text: 'hi', options: { tone: 'friendly' } }, g);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ tone: 'more-casual', length: 'as-is' }));
  });
  it('falls back (null) when the API is absent, not ready, empty, or throws', async () => {
    expect(await tryChromeRewrite({ capability: 'rewrite', text: 'hi' }, withGlobals({}))).toBeNull();
    expect(await tryChromeRewrite({ capability: 'rewrite', text: 'hi' }, fakeRewriter({ availability: 'downloadable' }).g)).toBeNull();
    expect(await tryChromeRewrite({ capability: 'rewrite', text: 'hi' }, fakeRewriter({ rewrite: async () => '  ' }).g)).toBeNull();
    expect(await tryChromeRewrite({ capability: 'rewrite', text: 'hi' }, fakeRewriter({ rewrite: async () => { throw new Error('boom'); } }).g)).toBeNull();
  });
});
