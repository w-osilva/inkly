import { Severity } from '../core/types';
import { UnderlineStyle } from './underline-layout';

/** Solid underline color per severity (Inkly palette) — consistent style, distinct hue. */
const SEVERITY_COLOR: Record<Severity, string> = {
  correctness: '#E5484D',
  clarity: '#E0A30C',
  suggestion: '#6366F1',
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
      node.style.background = SEVERITY_COLOR[s.severity];
      node.style.pointerEvents = 'none';
      this.layer.appendChild(node);
    }
  }

  clear(): void {
    this.layer.querySelectorAll('.inkly-underline').forEach((n) => n.remove());
  }
}
