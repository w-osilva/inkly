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
  return false;
}
