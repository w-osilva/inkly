import type { AICapability } from '../core/ai/ai-types';

export type AIPanelPhase = 'hidden' | 'actions' | 'rewrite-config' | 'loading' | 'result' | 'error';

export interface AIPanelState {
  phase: AIPanelPhase;
  /** Initial guess; the panel self-corrects from `anchor` after measuring its real size. */
  left: number;
  top: number;
  /** The rect the panel is anchored to (selection or widget), in viewport coords. The
   * panel positions below it, flips above when it doesn't fit, and clamps to the viewport. */
  anchor: { left: number; top: number; width: number; height: number };
  result: string;
  streamingText: string;
  error: string;
  onAction: ((capability: AICapability) => void) | null;
  onPickSynonym: ((word: string) => void) | null;
  /** 'improve' result: applicable edits (old → new + reason), each applied by index. */
  improvements: Array<{ from: string; to: string; reason: string }>;
  onApplyImprovement: ((index: number) => void) | null;
  capability: AICapability;
  /** 'word' = a single token selected (Synonyms-first); 'phrase' = multi-word (Rewrite-first). */
  selectionKind: 'word' | 'phrase';
  /** Selection-action ids the user disabled — hidden from the toolbar tabs. */
  disabledActions: string[];
  onApply: (() => void) | null;
  onCopy: (() => void) | null;
  onDismiss: (() => void) | null;
  /** Header × — dismiss the panel and suppress reopening for the same selection. */
  onClose: (() => void) | null;
  hovered: boolean;
  tone: string;
  length: string;
  onSetTone: ((tone: string) => void) | null;
  onSetLength: ((length: string) => void) | null;
}

export const aiPanelState = $state<AIPanelState>({
  phase: 'hidden',
  left: 0,
  top: 0,
  anchor: { left: 0, top: 0, width: 0, height: 0 },
  result: '',
  streamingText: '',
  error: '',
  onAction: null,
  onPickSynonym: null,
  improvements: [],
  onApplyImprovement: null,
  capability: 'rewrite',
  selectionKind: 'phrase',
  disabledActions: [],
  onApply: null,
  onCopy: null,
  onDismiss: null,
  onClose: null,
  hovered: false,
  tone: '',
  length: 'asis',
  onSetTone: null,
  onSetLength: null,
});
