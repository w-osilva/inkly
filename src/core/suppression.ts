import { Suggestion } from './types';

/** Categories for which a personal-dictionary entry should suppress the flag. */
const DICTIONARY_CATEGORIES = new Set(['Spelling', 'Typo']);

/** Returns true when `category` is one that the personal dictionary can suppress. */
export function isDictionaryCategory(category: string): boolean {
  return DICTIONARY_CATEGORIES.has(category);
}

/**
 * Whether a suggestion should be hidden given the user's disabled categories
 * and personal dictionary. `coveredText` is the field text under the suggestion
 * span; `dictionary` holds lowercased words.
 */
export function isSuppressed(
  suggestion: Suggestion,
  coveredText: string,
  disabledCategories: ReadonlySet<string>,
  dictionary: ReadonlySet<string>,
): boolean {
  if (disabledCategories.has(suggestion.category)) return true;
  if (
    DICTIONARY_CATEGORIES.has(suggestion.category) &&
    dictionary.has(coveredText.trim().toLowerCase())
  ) {
    return true;
  }
  return false;
}
