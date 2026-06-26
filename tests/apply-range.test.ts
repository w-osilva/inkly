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
    // Multi-node is now supported via offsetToRange (M4a).
    expect(applyRange(ce, 'contenteditable', 0, 1, 'x')).toBe(true);
  });
});

describe('applyRange (framework rich-text types)', () => {
  it('applies an in-range replacement on a prosemirror contenteditable (returns true + mutates)', () => {
    const ce = document.createElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.textContent = 'teh cat sat';
    document.body.appendChild(ce);
    const handler = vi.fn();
    ce.addEventListener('input', handler);
    // execCommand is unavailable in happy-dom, so this exercises the fallback path.
    const ok = applyRange(ce, 'prosemirror', 0, 3, 'the');
    expect(ok).toBe(true);
    expect(ce.textContent).toBe('the cat sat');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('applyRange (multi-node contenteditable)', () => {
  it('replaces a span that sits in a later text node', () => {
    const ce = document.createElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.innerHTML = 'The <b>quick</b> teh fox'; // textContent "The quick teh fox", "teh" at 10..13
    document.body.appendChild(ce);
    const ok = applyRange(ce, 'contenteditable', 10, 13, 'the');
    expect(ok).toBe(true);
    expect(ce.textContent).toBe('The quick the fox');
  });
  it('replaces a span crossing an element boundary', () => {
    const ce = document.createElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.innerHTML = 'ab<b>cd</b>ef'; // "abcdef"
    document.body.appendChild(ce);
    const ok = applyRange(ce, 'contenteditable', 1, 5, 'X'); // replace "bcde"
    expect(ok).toBe(true);
    expect(ce.textContent).toBe('aXf');
  });
});
