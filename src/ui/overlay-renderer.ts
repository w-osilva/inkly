import { Severity } from '../core/types';
import { UnderlineStyle } from './underline-layout';

/** Solid underline color per severity (Inkly palette) — consistent style, distinct hue. */
const SEVERITY_COLOR: Record<Severity, string> = {
  correctness: '#E5484D',
  clarity: '#E0A30C',
  suggestion: '#6366F1',
};

/** Translucent fill for the active-span highlight (shown while its card/review is open). */
const HIGHLIGHT_BG: Record<Severity, string> = {
  correctness: 'rgba(229,72,77,0.16)',
  clarity: 'rgba(224,163,12,0.18)',
  suggestion: 'rgba(99,102,241,0.16)',
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

  /** Tint the active span (the one whose card/review is open). Rects are viewport coords. */
  highlight(rects: { left: number; top: number; width: number; height: number }[], severity: Severity): void {
    this.clearHighlight();
    for (const r of rects) {
      if (r.width <= 0) continue;
      const node = document.createElement('div');
      node.className = 'inkly-highlight';
      node.style.position = 'absolute';
      node.style.left = `${r.left}px`;
      node.style.top = `${r.top}px`;
      node.style.width = `${r.width}px`;
      node.style.height = `${r.height}px`;
      node.style.borderRadius = '2px';
      node.style.background = HIGHLIGHT_BG[severity];
      node.style.pointerEvents = 'none';
      this.layer.appendChild(node);
    }
  }

  clearHighlight(): void {
    this.layer.querySelectorAll('.inkly-highlight').forEach((n) => n.remove());
  }
}
