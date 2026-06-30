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
  /** An AI improvement pass is in flight — show a spinner on the ✨ button. */
  improveLoading: boolean;
  /** Highest-priority severity among grammar issues — drives the main badge color. */
  severity: Severity;
  /** Open the grammar review. */
  onOpen: (() => void) | null;
  /** Open / run AI writing improvements. */
  onOpenImprove: (() => void) | null;
  /** Turn inkly off for the current site (from the widget menu). */
  onDisableSite: (() => void) | null;
}

export const fieldButtonState = $state<FieldButtonState>({
  visible: false,
  left: 0,
  top: 0,
  count: 0,
  improveCount: 0,
  improveLoading: false,
  severity: 'correctness',
  onOpen: null,
  onOpenImprove: null,
  onDisableSite: null,
});
