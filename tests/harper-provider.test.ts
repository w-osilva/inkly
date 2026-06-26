import { describe, it, expect } from 'vitest';
import { plainLintToSuggestion } from '../src/core/providers/harper-provider';
import type { PlainLint } from '../src/entrypoints/harper-worker';

describe('plainLintToSuggestion', () => {
  it('maps span {start,end} to offset/length', () => {
    const lint: PlainLint = {
      start: 7,
      end: 14,
      replacements: ['an apple'],
      message: 'Use "an" before a vowel sound.',
      kind: 'Agreement',
    };
    const s = plainLintToSuggestion(lint);
    expect(s.offset).toBe(7);
    expect(s.length).toBe(7);
    expect(s.replacements).toEqual(['an apple']);
    expect(s.category).toBe('Agreement');
    expect(s.source).toBe('harper');
  });

  it('clamps negative length to 0', () => {
    const lint: PlainLint = { start: 5, end: 5, replacements: [], message: '', kind: 'Spelling' };
    expect(plainLintToSuggestion(lint).length).toBe(0);
  });

  it('maps correctness categories to a correctness severity', () => {
    const lint: PlainLint = { start: 0, end: 3, replacements: ['the'], message: 'm', kind: 'Typo' };
    expect(plainLintToSuggestion(lint).severity).toBe('correctness');
  });

  it('preserves Harper Remove suggestions (empty-string replacement)', () => {
    const lint: PlainLint = { start: 0, end: 4, replacements: [''], message: 'redundant', kind: 'Redundancy' };
    const s = plainLintToSuggestion(lint);
    expect(s.replacements).toEqual(['']);
    // Redundancy is not a correctness category -> 'clarity'
    expect(s.severity).toBe('clarity');
  });
});
