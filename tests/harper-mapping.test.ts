import { describe, it, expect } from 'vitest';
import { plainLintToSuggestion } from '../src/core/providers/harper-mapping';

describe('plainLintToSuggestion', () => {
  it('maps span to offset/length and copies replacements/message', () => {
    const s = plainLintToSuggestion({
      start: 5, end: 8, replacements: ['the'], message: 'Spelling: "teh"', kind: 'Spelling',
    });
    expect(s).toMatchObject({ offset: 5, length: 3, replacements: ['the'], source: 'harper' });
    expect(s.ruleId).toBe('Spelling');
    expect(s.category).toBe('Spelling');
  });

  it('derives correctness severity for spelling/grammar kinds', () => {
    expect(plainLintToSuggestion({ start: 0, end: 1, replacements: [], message: '', kind: 'Spelling' }).severity).toBe('correctness');
    expect(plainLintToSuggestion({ start: 0, end: 1, replacements: [], message: '', kind: 'Agreement' }).severity).toBe('correctness');
  });

  it('derives clarity severity for style kinds', () => {
    expect(plainLintToSuggestion({ start: 0, end: 1, replacements: [], message: '', kind: 'Readability' }).severity).toBe('clarity');
  });

  it('preserves an empty replacement (Harper Remove)', () => {
    expect(plainLintToSuggestion({ start: 2, end: 5, replacements: [''], message: 'remove', kind: 'Redundancy' }).replacements).toEqual(['']);
  });

  it('never produces negative length', () => {
    expect(plainLintToSuggestion({ start: 5, end: 5, replacements: [], message: '', kind: 'Typo' }).length).toBe(0);
  });
});
