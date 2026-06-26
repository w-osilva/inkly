import type { Suggestion, Severity } from '../core/types';
import type { Lang } from '../core/i18n';

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
  dictionaryWord: string | null;
  onAddToDictionary: (() => void) | null;
  lang: Lang;
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
  dictionaryWord: null,
  onAddToDictionary: null,
  lang: 'en',
});
