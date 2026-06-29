import { describe, it, expect } from 'vitest';
import { buildMessages } from '../src/core/ai/prompts';

describe('buildMessages', () => {
  it('rewrite: system instructs to return only the rewritten text; user carries the text', () => {
    const msgs = buildMessages({ capability: 'rewrite', text: 'i has a apple' });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content.toLowerCase()).toContain('rewrite');
    expect(msgs[0].content.toLowerCase()).toContain('only');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'i has a apple' });
  });
  it('rewrite with a tone option mentions the tone in the system prompt', () => {
    const msgs = buildMessages({ capability: 'rewrite', text: 'hey', options: { tone: 'formal' } });
    expect(msgs[0].content.toLowerCase()).toContain('formal');
  });
  it('rewrite is strict: preserves meaning and does not respond to the text', () => {
    const msgs = buildMessages({ capability: 'rewrite', text: 'I would like a pizza' });
    const sys = msgs[0].content.toLowerCase();
    expect(sys).toMatch(/preserv/);
    expect(sys).toMatch(/not (a )?(chatbot|assistant)|do not (answer|respond)/);
  });
  it('translate: system instructs to translate to the target language, user carries the text', () => {
    const msgs = buildMessages({ capability: 'translate', text: 'hello', options: { targetLang: 'Portuguese' } });
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content.toLowerCase()).toContain('translate');
    expect(msgs[0].content).toContain('Portuguese');
    expect(msgs[0].content.toLowerCase()).toContain('only');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'hello' });
  });
  it('translate without a target still produces a translate instruction (no crash)', () => {
    const msgs = buildMessages({ capability: 'translate', text: 'hello' });
    expect(msgs[0].content.toLowerCase()).toContain('translate');
  });
  it('synonyms: asks for sense-grouped JSON', () => {
    const msgs = buildMessages({ capability: 'synonyms', text: 'happy' });
    expect(msgs[0].content.toLowerCase()).toContain('synonym');
    expect(msgs[0].content.toLowerCase()).toMatch(/json|sense/);
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'happy' });
  });
  it('analyze: asks for brief feedback', () => {
    const msgs = buildMessages({ capability: 'analyze', text: 'some text' });
    expect(msgs[0].content.toLowerCase()).toMatch(/analyz|feedback/);
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'some text' });
  });
});
