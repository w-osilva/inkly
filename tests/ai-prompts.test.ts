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
});
