import { describe, it, expect } from 'vitest';
import { getSelectionInfo } from '../src/core/selection';

describe('getSelectionInfo (textarea/input)', () => {
  it('returns the selected substring + offsets', () => {
    const ta = document.createElement('textarea');
    ta.value = 'hello world';
    document.body.appendChild(ta);
    ta.focus();
    ta.setSelectionRange(6, 11); // "world"
    expect(getSelectionInfo(ta, 'textarea')).toEqual({ text: 'world', start: 6, end: 11 });
  });
  it('returns null for a collapsed selection (caret only)', () => {
    const inp = document.createElement('input');
    inp.value = 'hi';
    document.body.appendChild(inp);
    inp.focus();
    inp.setSelectionRange(1, 1);
    expect(getSelectionInfo(inp, 'input')).toBeNull();
  });
});

describe('getSelectionInfo (contenteditable, single text node)', () => {
  it('returns the selected substring + offsets from the DOM selection', () => {
    const ce = document.createElement('div');
    ce.setAttribute('contenteditable', 'true');
    ce.textContent = 'hello world';
    document.body.appendChild(ce);
    const range = document.createRange();
    range.setStart(ce.firstChild!, 6);
    range.setEnd(ce.firstChild!, 11);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    expect(getSelectionInfo(ce, 'contenteditable')).toEqual({ text: 'world', start: 6, end: 11 });
  });
});
