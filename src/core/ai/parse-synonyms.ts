export interface SynonymGroup {
  /** A short sense/definition for this group (empty for a flat fallback). */
  sense: string;
  words: string[];
}

/**
 * Parse synonyms grouped by sense. Prefers a JSON array of {sense, synonyms[]} (the
 * grouped prompt); falls back to a single group from a flat comma/newline list (so a
 * model that ignored the JSON instruction — e.g. on-device — still works).
 */
export function parseSynonymGroups(raw: string): SynonymGroup[] {
  let text = (raw ?? '').trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  if (text[0] === '[') {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) {
        const groups: SynonymGroup[] = arr
          .map((o) => {
            const obj = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
            const words = Array.isArray(obj.synonyms)
              ? (obj.synonyms as unknown[])
                  .filter((w): w is string => typeof w === 'string')
                  .map((w) => w.trim())
                  .filter(Boolean)
                  .slice(0, 6)
              : [];
            return { sense: typeof obj.sense === 'string' ? obj.sense : '', words };
          })
          .filter((g) => g.words.length > 0)
          .slice(0, 4);
        if (groups.length) return groups;
      }
    } catch { /* fall through to flat */ }
  }
  const flat = parseSynonyms(raw);
  return flat.length ? [{ sense: '', words: flat }] : [];
}

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
