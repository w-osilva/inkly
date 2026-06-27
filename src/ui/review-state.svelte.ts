/**
 * State for the "Review suggestions" panel (Grammarly style) opened from the field
 * button. Steps through the field's issues one at a time with Accept/Dismiss and
 * prev/next, showing each correction in context (old struck through → new in bold).
 */
export interface ReviewState {
  visible: boolean;
  left: number;
  top: number;
  /** 1-based position for display, and total count. */
  index: number;
  total: number;
  category: string;
  title: string;
  before: string;
  oldText: string;
  replacement: string;
  after: string;
  /** All candidate replacements (Harper often returns several, e.g. would/wood). */
  replacements: string[];
  /** No replacement available → Accept is disabled (e.g. analysis-only flags). */
  canAccept: boolean;
  onAccept: (() => void) | null;
  /** Apply a specific candidate (when more than one is offered). */
  onPick: ((replacement: string) => void) | null;
  onDismiss: (() => void) | null;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onClose: (() => void) | null;
}

export const reviewState = $state<ReviewState>({
  visible: false,
  left: 0,
  top: 0,
  index: 0,
  total: 0,
  category: '',
  title: '',
  before: '',
  oldText: '',
  replacement: '',
  after: '',
  replacements: [],
  canAccept: false,
  onAccept: null,
  onPick: null,
  onDismiss: null,
  onPrev: null,
  onNext: null,
  onClose: null,
});
