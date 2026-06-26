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
    expect(severityFor('Spelling', 'harper')).toBe('correctness');
    expect(severityFor('Grammar', 'harper')).toBe('correctness');
    expect(severityFor('Punctuation', 'harper')).toBe('correctness');
  });

  it('severityFor maps style categories to "clarity"', () => {
    expect(severityFor('Redundancy', 'harper')).toBe('clarity');
    expect(severityFor('WordChoice', 'harper')).toBe('clarity');
    expect(severityFor('Readability', 'harper')).toBe('clarity');
  });

  it('severityFor returns "suggestion" for any AI source regardless of category', () => {
    expect(severityFor('Spelling', 'byok')).toBe('suggestion');
    expect(severityFor('Grammar', 'chrome-ai')).toBe('suggestion');
  });

  it('severityFor defaults unknown categories to "clarity"', () => {
    expect(severityFor('SomethingNew', 'harper')).toBe('clarity');
  });

  it('makeSuggestion derives severity from category + source', () => {
    expect(makeSuggestion({ offset: 0, length: 1, category: 'Spelling', source: 'harper' }).severity).toBe('correctness');
    expect(makeSuggestion({ offset: 0, length: 1, category: 'Spelling', source: 'byok' }).severity).toBe('suggestion');
  });

  it('makeSuggestion honors an explicit severity override', () => {
    expect(makeSuggestion({ offset: 0, length: 1, severity: 'suggestion' }).severity).toBe('suggestion');
  });
});
