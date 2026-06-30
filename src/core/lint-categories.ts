import type { Severity } from './types';

/** The 20 Harper LintKind categories (from `lint.lint_kind()`), for settings UI. They double
 * as inkly's canonical taxonomy: every engine (Harper, LanguageTool, punctuation, AI) maps
 * its native label into this set via {@link normalizeCategory}, so a finding is classified —
 * and coloured — the same regardless of which layer produced it. */
export const LINT_CATEGORIES = [
  'Agreement', 'BoundaryError', 'Capitalization', 'Eggcorn', 'Enhancement',
  'Formatting', 'Grammar', 'Malapropism', 'Miscellaneous', 'Nonstandard',
  'Punctuation', 'Readability', 'Redundancy', 'Regionalism', 'Repetition',
  'Spelling', 'Style', 'Typo', 'Usage', 'WordChoice',
] as const;

export type LintCategory = (typeof LINT_CATEGORIES)[number];

/**
 * Severity is a property of the TYPE, not the engine — the LanguageTool-style reference table.
 * Objective errors are 'correctness' (red), readability/word issues 'clarity' (amber), and
 * subjective polish 'suggestion' (indigo).
 */
const CATEGORY_SEVERITY: Record<LintCategory, Severity> = {
  Spelling: 'correctness',
  Typo: 'correctness',
  Grammar: 'correctness',
  Agreement: 'correctness',
  Punctuation: 'correctness',
  Capitalization: 'correctness',
  BoundaryError: 'correctness',
  Malapropism: 'correctness',
  Eggcorn: 'correctness',
  Nonstandard: 'correctness',
  Usage: 'clarity',
  WordChoice: 'clarity',
  Redundancy: 'clarity',
  Repetition: 'clarity',
  Readability: 'clarity',
  Regionalism: 'clarity',
  Formatting: 'clarity',
  Style: 'suggestion',
  Enhancement: 'suggestion',
  Miscellaneous: 'suggestion',
};

const CANONICAL = new Set<string>(LINT_CATEGORIES);

// Raw labels from other engines → canonical category. Keyed lowercase. Covers LanguageTool
// `issueType` values (ITS standard) and common category-name / AI synonyms.
const ALIASES: Record<string, LintCategory> = {
  // LanguageTool issueType (https://languagetool.org)
  misspelling: 'Spelling',
  typographical: 'Punctuation',
  whitespace: 'Punctuation',
  punctuation: 'Punctuation',
  grammar: 'Grammar',
  duplication: 'Repetition',
  style: 'Style',
  register: 'Style',
  'locale-violation': 'Style',
  inconsistency: 'Style',
  uncategorized: 'Grammar',
  // common category-name / AI / misc synonyms
  typo: 'Typo',
  spelling: 'Spelling',
  casing: 'Capitalization',
  capitalization: 'Capitalization',
  agreement: 'Agreement',
  redundancy: 'Redundancy',
  repetition: 'Repetition',
  wordchoice: 'WordChoice',
  'word choice': 'WordChoice',
  collocations: 'WordChoice',
  readability: 'Readability',
  clarity: 'Readability',
  usage: 'Usage',
  formatting: 'Formatting',
  typography: 'Punctuation',
  enhancement: 'Enhancement',
};

/** Map any engine's raw category/issueType/kind string onto a canonical category. */
export function normalizeCategory(raw: string | undefined | null): LintCategory {
  if (raw && CANONICAL.has(raw)) return raw as LintCategory;
  const key = (raw ?? '').trim().toLowerCase();
  return ALIASES[key] ?? 'Grammar';
}

/** The severity for a category, after normalising it — the single source of truth. */
export function severityForCategory(category: string | undefined | null): Severity {
  return CATEGORY_SEVERITY[normalizeCategory(category)];
}
