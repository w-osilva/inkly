import { FieldType, Suggestion } from './types';

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
  if (type === 'textarea' || type === 'input') {
    const field = el as HTMLTextAreaElement | HTMLInputElement;
    const current = field.value;
    const next =
      current.slice(0, suggestion.offset) +
      replacement +
      current.slice(suggestion.offset + suggestion.length);
    setNativeValue(field, next);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  if (type === 'contenteditable') {
    const node = el.firstChild;
    // M2b handles only the common single-text-node case; multi-node / rich
    // editors (ProseMirror, Slate, Lexical, Quill) are M4.
    if (!node || node.nodeType !== Node.TEXT_NODE || el.childNodes.length !== 1) {
      return false;
    }
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(node, suggestion.offset);
    range.setEnd(node, suggestion.offset + suggestion.length);
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.focus();
    // Primary: native input pipeline (undo-safe, fires input, framework-friendly).
    let ok = false;
    try {
      ok = document.execCommand('insertText', false, replacement);
    } catch {
      ok = false;
    }
    if (ok) return true;
    // Fallback (plain contenteditable / environments without execCommand):
    const text = node.textContent ?? '';
    node.textContent =
      text.slice(0, suggestion.offset) + replacement + text.slice(suggestion.offset + suggestion.length);
    el.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: replacement }),
    );
    return true;
  }
  return false;
}
