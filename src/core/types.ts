import { severityForCategory } from './lint-categories';

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
  | 'chrome-proofread' // on-device Chromium Proofreader API (objective corrections w/ offsets)
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

/**
 * Severity follows the canonical category taxonomy (see lint-categories) — it's a property of
 * the TYPE, not the layer that found it. So a Spelling error is 'correctness' whether Harper,
 * LanguageTool or the AI surfaced it. The category must be normalised by the engine first.
 */
export function severityFor(category: string): Severity {
  return severityForCategory(category);
}

/** Higher = wins when two suggestions overlap. Deterministic engines beat AI. */
export const SOURCE_PRIORITY: Record<SuggestionSource, number> = {
  harper: 4,
  inkly: 4,
  languagetool: 3,
  'chrome-proofread': 3, // on-device, objective — but Harper (offline baseline) wins overlaps
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
    severity: partial.severity ?? severityFor(category),
    ...partial,
  };
}
