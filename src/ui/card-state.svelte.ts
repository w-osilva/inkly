import type { Suggestion, Severity } from '../core/types';

export interface CardState {
  visible: boolean;
  suggestion: Suggestion | null;
  left: number;
  top: number;
  severity: Severity;
  onApply: ((replacement: string) => void) | null;
  onDismiss: (() => void) | null;
  /** Set by the card on mouseenter/leave so the controller knows not to hide it. */
  hovered: boolean;
}

export const cardState = $state<CardState>({
  visible: false,
  suggestion: null,
  left: 0,
  top: 0,
  severity: 'correctness',
  onApply: null,
  onDismiss: null,
  hovered: false,
});
