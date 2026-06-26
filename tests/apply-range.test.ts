import { describe, it, expect, vi } from 'vitest';
import { applyRange } from '../src/core/apply-engine';

describe('applyRange (textarea/input)', () => {
  it('replaces the spanned text and fires a bubbling input event', () => {
    const ta = document.createElement('textarea');
    ta.value = 'hello world';
    document.body.appendChild(ta);
    const handler = vi.fn();
    ta.addEventListener('input', handler);
    const ok = applyRange(ta, 'textarea', 6, 11, 'there');
    expect(ok).toBe(true);
    expect(ta.value).toBe('hello there');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('applyRange (plain contenteditable)', () => {
  it('replaces the spanned text (fallback path) and fires input', () => {
    const ce = document.createElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.textContent = 'hello world';
    document.body.appendChild(ce);
    const handler = vi.fn();
    ce.addEventListener('input', handler);
    const ok = applyRange(ce, 'contenteditable', 6, 11, 'there');
    expect(ok).toBe(true);
    expect(ce.textContent).toBe('hello there');
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('returns false for a multi-node contenteditable', () => {
    const ce = document.createElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.innerHTML = 'a <b>b</b>';
    document.body.appendChild(ce);
    expect(applyRange(ce, 'contenteditable', 0, 1, 'x')).toBe(false);
  });
});
