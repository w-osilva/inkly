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
  count: number;
  /** Highest-priority severity among current issues — drives the badge color. */
  severity: Severity;
  onOpen: (() => void) | null;
}

export const fieldButtonState = $state<FieldButtonState>({
  visible: false,
  left: 0,
  top: 0,
  count: 0,
  severity: 'correctness',
  onOpen: null,
});
