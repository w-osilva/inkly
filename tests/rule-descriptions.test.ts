import { describe, it, expect } from 'vitest';
import { ruleExplanation, RULE_DESCRIPTIONS_PT } from '../src/core/rule-descriptions';

describe('ruleExplanation', () => {
  it('returns the PT description for a known rule when lang is pt-br', () => {
    expect(ruleExplanation('pt-br', 'SpellCheck', 'live msg')).toBe(RULE_DESCRIPTIONS_PT.SpellCheck);
    expect(ruleExplanation('pt-br', 'SpellCheck', 'live msg')).toMatch(/palavras/i);
  });
  it('falls back to the live message for an untranslated rule (pt-br)', () => {
    expect(ruleExplanation('pt-br', 'SomeUnknownRule', 'live msg')).toBe('live msg');
  });
  it('always uses the live message for English (no PT substitution)', () => {
    expect(ruleExplanation('en', 'SpellCheck', 'live msg')).toBe('live msg');
  });
  it('falls back to the live message when ruleId is empty', () => {
    expect(ruleExplanation('pt-br', '', 'live msg')).toBe('live msg');
  });
});
