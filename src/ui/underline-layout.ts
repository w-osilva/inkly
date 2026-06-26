import { Severity } from '../core/types';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UnderlineStyle {
  left: number;
  top: number;
  width: number;
  severity: Severity;
}

/**
 * Convert text-range client rects into underline positions relative to the
 * overlay container. The underline sits at the bottom edge of each rect.
 * Multi-line ranges yield multiple rects → multiple underlines. Each style
 * carries the suggestion's severity, which drives its color/dash (renderer).
 */
export function computeUnderlineStyles(
  rects: Rect[],
  container: Rect,
  severity: Severity,
): UnderlineStyle[] {
  return rects
    .filter((r) => r.width > 0)
    .map((r) => ({
      left: r.left - container.left,
      top: r.top - container.top + r.height,
      width: r.width,
      severity,
    }));
}
