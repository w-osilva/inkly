import type { AICapability } from '../core/ai/ai-types';

export type AIPanelPhase = 'hidden' | 'actions' | 'loading' | 'result' | 'error';

export interface AIPanelState {
  phase: AIPanelPhase;
  left: number;
  top: number;
  result: string;
  streamingText: string;
  error: string;
  onAction: ((capability: AICapability) => void) | null;
  onPickSynonym: ((word: string) => void) | null;
  capability: AICapability;
  /** 'word' = a single token selected (Synonyms-first); 'phrase' = multi-word (Rewrite-first). */
  selectionKind: 'word' | 'phrase';
  onApply: (() => void) | null;
  onCopy: (() => void) | null;
  onDismiss: (() => void) | null;
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
  result: '',
  streamingText: '',
  error: '',
  onAction: null,
  onPickSynonym: null,
  capability: 'rewrite',
  selectionKind: 'phrase',
  onApply: null,
  onCopy: null,
  onDismiss: null,
  hovered: false,
  tone: '',
  length: 'asis',
  onSetTone: null,
  onSetLength: null,
});
