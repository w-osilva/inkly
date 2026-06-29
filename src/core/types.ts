export type FieldType =
  | 'textarea'
  | 'input'
  | 'contenteditable'
  | 'prosemirror'
  | 'slate'
  | 'ckeditor'
  | 'lexical'
  | 'quill'
  | 'unknown';

export type SuggestionSource =
  | 'harper'
  | 'inkly' // built-in deterministic rules (e.g. punctuation) that complement Harper
  | 'chrome-ai'
  | 'byok'
  | 'languagetool'
  | 'stub';

/** Drives the visual underline style (see severityFor + OverlayRenderer). */
export type Severity = 'correctness' | 'clarity' | 'suggestion';

export interface Suggestion {
  offset: number;       // character index where the issue starts
  length: number;       // number of characters covered
  replacements: string[]; // [''] means "remove" (Harper Remove kind)
  message: string;
  ruleId: string;
  category: string;
  severity: Severity;
  source: SuggestionSource;
}

/** Categories that represent objective errors (red underline). */
const CORRECTNESS_CATEGORIES = new Set([
  'Spelling', 'Typo', 'Grammar', 'Agreement', 'Punctuation', 'Capitalization',
]);

/**
 * Derive severity deterministically: any AI source is a subjective
 * "suggestion"; otherwise correctness categories map to 'correctness' and
 * everything else (style/clarity/unknown) maps to 'clarity'.
 */
export function severityFor(category: string, source: SuggestionSource): Severity {
  if (source === 'chrome-ai' || source === 'byok') return 'suggestion';
  return CORRECTNESS_CATEGORIES.has(category) ? 'correctness' : 'clarity';
}

/** Higher = wins when two suggestions overlap. Deterministic engines beat AI. */
export const SOURCE_PRIORITY: Record<SuggestionSource, number> = {
  harper: 4,
  inkly: 4,
  languagetool: 3,
  'chrome-ai': 2,
  byok: 2,
  stub: 1,
};

export interface ProviderContext {
  fieldType: FieldType;
  language: string;
}

export interface Provider {
  readonly source: SuggestionSource;
  check(text: string, ctx: ProviderContext): Promise<Suggestion[]>;
}

export function makeSuggestion(partial: Partial<Suggestion> & {
  offset: number;
  length: number;
}): Suggestion {
  const category = partial.category ?? 'unknown';
  const source = partial.source ?? 'stub';
  return {
    replacements: [],
    message: '',
    ruleId: '',
    category,
    source,
    severity: partial.severity ?? severityFor(category, source),
    ...partial,
  };
}
