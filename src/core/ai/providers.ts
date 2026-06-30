/**
 * Curated AI provider presets so a non-expert can pick one and just paste a key, while
 * "Custom" keeps full flexibility. Open-source-weight providers are listed first (the
 * project's core principle); proprietary ones are marked. All are OpenAI-compatible.
 * Model lists are suggestions (editable) — free-tier model IDs change over time.
 */
export type ProviderGroup = 'open' | 'proprietary' | 'custom';

export interface AIProviderPreset {
  id: string;
  label: string;
  endpoint: string;
  /** Suggested models (first is the default). Empty for Custom. */
  models: string[];
  /** Where to get an API key (empty when none is needed). */
  keyUrl: string;
  /** Models are open-weight / the stack is open source. */
  openSource: boolean;
  /** Grouping for the picker (open source is preferred, not exclusive). */
  group: ProviderGroup;
  /** No API key required (e.g. a local server). A dummy key is prefilled so requests send one. */
  noKey?: boolean;
  /**
   * Data-handling posture, surfaced as a privacy badge in the options:
   * 'local' = runs on the user's machine; 'no-train' = API states it won't train on
   * submitted data; 'trains' = the free tier may train on prompts; 'unknown' = depends
   * on the user's endpoint. This reflects the *default* preset models (the open presets
   * default to free model IDs).
   */
  privacy: 'local' | 'no-train' | 'trains' | 'unknown';
  /** Highlight as the recommended choice for serious / privacy-sensitive use. */
  recommended?: boolean;
  note?: string;
}

export const AI_PROVIDERS: AIProviderPreset[] = [
  // ---- Open source / open-weight (preferred) ----
  {
    id: 'openrouter',
    label: 'OpenRouter — free open models',
    endpoint: 'https://openrouter.ai/api/v1',
    models: [
      'openai/gpt-oss-120b:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'google/gemma-3-27b-it:free',
    ],
    keyUrl: 'https://openrouter.ai/keys',
    openSource: true,
    group: 'open',
    privacy: 'trains',
    note: 'One key, many open models. Free tiers are rate-limited.',
  },
  {
    id: 'groq',
    label: 'Groq — fast open models',
    endpoint: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'qwen-2.5-32b', 'deepseek-r1-distill-llama-70b'],
    keyUrl: 'https://console.groq.com/keys',
    openSource: true,
    group: 'open',
    privacy: 'no-train',
    recommended: true,
    note: 'Very fast, low latency. ~1,000 free requests/day; the API does not train on your prompts.',
  },
  {
    id: 'cerebras',
    label: 'Cerebras — high throughput',
    endpoint: 'https://api.cerebras.ai/v1',
    // Cerebras returns 404 for unknown model IDs and rotates its roster often; gpt-oss-120b
    // is the current production model (zai-glm-4.7 is a preview — may be discontinued).
    // Check https://inference-docs.cerebras.ai/models/overview if a model 404s.
    models: ['gpt-oss-120b', 'gemma-4-31b', 'zai-glm-4.7'],
    keyUrl: 'https://cloud.cerebras.ai',
    openSource: true,
    group: 'open',
    privacy: 'no-train',
    note: 'Big context, fast. Free tier is rate-limited (~5 req/min); best for occasional actions, not rapid-fire.',
  },
  {
    id: 'ollama',
    label: 'Ollama (local) — fully open & offline',
    endpoint: 'http://localhost:11434/v1',
    // EN/PT-strong picks first; tags chosen to fit a typical 6-8 GB GPU. gemma3:4b is the
    // best EN+PT balance; qwen2.5:7b is the quality ceiling if it fits VRAM; the 3b/llama
    // options are the fast, low-VRAM fallbacks. (qwen3's reasoning <think> output is handled.)
    models: ['gemma3:4b', 'qwen2.5:7b', 'qwen2.5:3b', 'llama3.2:3b'],
    keyUrl: '',
    openSource: true,
    group: 'open',
    privacy: 'local',
    noKey: true,
    note: 'Runs on your machine. Needs Ollama running with the extension origin allowed (OLLAMA_ORIGINS). gemma3:4b is a strong EN+PT pick; drop to a :3b model if VRAM is tight.',
  },
  // ---- Hosted proprietary (full flexibility) ----
  {
    id: 'gemini',
    label: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
    keyUrl: 'https://aistudio.google.com/apikey',
    openSource: false,
    group: 'proprietary',
    privacy: 'trains',
    note: 'Generous free tier (which may train on your data); strong at Portuguese.',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'o4-mini'],
    keyUrl: 'https://platform.openai.com/api-keys',
    openSource: false,
    group: 'proprietary',
    privacy: 'no-train',
    note: 'Paid. High quality; the API does not train on your data.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-5', 'claude-3-5-haiku-latest', 'claude-opus-4-1'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    openSource: false,
    group: 'proprietary',
    privacy: 'no-train',
    note: 'Paid. Does not train on your data. Uses Anthropic’s OpenAI-compatible endpoint.',
  },
  // ---- Anything else ----
  {
    id: 'custom',
    label: 'Custom (any OpenAI-compatible API)',
    endpoint: '',
    models: [],
    keyUrl: '',
    openSource: false,
    group: 'custom',
    privacy: 'unknown',
  },
];

/** Match a saved endpoint to a preset id; falls back to 'custom'. */
export function providerForEndpoint(endpoint: string): string {
  const e = (endpoint || '').replace(/\/+$/, '');
  const hit = AI_PROVIDERS.find((p) => p.endpoint && p.endpoint.replace(/\/+$/, '') === e);
  return hit ? hit.id : 'custom';
}

export function getProvider(id: string): AIProviderPreset {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[AI_PROVIDERS.length - 1];
}
