import { describe, it, expect } from 'vitest';
import { plainLintToSuggestion } from '../src/core/providers/harper-mapping';

const base = { start: 0, end: 3, replacements: ['the'], message: 'msg' };

describe('plainLintToSuggestion', () => {
  it('maps span→offset/length, ruleName→ruleId, kind→category', () => {
    const s = plainLintToSuggestion({ ...base, kind: 'Spelling', ruleName: 'SpellCheck' });
    expect(s).toMatchObject({ offset: 0, length: 3, replacements: ['the'], source: 'harper' });
    expect(s.ruleId).toBe('SpellCheck');
    expect(s.category).toBe('Spelling');
  });
  it('derives correctness severity from the category (kind), not the rule name', () => {
    expect(plainLintToSuggestion({ ...base, kind: 'Spelling', ruleName: 'SpellCheck' }).severity).toBe('correctness');
    expect(plainLintToSuggestion({ ...base, kind: 'Readability', ruleName: 'SomeStyleRule' }).severity).toBe('clarity');
  });
  it('preserves empty replacement (Remove) and never negative length', () => {
    const s = plainLintToSuggestion({ start: 5, end: 5, replacements: [''], message: '', kind: 'Redundancy', ruleName: 'Foo' });
    expect(s.length).toBe(0);
    expect(s.replacements).toEqual(['']);
  });
});
