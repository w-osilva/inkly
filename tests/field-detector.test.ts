import { describe, it, expect } from 'vitest';
import { classifyField, isEditableField } from '../src/core/field-detector';

function el(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
}

describe('classifyField', () => {
  it('classifies textarea and input', () => {
    expect(classifyField(el('<textarea></textarea>'))).toBe('textarea');
    expect(classifyField(el('<input type="text" />'))).toBe('input');
  });

  it('classifies plain contenteditable', () => {
    expect(classifyField(el('<div contenteditable="true"></div>'))).toBe(
      'contenteditable',
    );
  });

  it('classifies known rich editors by marker', () => {
    expect(classifyField(el('<div class="ProseMirror" contenteditable="true"></div>'))).toBe('prosemirror');
    expect(classifyField(el('<div data-slate-editor="true" contenteditable="true"></div>'))).toBe('slate');
    expect(classifyField(el('<div class="ck-editor__editable" contenteditable="true"></div>'))).toBe('ckeditor');
    expect(classifyField(el('<div data-lexical-editor="true" contenteditable="true"></div>'))).toBe('lexical');
    expect(classifyField(el('<div class="ql-editor" contenteditable="true"></div>'))).toBe('quill');
  });

  it('non-editable elements are unknown / not editable', () => {
    expect(classifyField(el('<p>hi</p>'))).toBe('unknown');
    expect(isEditableField(el('<p>hi</p>'))).toBe(false);
    expect(isEditableField(el('<textarea></textarea>'))).toBe(true);
  });

  it('password/checkbox inputs are not editable text fields', () => {
    expect(isEditableField(el('<input type="password" />'))).toBe(false);
    expect(isEditableField(el('<input type="checkbox" />'))).toBe(false);
  });

  it('non-prose inputs (search/email/url/tel/number) are skipped', () => {
    for (const type of ['search', 'email', 'url', 'tel', 'number']) {
      expect(isEditableField(el(`<input type="${type}" />`))).toBe(false);
    }
  });

  it('autocomplete/combobox text inputs (a "search select") are skipped', () => {
    expect(isEditableField(el('<input type="text" role="combobox" />'))).toBe(false);
    expect(isEditableField(el('<input type="text" role="searchbox" />'))).toBe(false);
    expect(isEditableField(el('<input type="text" aria-autocomplete="list" />'))).toBe(false);
    // a plain text input is still prose
    expect(isEditableField(el('<input type="text" />'))).toBe(true);
  });
});
