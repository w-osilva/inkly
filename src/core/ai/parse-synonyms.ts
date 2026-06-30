export interface SynonymGroup {
  /** A short sense/definition for this group (empty for a flat fallback). */
  sense: string;
  words: string[];
}

/** Coerce a parsed JSON value into validated groups. Accepts an array of {sense,synonyms[]},
 * a single such object, or a flat array of strings — anything else yields []. */
function normalizeGroups(parsed: unknown): SynonymGroup[] {
  const arr = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? [parsed]
      : [];
  // A flat array of strings → one unlabelled group.
  if (arr.length && arr.every((x) => typeof x === 'string')) {
    const words = (arr as string[]).map((w) => w.trim()).filter(Boolean).slice(0, 6);
    return words.length ? [{ sense: '', words }] : [];
  }
  const groups: SynonymGroup[] = [];
  for (const o of arr) {
    const obj = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
    const list = Array.isArray(obj.synonyms) ? obj.synonyms : Array.isArray(obj.words) ? obj.words : [];
    const words = (list as unknown[])
      .filter((w): w is string => typeof w === 'string')
      .map((w) => w.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (words.length) groups.push({ sense: typeof obj.sense === 'string' ? obj.sense : '', words });
  }
  return groups.slice(0, 4);
}

/**
 * Parse synonyms grouped by sense. Prefers JSON — an array of {sense, synonyms[]}, a single
 * such object, or a flat string array. Only when the payload is NOT JSON-shaped does it fall
 * back to a flat comma/newline list (so a model that ignored the JSON instruction still
 * works). Crucially, JSON-shaped-but-broken input (e.g. a truncated stream) is salvaged by
 * extracting the complete {...} objects — never comma-split, which would render mangled
 * JSON fragments as chips.
 */
export function parseSynonymGroups(raw: string): SynonymGroup[] {
  let text = (raw ?? '').trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  if (text[0] === '[' || text[0] === '{') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Truncated/malformed JSON: salvage every complete {...} object (the cut-off trailing
      // one is simply dropped). Synonym objects have no nested braces, so this is safe.
      const salvaged: unknown[] = [];
      for (const chunk of text.match(/\{[^{}]*\}/g) ?? []) {
        try {
          salvaged.push(JSON.parse(chunk));
        } catch { /* skip the incomplete fragment */ }
      }
      parsed = salvaged;
    }
    return normalizeGroups(parsed); // JSON intent: never fall through to comma-splitting
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
