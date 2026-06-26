/** Parse a model's synonym output (comma/newline list, possibly numbered/quoted) into clean words, max 6. */
export function parseSynonyms(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) =>
      s
        .trim()
        .replace(/^\d+[.)]\s*/, '') // leading "1." / "2)"
        .replace(/^["'""']+|["'""']+$/g, '') // surrounding quotes
        .replace(/[.,;:]+$/, '') // trailing punctuation
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 6);
}
