import { type Suggestion, makeSuggestion } from './types';

/**
 * Deterministic, open-source punctuation checks that complement Harper (which already
 * handles commas and a few others). Conservative rules — chosen to keep false positives
 * low — produce the same `Suggestion` shape and merge alongside Harper's results.
 *
 * Covers: repeated terminal marks (!!!, ??, ,,), a space before .!?;:, and a missing
 * space after ,;!? when glued to a letter. Periods/colons are skipped for the
 * missing-space rule to avoid decimals, times, abbreviations, and URLs.
 */
export function checkPunctuation(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (offset: number, length: number, replacement: string, ruleId: string, message: string) => {
    out.push(makeSuggestion({
      offset, length, replacements: [replacement], message, ruleId,
      category: 'Punctuation', severity: 'correctness', source: 'inkly',
    }));
  };

  // Repeated punctuation: "!!!", "??", ",,", ";;" → a single mark. (Ellipsis "..." is left alone.)
  for (const m of text.matchAll(/([!?,;])\1+/g)) {
    add(m.index, m[0].length, m[1], 'RepeatedPunctuation', `Avoid repeated “${m[1]}”.`);
  }
  // Space before . ! ? ; : (Harper already handles the comma case).
  for (const m of text.matchAll(/\s+([.!?;:])/g)) {
    add(m.index, m[0].length, m[1], 'SpaceBeforePunctuation', 'Remove the space before the punctuation mark.');
  }
  // Missing space after , ; ! ? glued to a letter ("home,then" → "home, then").
  for (const m of text.matchAll(/([,;!?])([A-Za-z])/g)) {
    add(m.index, 2, `${m[1]} ${m[2]}`, 'SpaceAfterPunctuation', 'Add a space after the punctuation mark.');
  }
  return out;
}
