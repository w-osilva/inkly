import { FieldType } from './types';

// Only genuine prose inputs. search/url/email/tel/number/password are not prose, so we don't
// correct them. ('' = no type attr → defaults to text.)
const PROSE_INPUT_TYPES = new Set(['text', '']);
// Autocomplete/picker widgets (a "search select", tag/mention box, …) are built on text inputs
// but aren't prose either — skip them by their ARIA role / autocomplete hint.
const PICKER_ROLES = new Set(['combobox', 'searchbox', 'spinbutton', 'listbox']);

function isContentEditable(el: Element): boolean {
  return (el as HTMLElement).isContentEditable === true ||
    el.getAttribute('contenteditable') === 'true';
}

export function classifyField(el: Element): FieldType {
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return 'textarea';
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type;
    if (!PROSE_INPUT_TYPES.has(type)) return 'unknown';
    const role = el.getAttribute('role');
    if ((role && PICKER_ROLES.has(role)) || el.hasAttribute('aria-autocomplete')) return 'unknown';
    return 'input';
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
