import { AIConfig } from './ai-types';
import { ChatMessage } from './prompts';

export interface HttpRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function buildHttpRequest(config: AIConfig, messages: ChatMessage[]): HttpRequest {
  const base = config.endpoint.replace(/\/$/, '');
  return {
    url: `${base}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.model, messages, stream: false }),
  };
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
