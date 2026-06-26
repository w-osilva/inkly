import { Severity } from '../core/types';
import { UnderlineStyle } from './underline-layout';

/** Visual treatment per severity (color + dash) — the Grammarly-style distinction. */
const SEVERITY_BACKGROUND: Record<Severity, string> = {
  correctness: 'repeating-linear-gradient(90deg,#e23b3b 0 4px,#e23b3b 4px 4px)',
  clarity: 'repeating-linear-gradient(90deg,#d99100 0 2px,transparent 2px 4px)',
  suggestion: 'repeating-linear-gradient(90deg,#7b53d6 0 2px,transparent 2px 4px)',
};

/**
 * Renders custom underlines as absolutely-positioned nodes inside a layer.
 * The layer is expected to live in a Shadow DOM overlay (Task 9), positioned
 * over the editable field. We never touch the editable element itself.
 * Underline color/dash is driven by each style's severity.
 */
export class OverlayRenderer {
  constructor(private readonly layer: HTMLElement) {}

  render(styles: UnderlineStyle[]): void {
    this.clear();
    for (const s of styles) {
      const node = document.createElement('div');
      node.className = 'inkly-underline';
      node.dataset.severity = s.severity;
      node.style.position = 'absolute';
      node.style.left = `${s.left}px`;
      node.style.top = `${s.top}px`;
      node.style.width = `${s.width}px`;
      node.style.height = '2px';
      node.style.borderRadius = '1px';
      node.style.background = SEVERITY_BACKGROUND[s.severity];
      node.style.pointerEvents = 'none';
      this.layer.appendChild(node);
    }
  }

  clear(): void {
    this.layer.querySelectorAll('.inkly-underline').forEach((n) => n.remove());
  }
}
