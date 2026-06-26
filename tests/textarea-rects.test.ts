import { describe, it, expect } from 'vitest';
import { textareaSpanRects } from '../src/ui/textarea-rects';

function makeTextarea(value: string): HTMLTextAreaElement {
  const ta = document.createElement('textarea');
  ta.value = value;
  document.body.appendChild(ta);
  return ta;
}

describe('textareaSpanRects', () => {
  it('returns [] when length <= 0', () => {
    expect(textareaSpanRects(makeTextarea('hello'), 0, 0)).toEqual([]);
  });
  it('returns [] when offset is beyond the value', () => {
    expect(textareaSpanRects(makeTextarea('hi'), 10, 3)).toEqual([]);
  });
  it('creates a single reusable mirror element on document.body', () => {
    const ta = makeTextarea('hello world');
    textareaSpanRects(ta, 0, 5);
    textareaSpanRects(ta, 6, 5);
    expect(document.querySelectorAll('[data-inkly-mirror]').length).toBe(1);
  });
  it('returns an array (geometry is layout-dependent; not asserted under happy-dom)', () => {
    const ta = makeTextarea('hello world');
    expect(Array.isArray(textareaSpanRects(ta, 6, 5))).toBe(true);
  });
  it('handles an input element without throwing', () => {
    const inp = document.createElement('input');
    inp.value = 'misspeled';
    document.body.appendChild(inp);
    expect(Array.isArray(textareaSpanRects(inp, 0, 9))).toBe(true);
  });
});
