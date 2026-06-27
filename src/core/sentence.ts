/**
 * Expand a [start, end) selection to the full sentence(s) it overlaps, so AI actions
 * like rewrite/analyze operate on whole sentences even when the user only selected a
 * word. Boundaries are `.`, `!`, `?`, or a newline. Leading whitespace is trimmed; a
 * sentence-final punctuation mark is included, a newline is not.
 */
export function expandToSentence(text: string, start: number, end: number): { start: number; end: number } {
  const isBoundary = (ch: string) => ch === '.' || ch === '!' || ch === '?' || ch === '\n';
  const len = text.length;
  let s = Math.max(0, Math.min(start, len));
  let e = Math.max(s, Math.min(end, len));
  // Walk left to just after the previous boundary (or string start).
  while (s > 0 && !isBoundary(text[s - 1])) s--;
  // Skip whitespace at the sentence head.
  while (s < e && /\s/.test(text[s])) s++;
  // Walk right to the next boundary (or string end).
  while (e < len && !isBoundary(text[e])) e++;
  // Include a terminal punctuation mark, but not a trailing newline.
  if (e < len && isBoundary(text[e]) && text[e] !== '\n') e++;
  return { start: s, end: e };
}

/** True when the trimmed text is a single token (no internal whitespace). */
export function isSingleWord(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && !/\s/.test(t);
}
