import { describe, it, expect } from 'vitest';
import { stripThinking } from '../src/core/ai/strip-thinking';

describe('stripThinking', () => {
  it('removes a complete <think> block and keeps the answer', () => {
    expect(stripThinking('<think>let me reason…</think>\nThe answer')).toBe('The answer');
  });
  it('handles a multiline think block', () => {
    expect(stripThinking('<think>\nline1\nline2\n</think>final')).toBe('final');
  });
  it('drops everything before a lone trailing </think>', () => {
    expect(stripThinking('reasoning without an open tag</think>real output')).toBe('real output');
  });
  it('leaves normal text untouched', () => {
    expect(stripThinking('just an answer')).toBe('just an answer');
  });
  it('handles empty input', () => {
    expect(stripThinking('')).toBe('');
  });
});
