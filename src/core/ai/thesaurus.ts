/**
 * Free, key-less synonyms via the Datamuse API (api.datamuse.com, CORS-enabled, no key).
 * `rel_syn` returns true synonyms for a word; we return them as a flat comma list (which
 * `parseSynonymGroups` renders as one group), or null when there are none / on any error —
 * so the caller can fall back to AI for context-aware, sense-grouped synonyms. Datamuse is
 * English-focused, so non-English words simply come back empty → AI. Single words only.
 * `fetchFn` is injectable for tests.
 */
export function formatThesaurus(json: unknown, max = 8): string | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const words = json
    .map((e) => (e && typeof e === 'object' ? (e as { word?: unknown }).word : undefined))
    .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    .map((w) => w.trim())
    .slice(0, max);
  return words.length ? words.join(', ') : null;
}

export async function lookupSynonyms(
  word: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const w = word.trim();
  if (!w || /\s/.test(w)) return null; // single word only
  try {
    const res = await fetchFn(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(w)}&max=12`);
    if (!res.ok) return null;
    return formatThesaurus(await res.json());
  } catch {
    return null;
  }
}
