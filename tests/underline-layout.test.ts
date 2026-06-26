import { describe, it, expect } from 'vitest';
import { computeUnderlineStyles, type Rect } from '../src/ui/underline-layout';

const container: Rect = { left: 100, top: 50, width: 800, height: 400 };

describe('computeUnderlineStyles', () => {
  it('positions an underline relative to the container origin, at the rect bottom', () => {
    const rects: Rect[] = [{ left: 120, top: 60, width: 40, height: 16 }];
    const styles = computeUnderlineStyles(rects, container, 'correctness');
    expect(styles).toHaveLength(1);
    expect(styles[0].left).toBe(20);  // 120 - 100
    expect(styles[0].top).toBe(26);   // (60 - 50) + 16 = bottom of the text rect
    expect(styles[0].width).toBe(40);
  });

  it('tags each style with the given severity', () => {
    const rects: Rect[] = [{ left: 120, top: 60, width: 40, height: 16 }];
    expect(computeUnderlineStyles(rects, container, 'clarity')[0].severity).toBe('clarity');
    expect(computeUnderlineStyles(rects, container, 'suggestion')[0].severity).toBe('suggestion');
  });

  it('produces one style per rect (multi-line spans)', () => {
    const rects: Rect[] = [
      { left: 120, top: 60, width: 40, height: 16 },
      { left: 100, top: 80, width: 30, height: 16 },
    ];
    expect(computeUnderlineStyles(rects, container, 'correctness')).toHaveLength(2);
  });

  it('ignores zero-width rects', () => {
    const rects: Rect[] = [{ left: 120, top: 60, width: 0, height: 16 }];
    expect(computeUnderlineStyles(rects, container, 'correctness')).toHaveLength(0);
  });
});
