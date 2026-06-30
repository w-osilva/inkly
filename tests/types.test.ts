import { describe, it, expect } from 'vitest';
import { makeSuggestion, SOURCE_PRIORITY, severityFor } from '../src/core/types';

describe('types', () => {
  it('makeSuggestion fills defaults and keeps overrides', () => {
    const s = makeSuggestion({ offset: 3, length: 4, replacements: ['cat'] });
    expect(s.offset).toBe(3);
    expect(s.length).toBe(4);
    expect(s.replacements).toEqual(['cat']);
    expect(s.source).toBe('stub');
    expect(s.ruleId).toBe('');
  });

  it('SOURCE_PRIORITY ranks harper above ai sources', () => {
    expect(SOURCE_PRIORITY.harper).toBeGreaterThan(SOURCE_PRIORITY['chrome-ai']);
    expect(SOURCE_PRIORITY.harper).toBeGreaterThan(SOURCE_PRIORITY.byok);
  });

  it('severityFor maps correctness categories to "correctness"', () => {
    expect(severityFor('Spelling')).toBe('correctness');
    expect(severityFor('Grammar')).toBe('correctness');
    expect(severityFor('Punctuation')).toBe('correctness');
  });

  it('severityFor maps clarity categories to "clarity"', () => {
    expect(severityFor('Redundancy')).toBe('clarity');
    expect(severityFor('WordChoice')).toBe('clarity');
    expect(severityFor('Readability')).toBe('clarity');
  });

  it('severityFor maps subjective categories to "suggestion"', () => {
    expect(severityFor('Style')).toBe('suggestion');
    expect(severityFor('Enhancement')).toBe('suggestion');
  });

  it('severityFor is taxonomy-driven, independent of the engine/source', () => {
    // A spelling error is "correctness" whoever found it — the old AI-always-suggestion rule is gone.
    expect(severityFor('Spelling')).toBe('correctness');
  });

  it('makeSuggestion derives severity from the (normalised) category', () => {
    expect(makeSuggestion({ offset: 0, length: 1, category: 'Spelling', source: 'harper' }).severity).toBe('correctness');
    expect(makeSuggestion({ offset: 0, length: 1, category: 'Spelling', source: 'byok' }).severity).toBe('correctness');
    expect(makeSuggestion({ offset: 0, length: 1, category: 'Style', source: 'byok' }).severity).toBe('suggestion');
  });

  it('makeSuggestion honors an explicit severity override', () => {
    expect(makeSuggestion({ offset: 0, length: 1, severity: 'suggestion' }).severity).toBe('suggestion');
  });
});
