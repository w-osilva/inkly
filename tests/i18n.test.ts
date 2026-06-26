import { describe, it, expect } from 'vitest';
import { t, categoryLabel, detectLang, MESSAGES } from '../src/core/i18n';
import { LINT_CATEGORIES } from '../src/core/lint-categories';

describe('t', () => {
  it('returns the message for the given language', () => {
    expect(t('en', 'card.dismiss')).toBe('Dismiss');
    expect(t('pt-br', 'card.dismiss')).toBe('Dispensar');
  });
  it('falls back to the key itself for an unknown key', () => {
    expect(t('pt-br', 'totally.unknown.key')).toBe('totally.unknown.key');
  });
  it('interpolates {vars}', () => {
    expect(t('en', 'card.addToDictionary', { word: 'inkly' })).toBe('Add “inkly” to dictionary');
    expect(t('pt-br', 'card.addToDictionary', { word: 'inkly' })).toBe('Adicionar “inkly” ao dicionário');
  });
});

describe('categoryLabel', () => {
  it('translates known categories', () => {
    expect(categoryLabel('en', 'Spelling')).toBe('Spelling');
    expect(categoryLabel('pt-br', 'Spelling')).toBe('Ortografia');
    expect(categoryLabel('pt-br', 'Agreement')).toBe('Concordância');
  });
  it('falls back to the raw category name when unknown', () => {
    expect(categoryLabel('pt-br', 'Florbtastic')).toBe('Florbtastic');
  });
});

describe('detectLang', () => {
  it('maps pt* locales to pt-br, everything else to en', () => {
    expect(detectLang('pt-BR')).toBe('pt-br');
    expect(detectLang('pt')).toBe('pt-br');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang('')).toBe('en');
  });
});

describe('i18n dictionary parity', () => {
  it('en and pt-br have identical key sets', () => {
    const en = Object.keys(MESSAGES.en).sort();
    const pt = Object.keys(MESSAGES['pt-br']).sort();
    expect(pt).toEqual(en);
  });
  it('every LINT_CATEGORIES entry has a translation in both locales', () => {
    for (const cat of LINT_CATEGORIES) {
      expect(MESSAGES.en[`category.${cat}`], `en missing category.${cat}`).toBeTruthy();
      expect(MESSAGES['pt-br'][`category.${cat}`], `pt-br missing category.${cat}`).toBeTruthy();
    }
  });
});
