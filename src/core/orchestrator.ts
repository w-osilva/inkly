import { Suggestion, SOURCE_PRIORITY } from './types';

function overlaps(a: Suggestion, b: Suggestion): boolean {
  const aEnd = a.offset + a.length;
  const bEnd = b.offset + b.length;
  return a.offset < bEnd && b.offset < aEnd;
}

/**
 * Produce a non-overlapping, offset-sorted list. When two suggestions overlap,
 * the higher SOURCE_PRIORITY wins; ties go to the earlier offset.
 */
export function mergeSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const sorted = [...suggestions].sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
  });

  const kept: Suggestion[] = [];
  for (const candidate of sorted) {
    const conflict = kept.find((k) => overlaps(k, candidate));
    if (!conflict) {
      kept.push(candidate);
      continue;
    }
    // Replace the kept one only if the candidate has strictly higher priority.
    if (SOURCE_PRIORITY[candidate.source] > SOURCE_PRIORITY[conflict.source]) {
      kept.splice(kept.indexOf(conflict), 1, candidate);
    }
  }
  return kept.sort((a, b) => a.offset - b.offset);
}
