import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { getAIConfig, setAIConfig, hasKey, DEFAULT_AI_CONFIG } from '../src/core/ai/ai-config';

beforeEach(() => fakeBrowser.reset());

describe('AI config (storage.local)', () => {
  it('returns defaults (empty) when unset', async () => {
    expect(await getAIConfig()).toEqual(DEFAULT_AI_CONFIG);
  });
  it('round-trips a config', async () => {
    await setAIConfig({ provider: 'openai-compatible', endpoint: 'https://x/v1', apiKey: 'k', model: 'm' });
    const c = await getAIConfig();
    expect(c.endpoint).toBe('https://x/v1');
    expect(c.apiKey).toBe('k');
    expect(c.model).toBe('m');
  });
  it('normalizes a malformed stored value to defaults', async () => {
    await fakeBrowser.storage.local.set({ 'inkly:ai': 'garbage' });
    expect(await getAIConfig()).toEqual(DEFAULT_AI_CONFIG);
  });
  it('round-trips per-provider keys and drops non-string entries', async () => {
    await setAIConfig({ provider: 'openai-compatible', endpoint: 'https://x/v1', apiKey: 'g', model: 'm', keys: { groq: 'g', openai: 'o' } });
    expect((await getAIConfig()).keys).toEqual({ groq: 'g', openai: 'o' });
    await fakeBrowser.storage.local.set({ 'inkly:ai': { endpoint: 'https://x/v1', apiKey: 'g', model: 'm', keys: { groq: 'g', bad: 5 } } });
    expect((await getAIConfig()).keys).toEqual({ groq: 'g' });
  });
  it('hasKey reflects whether endpoint+apiKey+model are all set', async () => {
    expect(hasKey(DEFAULT_AI_CONFIG)).toBe(false);
    expect(hasKey({ provider: 'openai-compatible', endpoint: 'https://x/v1', apiKey: 'k', model: 'm' })).toBe(true);
    expect(hasKey({ provider: 'openai-compatible', endpoint: '', apiKey: 'k', model: 'm' })).toBe(false);
  });
});
