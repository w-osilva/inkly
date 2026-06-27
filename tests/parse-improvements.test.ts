import { describe, it, expect } from 'vitest';
import { parseImprovements } from '../src/core/ai/parse-improvements';

describe('parseImprovements', () => {
  it('parses a plain JSON array', () => {
    const raw = '[{"original":"I would like","improved":"I want","reason":"more confident"}]';
    expect(parseImprovements(raw)).toEqual([{ original: 'I would like', improved: 'I want', reason: 'more confident' }]);
  });
  it('strips code fences', () => {
    const raw = '```json\n[{"original":"a","improved":"b","reason":""}]\n```';
    expect(parseImprovements(raw)).toEqual([{ original: 'a', improved: 'b', reason: '' }]);
  });
  it('extracts the array from surrounding prose', () => {
    const raw = 'Here you go: [{"original":"x","improved":"y","reason":"r"}] hope it helps';
    expect(parseImprovements(raw)).toEqual([{ original: 'x', improved: 'y', reason: 'r' }]);
  });
  it('drops malformed / empty / no-op entries', () => {
    const raw = '[{"original":"a","improved":"a"},{"original":"","improved":"z"},{"improved":"q"},{"original":"k","improved":"m","reason":"ok"}]';
    expect(parseImprovements(raw)).toEqual([{ original: 'k', improved: 'm', reason: 'ok' }]);
  });
  it('returns [] for non-JSON or empty', () => {
    expect(parseImprovements('sorry, nothing')).toEqual([]);
    expect(parseImprovements('')).toEqual([]);
    expect(parseImprovements('[]')).toEqual([]);
  });
});
