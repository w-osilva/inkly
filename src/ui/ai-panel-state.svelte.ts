export type AIPanelPhase = 'hidden' | 'actions' | 'loading' | 'result' | 'error';

export interface AIPanelState {
  phase: AIPanelPhase;
  left: number;
  top: number;
  result: string;
  error: string;
  onRewrite: (() => void) | null;
  onApply: (() => void) | null;
  onCopy: (() => void) | null;
  onDismiss: (() => void) | null;
  hovered: boolean;
}

export const aiPanelState = $state<AIPanelState>({
  phase: 'hidden',
  left: 0,
  top: 0,
  result: '',
  error: '',
  onRewrite: null,
  onApply: null,
  onCopy: null,
  onDismiss: null,
  hovered: false,
});
