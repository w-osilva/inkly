import { FieldType } from './types';

const TEXT_INPUT_TYPES = new Set([
  'text', 'search', 'url', 'email', 'tel', '', // '' = no type attr defaults to text
]);

function isContentEditable(el: Element): boolean {
  return (el as HTMLElement).isContentEditable === true ||
    el.getAttribute('contenteditable') === 'true';
}

export function classifyField(el: Element): FieldType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return 'textarea';
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type;
    return TEXT_INPUT_TYPES.has(type) ? 'input' : 'unknown';
  }
  if (isContentEditable(el)) {
    if (el.classList.contains('ProseMirror')) return 'prosemirror';
    if (el.hasAttribute('data-slate-editor')) return 'slate';
    if (el.classList.contains('ck-editor__editable')) return 'ckeditor';
    if (el.hasAttribute('data-lexical-editor')) return 'lexical';
    if (el.classList.contains('ql-editor')) return 'quill';
    return 'contenteditable';
  }
  return 'unknown';
}

export function isEditableField(el: Element): boolean {
  return classifyField(el) !== 'unknown';
}
