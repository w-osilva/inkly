import { describe, it, expect, vi } from 'vitest';
import { tryChromeTranslate } from '../src/core/ai/chrome-translator';
import type { AIRequest } from '../src/core/ai/ai-types';

const req = (text: string, targetLang: string): AIRequest => ({ capability: 'translate', text, options: { targetLang } });

function fakeGlobal(opts: {
  availability?: string;
  translateImpl?: (t: string) => string;
  detect?: string | null;
  noTranslator?: boolean;
}): typeof globalThis {
  const g: Record<string, unknown> = {};
  if (!opts.noTranslator) {
    g.Translator = {
      availability: vi.fn(async () => opts.availability ?? 'available'),
      create: vi.fn(async () => ({ translate: async (t: string) => (opts.translateImpl ?? ((s) => `T:${s}`))(t) })),
    };
  }
  if (opts.detect !== undefined && opts.detect !== null) {
    g.LanguageDetector = {
      create: vi.fn(async () => ({ detect: async () => [{ detectedLanguage: opts.detect, confidence: 0.9 }] })),
    };
  }
  return g as unknown as typeof globalThis;
}

describe('tryChromeTranslate', () => {
  it('returns null when the Translator API is absent', async () => {
    expect(await tryChromeTranslate(req('hello', 'Portuguese'), fakeGlobal({ noTranslator: true }))).toBeNull();
  });

  it('translates when a model is available', async () => {
    const out = await tryChromeTranslate(req('hello', 'Portuguese'), fakeGlobal({ translateImpl: (t) => `PT:${t}` }));
    expect(out).toBe('PT:hello');
  });

  it('returns null when the pair is unavailable', async () => {
    expect(await tryChromeTranslate(req('hello', 'Portuguese'), fakeGlobal({ availability: 'unavailable' }))).toBeNull();
  });

  it('returns null when detected source equals the target (nothing to do)', async () => {
    // target is Portuguese and the detector says the text is already pt
    expect(await tryChromeTranslate(req('olá', 'Portuguese'), fakeGlobal({ detect: 'pt' }))).toBeNull();
  });

  it('uses the detected source language for a real translation', async () => {
    const out = await tryChromeTranslate(req('bonjour', 'English'), fakeGlobal({ detect: 'fr', translateImpl: (t) => `EN:${t}` }));
    expect(out).toBe('EN:bonjour');
  });
});
