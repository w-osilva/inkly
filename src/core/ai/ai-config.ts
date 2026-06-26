import { browser } from 'wxt/browser';
import { AIConfig } from './ai-types';

const KEY = 'inkly:ai';

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai-compatible',
  endpoint: '',
  apiKey: '',
  model: '',
};

function normalize(raw: unknown): AIConfig {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  return {
    provider: 'openai-compatible',
    endpoint: str(o.endpoint, ''),
    apiKey: str(o.apiKey, ''),
    model: str(o.model, ''),
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
