import { describe, it, expect } from 'vitest';
import { buildHttpRequest, parseChatCompletion } from '../src/core/ai/openai-provider';

const config = { provider: 'openai-compatible' as const, endpoint: 'https://api.x.com/v1', apiKey: 'sk-1', model: 'gpt-x' };
const messages = [{ role: 'system' as const, content: 'sys' }, { role: 'user' as const, content: 'hi' }];

describe('buildHttpRequest', () => {
  it('targets {endpoint}/chat/completions with bearer auth and the model+messages', () => {
    const r = buildHttpRequest(config, messages);
    expect(r.url).toBe('https://api.x.com/v1/chat/completions');
    expect(r.headers.Authorization).toBe('Bearer sk-1');
    expect(r.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(r.body);
    expect(body.model).toBe('gpt-x');
    expect(body.messages).toEqual(messages);
    expect(body.stream).toBe(false);
  });
  it('sets stream:true when the stream arg is true, and stream:false by default', () => {
    expect(JSON.parse(buildHttpRequest(config, messages, true).body).stream).toBe(true);
    expect(JSON.parse(buildHttpRequest(config, messages).body).stream).toBe(false);
  });
  it('handles an endpoint with a trailing slash without doubling it', () => {
    const r = buildHttpRequest({ ...config, endpoint: 'https://api.x.com/v1/' }, messages);
    expect(r.url).toBe('https://api.x.com/v1/chat/completions');
  });
});

describe('parseChatCompletion', () => {
  it('extracts the assistant message content, trimmed', () => {
    const json = { choices: [{ message: { role: 'assistant', content: '  the result  ' } }] };
    expect(parseChatCompletion(json)).toBe('the result');
  });
  it('throws a clear error when the shape is unexpected', () => {
    expect(() => parseChatCompletion({})).toThrow();
    expect(() => parseChatCompletion({ choices: [] })).toThrow();
  });
});
