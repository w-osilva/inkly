import { describe, it, expect } from 'vitest';
import { checkPunctuation } from '../src/core/punctuation';

const ruleAt = (text: string, rule: string) => checkPunctuation(text).filter((s) => s.ruleId === rule);

describe('checkPunctuation', () => {
  it('flags repeated terminal punctuation and suggests a single mark', () => {
    const s = ruleAt('This is great!!!', 'RepeatedPunctuation');
    expect(s).toHaveLength(1);
    expect(s[0].replacements).toEqual(['!']);
    expect('This is great!!!'.slice(s[0].offset, s[0].offset + s[0].length)).toBe('!!!');
  });

  it('flags a space before .!?;:', () => {
    const s = ruleAt('Hello world .', 'SpaceBeforePunctuation');
    expect(s).toHaveLength(1);
    expect(s[0].replacements).toEqual(['.']);
  });

  it('flags a missing space after , ; ! ? before a letter', () => {
    const s = ruleAt('I went home,then slept', 'SpaceAfterPunctuation');
    expect(s).toHaveLength(1);
    expect(s[0].replacements).toEqual([', t']);
  });

  it('does NOT flag decimals, abbreviations, or ellipsis', () => {
    expect(checkPunctuation('It costs 3,000 and pi is 3.14.')).toEqual([]);
    expect(checkPunctuation('See e.g. the U.S.A. example.')).toEqual([]);
    expect(checkPunctuation('Wait... what?')).toEqual([]);
  });

  it('marks punctuation issues as correctness suggestions from the inkly source', () => {
    const s = checkPunctuation('great!!!')[0];
    expect(s.source).toBe('inkly');
    expect(s.severity).toBe('correctness');
    expect(s.category).toBe('Punctuation');
  });
});
