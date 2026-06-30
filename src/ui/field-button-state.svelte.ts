import type { Severity } from '../core/types';

/**
 * State for the persistent per-field button (Grammarly/LanguageTool style):
 * a small widget anchored to the bottom-right of the tracked editable field,
 * showing the live issue count. Stays visible even after the field loses focus.
 */
export interface FieldButtonState {
  visible: boolean;
  left: number;
  /** Distance from the viewport's right edge to the widget's right edge (px). The widget is
   * right-anchored so its hover pill can expand leftwards without shifting or clipping. */
  right: number;
  top: number;
  /** Unified suggestion count (rules + AI verification tier). */
  count: number;
  /** The AI verification pass is in flight — show a spinner on the widget. */
  improveLoading: boolean;
  /** Highest-priority severity among grammar issues — drives the main badge color. */
  severity: Severity;
  /** Open the grammar review. */
  onOpen: (() => void) | null;
  /** Turn inkly off for the current site (from the widget menu). */
  onDisableSite: (() => void) | null;
}

export const fieldButtonState = $state<FieldButtonState>({
  visible: false,
  left: 0,
  right: 0,
  top: 0,
  count: 0,
  improveLoading: false,
  severity: 'correctness',
  onOpen: null,
  onDisableSite: null,
});
