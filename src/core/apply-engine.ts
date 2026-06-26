import { FieldType, Suggestion } from './types';
import { offsetToRange } from './dom-offset';

/**
 * Set a value via the native prototype setter and update React's _valueTracker
 * so a subsequent input event is not de-duplicated (facebook/react#11488).
 */
function setNativeValue(el: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const tracker = (el as any)._valueTracker;
  if (tracker) tracker.setValue(value);
  if (setter) setter.call(el, value);
  else el.value = value;
}

/**
 * Replace an arbitrary [start, end) span in a field with `replacement`.
 *
 * - textarea / input: applied via the native value setter + React tracker patch.
 * - contenteditable (single OR multi text node): offset resolved by `offsetToRange`,
 *   applied via `execCommand('insertText')` when available; falls back to a
 *   Range-based insert otherwise.
 *
 * Returns false only when the offset range cannot be resolved (out of bounds)
 * or the field type is unsupported (rich-editor framework types are deferred).
 */
export function applyRange(
  el: HTMLElement,
  type: FieldType,
  start: number,
  end: number,
  replacement: string,
): boolean {
  if (type === 'textarea' || type === 'input') {
    const field = el as HTMLTextAreaElement | HTMLInputElement;
    const cur = field.value;
    setNativeValue(field, cur.slice(0, start) + replacement + cur.slice(end));
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  if (type === 'contenteditable') {
    const range = offsetToRange(el, start, end);
    if (!range) return false;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.focus();
    let ok = false;
    try {
      ok = document.execCommand('insertText', false, replacement);
    } catch {
      ok = false;
    }
    if (ok) return true;
    // Fallback runs only when execCommand is unavailable (e.g. very old engines / jsdom);
    // real Chromium uses the execCommand path above, which preserves inline formatting.
    range.deleteContents();
    if (replacement) {
      const textNode = document.createTextNode(replacement);
      range.insertNode(textNode);
      // place the caret just after the inserted text
      const sel2 = window.getSelection();
      sel2?.removeAllRanges();
      const after = document.createRange();
      after.setStartAfter(textNode);
      after.collapse(true);
      sel2?.addRange(after);
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: replacement }));
    return true;
  }
  return false;
}

/**
 * Apply a replacement into a field. Returns true if applied.
 *
 * Delegates to `applyRange`; supports textarea/input and (single/multi-node)
 * contenteditable. Returns false for unresolved offset ranges or unsupported
 * field types — callers must handle a false return gracefully.
 */
export function applyReplacement(
  el: HTMLElement,
  type: FieldType,
  suggestion: Suggestion,
  replacement: string,
): boolean {
  return applyRange(el, type, suggestion.offset, suggestion.offset + suggestion.length, replacement);
}
