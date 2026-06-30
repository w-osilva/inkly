import { AIConfig } from './ai-types';
import { ChatMessage } from './prompts';

export interface HttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function buildHttpRequest(
  config: AIConfig,
  messages: ChatMessage[],
  stream = false,
  temperature?: number,
): HttpRequest {
  const base = config.endpoint.replace(/\/$/, '');
  return {
    url: `${base}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: withThinkingOff(config.model, messages),
      stream,
      // Low temperature for factual tasks keeps a small local model from "inventing" (e.g.
      // deleting a proper noun); creative tasks get more room. Omitted ⇒ provider default.
      ...(temperature !== undefined ? { temperature } : {}),
    }),
  };
}

/**
 * Qwen3 turns on a slow chain-of-thought by default. Inkly's tasks (rewrite, synonyms,
 * improve, …) never need reasoning, so opt out via Qwen3's `/no_think` soft switch appended
 * to the system message — a big latency win, especially on local Ollama. Other models don't
 * recognise the token, so we only touch qwen3 to avoid leaking literal text into their prompt.
 */
function withThinkingOff(model: string, messages: ChatMessage[]): ChatMessage[] {
  if (!/qwen3/i.test(model) || messages[0]?.role !== 'system') return messages;
  return messages.map((m, i) => (i === 0 ? { ...m, content: `${m.content} /no_think` } : m));
}

/** Extract the assistant text from an OpenAI-compatible chat-completion response. */
export function parseChatCompletion(json: unknown): string {
  const content = (json as { choices?: Array<{ message?: { content?: unknown } }> })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected chat-completion response shape');
  }
  return content.trim();
}
