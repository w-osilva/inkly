import { describe, it, expect } from 'vitest';
import { offsetToRange } from '../src/core/dom-offset';

function mount(html: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('contenteditable', 'true');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('offsetToRange', () => {
  it('maps an offset within a single text node', () => {
    const el = mount('hello world'); // textContent "hello world"
    const r = offsetToRange(el, 6, 11)!;
    expect(r.toString()).toBe('world');
  });
  it('maps an offset spanning across multiple text nodes', () => {
    const el = mount('The <b>quick</b> teh fox'); // textContent "The quick teh fox"
    // "teh" starts at index 10
    const r = offsetToRange(el, 10, 13)!;
    expect(r.toString()).toBe('teh');
  });
  it('maps a range that crosses an element boundary', () => {
    const el = mount('ab<b>cd</b>ef'); // "abcdef"
    const r = offsetToRange(el, 1, 5)!; // "bcde"
    expect(r.toString()).toBe('bcde');
  });
  it('handles offset at the very start and end', () => {
    const el = mount('abc<b>def</b>');
    expect(offsetToRange(el, 0, 3)!.toString()).toBe('abc');
    expect(offsetToRange(el, 0, 6)!.toString()).toBe('abcdef');
  });
  it('returns null when the range is out of bounds', () => {
    const el = mount('abc');
    expect(offsetToRange(el, 2, 10)).toBeNull();
    expect(offsetToRange(el, 5, 6)).toBeNull();
  });
  it('returns null for an empty root', () => {
    const el = mount('');
    expect(offsetToRange(el, 0, 1)).toBeNull();
  });
});
