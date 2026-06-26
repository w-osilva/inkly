import type { AICapability } from '../core/ai/ai-types';

export type AIPanelPhase = 'hidden' | 'actions' | 'loading' | 'result' | 'error';

export interface AIPanelState {
  phase: AIPanelPhase;
  left: number;
  top: number;
  result: string;
  error: string;
  onAction: ((capability: 'rewrite' | 'translate') => void) | null;
  capability: AICapability;
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
  error: '',
  onAction: null,
  capability: 'rewrite',
  onApply: null,
  onCopy: null,
  onDismiss: null,
  hovered: false,
  tone: '',
  length: 'asis',
  onSetTone: null,
  onSetLength: null,
});
