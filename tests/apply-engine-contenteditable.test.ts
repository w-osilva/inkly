import { describe, it, expect, vi } from 'vitest';
import { applyReplacement } from '../src/core/apply-engine';
import { makeSuggestion } from '../src/core/types';

function ce(text: string): HTMLElement {
  const div = document.createElement('div');
  div.setAttribute('contenteditable', 'true');
  div.textContent = text;
  document.body.appendChild(div);
  return div;
}

describe('applyReplacement (plain contenteditable, single text node)', () => {
  it('replaces the spanned text and dispatches a bubbling input event', () => {
    const el = ce('teh cat');
    const handler = vi.fn();
    el.addEventListener('input', handler);
    const ok = applyReplacement(el, 'contenteditable', makeSuggestion({ offset: 0, length: 3 }), 'the');
    expect(ok).toBe(true);
    expect(el.textContent).toBe('the cat');
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as Event).bubbles).toBe(true);
  });

  it('supports removal (empty replacement)', () => {
    const el = ce('the the cat');
    const ok = applyReplacement(el, 'contenteditable', makeSuggestion({ offset: 0, length: 4 }), '');
    expect(ok).toBe(true);
    expect(el.textContent).toBe('the cat');
  });

  it('works for a multi-node contenteditable (M4a: offsetToRange)', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    el.innerHTML = 'teh <b>cat</b>';
    document.body.appendChild(el);
    const ok = applyReplacement(el, 'contenteditable', makeSuggestion({ offset: 0, length: 3 }), 'the');
    expect(ok).toBe(true);
    expect(el.textContent).toBe('the cat');
  });
});
