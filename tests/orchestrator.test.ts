import { describe, it, expect } from 'vitest';
import { mergeSuggestions } from '../src/core/orchestrator';
import { makeSuggestion } from '../src/core/types';

describe('mergeSuggestions', () => {
  it('sorts by offset', () => {
    const out = mergeSuggestions([
      makeSuggestion({ offset: 10, length: 2 }),
      makeSuggestion({ offset: 1, length: 2 }),
    ]);
    expect(out.map((s) => s.offset)).toEqual([1, 10]);
  });

  it('drops the lower-priority suggestion when two overlap', () => {
    const harper = makeSuggestion({ offset: 5, length: 4, source: 'harper' });
    const ai = makeSuggestion({ offset: 6, length: 4, source: 'byok' });
    const out = mergeSuggestions([ai, harper]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('harper');
  });

  it('keeps both when they do not overlap (adjacent is allowed)', () => {
    const a = makeSuggestion({ offset: 0, length: 3, source: 'harper' }); // covers 0,1,2
    const b = makeSuggestion({ offset: 3, length: 3, source: 'byok' });   // covers 3,4,5
    const out = mergeSuggestions([a, b]);
    expect(out).toHaveLength(2);
  });

  it('on equal priority, keeps the earlier-offset one', () => {
    const a = makeSuggestion({ offset: 2, length: 5, source: 'byok' });
    const b = makeSuggestion({ offset: 4, length: 5, source: 'chrome-ai' });
    const out = mergeSuggestions([b, a]);
    expect(out).toHaveLength(1);
    expect(out[0].offset).toBe(2);
  });
});
