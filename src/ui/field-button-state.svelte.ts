import type { Severity } from '../core/types';

/**
 * State for the persistent per-field button (Grammarly/LanguageTool style):
 * a small widget anchored to the bottom-right of the tracked editable field,
 * showing the live issue count. Stays visible even after the field loses focus.
 */
export interface FieldButtonState {
  visible: boolean;
  left: number;
  top: number;
  /** Grammar/spelling issue count (Harper). */
  count: number;
  /** AI writing-improvement count (shown as a separate indigo badge). */
  improveCount: number;
  /** Highest-priority severity among grammar issues — drives the main badge color. */
  severity: Severity;
  /** Open the grammar review (the ink-drop button). */
  onOpen: (() => void) | null;
  /** Open / run AI writing improvements (the separate ✨ button). */
  onOpenImprove: (() => void) | null;
}

export const fieldButtonState = $state<FieldButtonState>({
  visible: false,
  left: 0,
  top: 0,
  count: 0,
  improveCount: 0,
  severity: 'correctness',
  onOpen: null,
  onOpenImprove: null,
});
