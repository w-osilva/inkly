import { describe, it, expect, beforeEach } from 'vitest';
import { OverlayRenderer } from '../src/ui/overlay-renderer';

describe('OverlayRenderer', () => {
  let layer: HTMLElement;
  beforeEach(() => {
    layer = document.createElement('div');
    document.body.appendChild(layer);
  });

  it('renders one positioned node per style', () => {
    const r = new OverlayRenderer(layer);
    r.render([
      { left: 20, top: 26, width: 40, severity: 'correctness' },
      { left: 0, top: 46, width: 30, severity: 'clarity' },
    ]);
    const nodes = layer.querySelectorAll('.inkly-underline');
    expect(nodes).toHaveLength(2);
    const first = nodes[0] as HTMLElement;
    expect(first.style.left).toBe('20px');
    expect(first.style.top).toBe('26px');
    expect(first.style.width).toBe('40px');
  });

  it('applies a severity-specific data attribute and distinct colors', () => {
    const r = new OverlayRenderer(layer);
    r.render([
      { left: 0, top: 0, width: 10, severity: 'correctness' },
      { left: 0, top: 10, width: 10, severity: 'clarity' },
      { left: 0, top: 20, width: 10, severity: 'suggestion' },
    ]);
    const nodes = Array.from(layer.querySelectorAll('.inkly-underline')) as HTMLElement[];
    expect(nodes.map((n) => n.dataset.severity)).toEqual([
      'correctness', 'clarity', 'suggestion',
    ]);
    const backgrounds = new Set(nodes.map((n) => n.style.background));
    expect(backgrounds.size).toBe(3);
  });

  it('clear() removes all underline nodes', () => {
    const r = new OverlayRenderer(layer);
    r.render([{ left: 1, top: 2, width: 3, severity: 'correctness' }]);
    r.clear();
    expect(layer.querySelectorAll('.inkly-underline')).toHaveLength(0);
  });

  it('render() replaces previous underlines (no accumulation)', () => {
    const r = new OverlayRenderer(layer);
    r.render([{ left: 1, top: 2, width: 3, severity: 'correctness' }]);
    r.render([{ left: 4, top: 5, width: 6, severity: 'clarity' }]);
    expect(layer.querySelectorAll('.inkly-underline')).toHaveLength(1);
  });
});
