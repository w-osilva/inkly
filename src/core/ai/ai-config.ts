import { browser } from 'wxt/browser';
import { AIConfig } from './ai-types';

const KEY = 'inkly:ai';

// Prefilled defaults: a fast, free OpenRouter model so the user only needs to paste a
// key. (OpenRouter free tiers are rate-limited; the user can change endpoint/model.)
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai-compatible',
  endpoint: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'openai/gpt-oss-120b:free',
  keys: {},
};

function normalize(raw: unknown): AIConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  // Fall back to the prefilled default only when the field was never set (undefined),
  // so a user can still deliberately clear endpoint/model to an empty string.
  const keys: Record<string, string> = {};
  if (o.keys && typeof o.keys === 'object' && !Array.isArray(o.keys)) {
    for (const [k, v] of Object.entries(o.keys as Record<string, unknown>)) {
      if (typeof v === 'string') keys[k] = v;
    }
  }
  return {
    provider: 'openai-compatible',
    endpoint: str(o.endpoint, DEFAULT_AI_CONFIG.endpoint),
    apiKey: str(o.apiKey, ''),
    model: str(o.model, DEFAULT_AI_CONFIG.model),
    keys,
  };
}

/** Stored in storage.LOCAL (never sync) so the API key is not synced across devices. */
export async function getAIConfig(): Promise<AIConfig> {
  const stored = await browser.storage.local.get(KEY);
  return normalize(stored[KEY]);
}

export async function setAIConfig(config: AIConfig): Promise<void> {
  await browser.storage.local.set({ [KEY]: config });
}

export function hasKey(config: AIConfig): boolean {
  return Boolean(config.endpoint && config.apiKey && config.model);
}
