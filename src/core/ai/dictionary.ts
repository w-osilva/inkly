/**
 * Free, key-less word definitions via the Free Dictionary API (dictionaryapi.dev,
 * Wiktionary-based, CORS-enabled). Returns a concise text definition, or null when the
 * word isn't found / on any error — so the caller can fall back to AI. Single words only.
 * `fetchFn` is injectable for tests.
 */
interface DictMeaning {
  partOfSpeech?: string;
  definitions?: Array<{ definition?: string; example?: string }>;
}
interface DictEntry {
  word?: string;
  phonetic?: string;
  meanings?: DictMeaning[];
}

export function formatDictionary(json: unknown): string | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const entry = json[0] as DictEntry;
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  const lines: string[] = [];
  for (const m of meanings.slice(0, 3)) {
    const def = m.definitions?.find((d) => typeof d.definition === 'string' && d.definition)?.definition;
    if (def) lines.push(`${m.partOfSpeech ? `${m.partOfSpeech}: ` : ''}${def}`);
  }
  return lines.length ? lines.join('\n') : null;
}

export async function lookupDefinition(
  word: string,
  lang = 'en',
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const w = word.trim();
  if (!w || /\s/.test(w)) return null; // single word only
  try {
    const res = await fetchFn(`https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(w)}`);
    if (!res.ok) return null;
    return formatDictionary(await res.json());
  } catch {
    return null;
  }
}
