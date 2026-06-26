import { describe, it, expect } from 'vitest';
import { getFieldText } from '../src/core/text-model';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

describe('getFieldText', () => {
  it('reads a textarea value', () => {
    const ta = mount('<textarea>hello world</textarea>') as HTMLTextAreaElement;
    ta.value = 'hello world';
    expect(getFieldText(ta, 'textarea')).toBe('hello world');
  });

  it('reads an input value', () => {
    const inp = mount('<input type="text" />') as HTMLInputElement;
    inp.value = 'teh cat';
    expect(getFieldText(inp, 'input')).toBe('teh cat');
  });

  it('reads contenteditable textContent', () => {
    const ce = mount('<div contenteditable="true">teh quick fox</div>');
    expect(getFieldText(ce, 'contenteditable')).toBe('teh quick fox');
  });
});
