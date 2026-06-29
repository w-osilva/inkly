import type { SuggestionSource } from './types';

/**
 * The user-facing "tools", grouped by feature. The correction tools all produce inline
 * underlines and can overlap, so their order here is the PRIORITY (first = wins overlaps).
 * The user can reorder and toggle them (see Settings.correctionOrder / correctionDisabled),
 * and the merge reads that order instead of the static SOURCE_PRIORITY. Each maps to the
 * Suggestion source(s) it emits, and carries a privacy scope for the UI badge.
 */
export type ToolScope = 'local' | 'server' | 'mixed';

export interface CorrectionTool {
  id: string;
  sources: SuggestionSource[];
  scope: ToolScope;
  /** Broad grammar/spelling engine — these overlap each other (Harper/LanguageTool/Proofreader). */
  broadGrammar?: boolean;
}

export const CORRECTION_TOOLS: CorrectionTool[] = [
  { id: 'harper', sources: ['harper'], scope: 'local', broadGrammar: true },
  { id: 'punctuation', sources: ['inkly'], scope: 'local' },
  { id: 'languagetool', sources: ['languagetool'], scope: 'server', broadGrammar: true },
  { id: 'proofreader', sources: ['chrome-proofread'], scope: 'local', broadGrammar: true },
  { id: 'aiImprove', sources: ['byok', 'chrome-ai'], scope: 'mixed' },
];

/** Ids of the broad grammar engines that overlap one another. */
export const BROAD_GRAMMAR_TOOLS: string[] = CORRECTION_TOOLS.filter((t) => t.broadGrammar).map((t) => t.id);

/** Selection-toolbar actions, in default display order. */
export const SELECTION_ACTIONS = ['rewrite', 'improve', 'synonyms', 'define', 'translate'] as const;
export type SelectionAction = (typeof SELECTION_ACTIONS)[number];

export const DEFAULT_CORRECTION_ORDER: string[] = CORRECTION_TOOLS.map((t) => t.id);

const TOOL_BY_ID = new Map(CORRECTION_TOOLS.map((t) => [t.id, t]));

/** Map a suggestion source back to its tool id (for enable/disable filtering). */
export function toolIdForSource(source: SuggestionSource): string | undefined {
  return CORRECTION_TOOLS.find((t) => t.sources.includes(source))?.id;
}

/**
 * Build a source→rank map from the user's tool order (first = highest rank). Sources whose
 * tool isn't listed fall back to the caller's default. Used to override SOURCE_PRIORITY.
 */
export function priorityFromOrder(order: string[]): Partial<Record<SuggestionSource, number>> {
  const map: Partial<Record<SuggestionSource, number>> = {};
  const n = order.length;
  order.forEach((id, i) => {
    const tool = TOOL_BY_ID.get(id);
    if (!tool) return;
    const rank = n - i; // earlier in the list ⇒ higher rank ⇒ wins overlaps
    for (const src of tool.sources) map[src] = rank;
  });
  return map;
}

/** Reconcile a stored order with the known tools: keep valid ids in order, append any new ones. */
export function normalizeOrder(stored: unknown): string[] {
  const valid = new Set(DEFAULT_CORRECTION_ORDER);
  const seen = new Set<string>();
  const out: string[] = [];
  if (Array.isArray(stored)) {
    for (const id of stored) {
      if (typeof id === 'string' && valid.has(id) && !seen.has(id)) { out.push(id); seen.add(id); }
    }
  }
  for (const id of DEFAULT_CORRECTION_ORDER) if (!seen.has(id)) out.push(id);
  return out;
}
