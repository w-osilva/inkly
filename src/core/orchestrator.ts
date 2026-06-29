import { Suggestion, SuggestionSource, SOURCE_PRIORITY } from './types';

function overlaps(a: Suggestion, b: Suggestion): boolean {
  const aEnd = a.offset + a.length;
  const bEnd = b.offset + b.length;
  return a.offset < bEnd && b.offset < aEnd;
}

/**
 * Produce a non-overlapping, offset-sorted list. When two suggestions overlap, the higher
 * priority wins; ties go to the earlier offset. Priority defaults to the static
 * SOURCE_PRIORITY, but callers can pass an override map (e.g. the user's reorderable tool
 * priority) — any source missing from the override falls back to SOURCE_PRIORITY.
 */
export function mergeSuggestions(
  suggestions: Suggestion[],
  priorityOverride?: Partial<Record<SuggestionSource, number>>,
): Suggestion[] {
  const rank = (s: SuggestionSource) => priorityOverride?.[s] ?? SOURCE_PRIORITY[s];
  const sorted = [...suggestions].sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return rank(b.source) - rank(a.source);
  });

  const kept: Suggestion[] = [];
  for (const candidate of sorted) {
    const conflicts = kept.filter((k) => overlaps(k, candidate));
    if (conflicts.length === 0) {
      kept.push(candidate);
      continue;
    }
    if (conflicts.every((c) => rank(candidate.source) > rank(c.source))) {
      for (const c of conflicts) kept.splice(kept.indexOf(c), 1);
      kept.push(candidate);
    }
  }
  return kept.sort((a, b) => a.offset - b.offset);
}
