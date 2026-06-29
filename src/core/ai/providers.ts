/**
 * Curated AI provider presets so a non-expert can pick one and just paste a key, while
 * "Custom" keeps full flexibility. Open-source-weight providers are listed first (the
 * project's core principle); proprietary ones are marked. All are OpenAI-compatible.
 * Model lists are suggestions (editable) — free-tier model IDs change over time.
 */
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
  /** No API key required (e.g. a local server). A dummy key is prefilled so requests send one. */
  noKey?: boolean;
  note?: string;
}

export const AI_PROVIDERS: AIProviderPreset[] = [
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
    note: 'One key, many open models. Free tiers are rate-limited.',
  },
  {
    id: 'groq',
    label: 'Groq — fast open models',
    endpoint: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'qwen-2.5-32b', 'deepseek-r1-distill-llama-70b'],
    keyUrl: 'https://console.groq.com/keys',
    openSource: true,
    note: 'Very fast. ~1,000 free requests/day.',
  },
  {
    id: 'cerebras',
    label: 'Cerebras — high throughput',
    endpoint: 'https://api.cerebras.ai/v1',
    models: ['llama-3.3-70b', 'qwen-3-32b'],
    keyUrl: 'https://cloud.cerebras.ai',
    openSource: true,
    note: 'Generous free daily token allowance.',
  },
  {
    id: 'ollama',
    label: 'Ollama (local) — fully open & offline',
    endpoint: 'http://localhost:11434/v1',
    models: ['qwen2.5', 'llama3.1', 'gemma3'],
    keyUrl: '',
    openSource: true,
    noKey: true,
    note: 'Runs on your machine. Needs Ollama running with the extension origin allowed (OLLAMA_ORIGINS).',
  },
  {
    id: 'gemini',
    label: 'Google Gemini — best free tier (proprietary)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    keyUrl: 'https://aistudio.google.com/apikey',
    openSource: false,
    note: 'Not open-source, but a generous free tier and strong at Portuguese.',
  },
  {
    id: 'custom',
    label: 'Custom (any OpenAI-compatible API)',
    endpoint: '',
    models: [],
    keyUrl: '',
    openSource: false,
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
