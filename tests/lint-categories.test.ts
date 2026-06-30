import { describe, it, expect } from 'vitest';
import { normalizeCategory, severityForCategory } from '../src/core/lint-categories';

describe('normalizeCategory', () => {
  it('passes canonical categories through unchanged', () => {
    expect(normalizeCategory('Spelling')).toBe('Spelling');
    expect(normalizeCategory('WordChoice')).toBe('WordChoice');
  });
  it('maps LanguageTool issueTypes onto the canonical set', () => {
    expect(normalizeCategory('misspelling')).toBe('Spelling');
    expect(normalizeCategory('typographical')).toBe('Punctuation');
    expect(normalizeCategory('whitespace')).toBe('Punctuation');
    expect(normalizeCategory('grammar')).toBe('Grammar');
    expect(normalizeCategory('duplication')).toBe('Repetition');
    expect(normalizeCategory('register')).toBe('Style');
  });
  it('maps common synonyms case-insensitively', () => {
    expect(normalizeCategory('CASING')).toBe('Capitalization');
    expect(normalizeCategory('word choice')).toBe('WordChoice');
  });
  it('defaults the unknown to Grammar', () => {
    expect(normalizeCategory('totally-made-up')).toBe('Grammar');
    expect(normalizeCategory(undefined)).toBe('Grammar');
  });
});

describe('severityForCategory', () => {
  it('is consistent for the same type regardless of where it came from', () => {
    expect(severityForCategory('Spelling')).toBe('correctness');
    expect(severityForCategory('misspelling')).toBe('correctness'); // LT issueType → same severity
    expect(severityForCategory('Redundancy')).toBe('clarity');
    expect(severityForCategory('Style')).toBe('suggestion');
  });
});
