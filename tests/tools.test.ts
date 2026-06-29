import { describe, it, expect } from 'vitest';
import { priorityFromOrder, normalizeOrder, toolIdForSource, DEFAULT_CORRECTION_ORDER } from '../src/core/tools';
import { mergeSuggestions } from '../src/core/orchestrator';
import { makeSuggestion } from '../src/core/types';

describe('tools metadata', () => {
  it('maps sources back to tool ids', () => {
    expect(toolIdForSource('harper')).toBe('harper');
    expect(toolIdForSource('inkly')).toBe('punctuation');
    expect(toolIdForSource('languagetool')).toBe('languagetool');
    expect(toolIdForSource('byok')).toBe('aiImprove');
  });

  it('priorityFromOrder: earlier in the list ⇒ higher rank', () => {
    const p = priorityFromOrder(['languagetool', 'harper']);
    expect(p.languagetool!).toBeGreaterThan(p.harper!);
  });

  it('normalizeOrder keeps valid ids, drops junk, appends missing', () => {
    expect(normalizeOrder(['languagetool', 'bogus', 'harper'])).toEqual([
      'languagetool', 'harper',
      ...DEFAULT_CORRECTION_ORDER.filter((id) => id !== 'languagetool' && id !== 'harper'),
    ]);
    expect(normalizeOrder(null)).toEqual(DEFAULT_CORRECTION_ORDER);
  });
});

describe('mergeSuggestions with a priority override', () => {
  const harper = makeSuggestion({ offset: 0, length: 4, source: 'harper', replacements: ['A'], ruleId: 'h' });
  const lt = makeSuggestion({ offset: 0, length: 4, source: 'languagetool', replacements: ['B'], ruleId: 'l' });

  it('defaults to SOURCE_PRIORITY (Harper wins over LanguageTool)', () => {
    const out = mergeSuggestions([harper, lt]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('harper');
  });

  it('honors an override that ranks LanguageTool above Harper', () => {
    const out = mergeSuggestions([harper, lt], priorityFromOrder(['languagetool', 'harper']));
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('languagetool');
  });
});
