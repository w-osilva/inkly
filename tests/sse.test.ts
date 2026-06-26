import { describe, it, expect } from 'vitest';
import { splitSSE, deltaFromEvent } from '../src/core/ai/sse';

describe('splitSSE', () => {
  it('splits complete events on blank lines and returns the trailing remainder', () => {
    const { events, rest } = splitSSE('data: a\n\ndata: b\n\ndata: par');
    expect(events).toEqual(['data: a', 'data: b']);
    expect(rest).toBe('data: par');
  });
  it('returns no events when there is no blank-line boundary yet', () => {
    const { events, rest } = splitSSE('data: partial');
    expect(events).toEqual([]);
    expect(rest).toBe('data: partial');
  });
});

describe('deltaFromEvent', () => {
  it('extracts choices[0].delta.content', () => {
    expect(deltaFromEvent('data: {"choices":[{"delta":{"content":"Hel"}}]}')).toBe('Hel');
  });
  it('returns null for [DONE]', () => {
    expect(deltaFromEvent('data: [DONE]')).toBeNull();
  });
  it('returns null for events without a content delta or malformed JSON', () => {
    expect(deltaFromEvent('data: {"choices":[{"delta":{}}]}')).toBeNull();
    expect(deltaFromEvent('data: not json')).toBeNull();
    expect(deltaFromEvent(': comment')).toBeNull();
  });
});
