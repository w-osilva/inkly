export type AICapability = 'rewrite' | 'translate' | 'synonyms' | 'analyze' | 'improve' | 'define' | 'correct';

export interface AIConfig {
  provider: 'openai-compatible';
  endpoint: string; // base URL, e.g. https://api.openai.com/v1
  apiKey: string;   // the active provider's key (what requests use)
  model: string;    // e.g. gpt-4o-mini
  /** Per-provider keys (providerId → apiKey) so switching providers keeps each key. */
  keys?: Record<string, string>;
}

export interface AIRequest {
  capability: AICapability;
  text: string;
  options?: Record<string, string>; // e.g. { tone: 'formal', targetLang: 'pt-br' }
  /** Use only the free on-device model (no BYOK fallback) — for automatic passes. */
  builtinOnly?: boolean;
}

export type AIResponse = { ok: true; text: string } | { ok: false; error: string };
