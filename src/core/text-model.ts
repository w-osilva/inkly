import { FieldType } from './types';

/** Extract the plain text of a field, regardless of field type. */
export function getFieldText(el: HTMLElement, type: FieldType): string {
  if (type === 'textarea' || type === 'input') {
    return (el as HTMLTextAreaElement | HTMLInputElement).value;
  }
  // contenteditable + all rich editors expose their text via textContent.
  return el.textContent ?? '';
}
