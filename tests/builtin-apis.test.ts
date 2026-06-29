import { describe, it, expect, vi } from 'vitest';
import { apiAvailability, detectBuiltins, tryChromeRewrite, mapProofread, tryChromeProofread } from '../src/core/ai/builtin-apis';

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

describe('mapProofread', () => {
  it('maps corrections to suggestions, mapping type → category and severity', () => {
    const s = mapProofread({ corrections: [
      { startIndex: 0, endIndex: 3, correction: 'The', type: 'capitalization', explanation: 'Capitalize.' },
      { startIndex: 4, endIndex: 7, correction: 'cat', type: 'spelling' },
      { startIndex: 8, endIndex: 11, correction: 'runs', type: 'grammar' },
    ]});
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ offset: 0, length: 3, replacements: ['The'], category: 'Capitalization', source: 'chrome-proofread', severity: 'correctness', message: 'Capitalize.' });
    expect(s[1]).toMatchObject({ category: 'Spelling', ruleId: 'Proofread:spelling' });
    expect(s[2]).toMatchObject({ category: 'Grammar' });
  });
  it('tolerates older start/end keys and skips malformed ranges', () => {
    const s = mapProofread({ corrections: [
      { start: 2, end: 5, correction: 'fix' },
      { startIndex: 9, endIndex: 4, correction: 'bad' }, // end < start → skipped
      { correction: 'no range' },                        // no offsets → skipped
    ]});
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ offset: 2, length: 3, category: 'Grammar' });
  });
  it('returns [] for null/empty', () => {
    expect(mapProofread(null)).toEqual([]);
    expect(mapProofread({})).toEqual([]);
  });
});

describe('tryChromeProofread', () => {
  const fake = (avail: string, corrections: unknown[]) => withGlobals({
    Proofreader: {
      availability: async () => avail,
      create: async () => ({ proofread: async () => ({ corrections }), destroy: () => {} }),
    },
  });

  it('returns mapped suggestions when ready', async () => {
    const s = await tryChromeProofread('teh cat', fake('available', [{ startIndex: 0, endIndex: 3, correction: 'the', type: 'spelling' }]));
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ replacements: ['the'], source: 'chrome-proofread' });
  });
  it('returns [] when absent, not ready, blank input, or throwing', async () => {
    expect(await tryChromeProofread('hi', withGlobals({}))).toEqual([]);
    expect(await tryChromeProofread('hi', fake('downloadable', []))).toEqual([]);
    expect(await tryChromeProofread('   ', fake('available', [{ startIndex: 0, endIndex: 1, correction: 'x' }]))).toEqual([]);
  });
});
