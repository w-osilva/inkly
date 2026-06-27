import { describe, it, expect } from 'vitest';
import { expandToSentence, isSingleWord } from '../src/core/sentence';

describe('expandToSentence', () => {
  it('expands a word selection to its full sentence', () => {
    const text = 'I has a apple. He go home.';
    // select "has" (offset 2..5)
    expect(expandToSentence(text, 2, 5)).toEqual({ start: 0, end: 14 }); // "I has a apple."
  });
  it('picks the second sentence when the selection is inside it', () => {
    const text = 'I has a apple. He go home.';
    const r = expandToSentence(text, 18, 20); // "go"
    expect(text.slice(r.start, r.end)).toBe('He go home.');
  });
  it('handles text with no terminator (whole string)', () => {
    expect(expandToSentence('hello world', 6, 11)).toEqual({ start: 0, end: 11 });
  });
  it('uses newline as a boundary and trims the head whitespace', () => {
    const text = 'first line\n  second line here';
    const r = expandToSentence(text, 20, 26); // "d line" within second line
    expect(text.slice(r.start, r.end)).toBe('second line here');
  });
});

describe('isSingleWord', () => {
  it('true for a single token', () => {
    expect(isSingleWord('pizza')).toBe(true);
    expect(isSingleWord('  pizza  ')).toBe(true);
  });
  it('false for a phrase or empty', () => {
    expect(isSingleWord('an pizza')).toBe(false);
    expect(isSingleWord('   ')).toBe(false);
  });
});
