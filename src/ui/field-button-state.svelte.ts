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
  /** Unified suggestion count (rules + AI verification tier). */
  count: number;
  /** The AI verification pass is in flight — show a spinner on the widget. */
  improveLoading: boolean;
  /** Highest-priority severity among grammar issues — drives the main badge color. */
  severity: Severity;
  /** Open the suggestions review. */
  onOpen: (() => void) | null;
}

export const fieldButtonState = $state<FieldButtonState>({
  visible: false,
  left: 0,
  top: 0,
  count: 0,
  improveLoading: false,
  severity: 'correctness',
  onOpen: null,
});
