export interface Improvement {
  original: string;
  improved: string;
  reason: string;
}

/**
 * Parse the model's "improve" reply into improvement objects. Tolerant of code fences
 * and surrounding prose: extracts the first JSON array and keeps well-formed entries
 * whose `original`/`improved` are non-empty strings.
 */
export function parseImprovements(raw: string): Improvement[] {
  if (!raw) return [];
  let text = raw.trim();
  // strip ```json ... ``` fences if present
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // otherwise narrow to the outermost [ ... ]
  if (text[0] !== '[') {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) return [];
    text = text.slice(start, end + 1);
  }
  let arr: unknown;
  try {
    arr = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: Improvement[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const original = typeof o.original === 'string' ? o.original : '';
    const improved = typeof o.improved === 'string' ? o.improved : '';
    const reason = typeof o.reason === 'string' ? o.reason : '';
    if (original && improved && original !== improved) out.push({ original, improved, reason });
  }
  return out;
}
