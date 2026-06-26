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
 * Returns true if applied, false if the field type is unsupported or
 * (for contenteditable) the element contains more than one text node.
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
    // Generic Range fallback (works across multiple text nodes):
    range.deleteContents();
    if (replacement) range.insertNode(document.createTextNode(replacement));
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: replacement }));
    return true;
  }
  return false;
}

/**
 * Apply a replacement into a field. Returns true if applied.
 * M1 supports textarea/input. contenteditable + rich editors return false
 * (implemented in M4) — callers must handle false gracefully.
 */
export function applyReplacement(
  el: HTMLElement,
  type: FieldType,
  suggestion: Suggestion,
  replacement: string,
): boolean {
  return applyRange(el, type, suggestion.offset, suggestion.offset + suggestion.length, replacement);
}
