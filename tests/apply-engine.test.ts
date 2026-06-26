import { describe, it, expect, vi } from 'vitest';
import { applyReplacement } from '../src/core/apply-engine';
import { makeSuggestion } from '../src/core/types';

describe('applyReplacement (textarea/input)', () => {
  it('replaces the spanned text in a textarea', () => {
    const ta = document.createElement('textarea');
    ta.value = 'teh cat';
    document.body.appendChild(ta);
    const sug = makeSuggestion({ offset: 0, length: 3 }); // "teh"
    applyReplacement(ta, 'textarea', sug, 'the');
    expect(ta.value).toBe('the cat');
  });

  it('dispatches a bubbling input event so frameworks observe the change', () => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = 'recieve';
    document.body.appendChild(inp);
    const handler = vi.fn();
    inp.addEventListener('input', handler);
    const sug = makeSuggestion({ offset: 0, length: 7 });
    applyReplacement(inp, 'input', sug, 'receive');
    expect(inp.value).toBe('receive');
    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as Event;
    expect(evt.bubbles).toBe(true);
  });

  it('updates a React-style _valueTracker so onChange is not deduped', () => {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = 'teh';
    (inp as any)._valueTracker = {
      getValue: () => 'teh',
      setValue(v: string) {
        (this as any)._v = v;
      },
    };
    document.body.appendChild(inp);
    applyReplacement(inp, 'input', makeSuggestion({ offset: 0, length: 3 }), 'the');
    expect((inp as any)._valueTracker._v).toBe('the');
  });

  it('returns false for unsupported field types (no throw)', () => {
    // 'prosemirror' and other rich-editor types are not yet handled (deferred to M4).
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'teh cat';
    const ok = applyReplacement(div, 'prosemirror', makeSuggestion({ offset: 0, length: 3 }), 'the');
    expect(ok).toBe(false);
  });
});
