import { Suggestion, makeSuggestion } from '../types';
import { PlainLint } from './harper-messages';

/**
 * Map a Harper PlainLint to our universal Suggestion.
 * - span {start,end} (char indices) -> offset = start, length = end - start
 * - '' replacements (Harper Remove) are preserved; apply-engine treats them as delete
 * - category = lint.lint_kind(); severityFor() (inside makeSuggestion) derives severity
 */
export function plainLintToSuggestion(lint: PlainLint): Suggestion {
  return makeSuggestion({
    offset: lint.start,
    length: Math.max(0, lint.end - lint.start),
    replacements: lint.replacements,
    message: lint.message,
    ruleId: lint.ruleName,
    category: lint.kind,
    source: 'harper',
  });
}
