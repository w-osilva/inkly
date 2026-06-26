import { FieldType } from './types';

export interface SelectionInfo {
  text: string;
  start: number;
  end: number;
}

/** The current non-collapsed selection within `el`, or null. Offsets are character indices. */
export function getSelectionInfo(el: HTMLElement, type: FieldType): SelectionInfo | null {
  if (type === 'textarea' || type === 'input') {
    const f = el as HTMLTextAreaElement | HTMLInputElement;
    const start = f.selectionStart ?? 0;
    const end = f.selectionEnd ?? 0;
    if (start === end) return null;
    return { text: f.value.slice(start, end), start, end };
  }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  const node = el.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  if (range.startContainer !== node || range.endContainer !== node) return null;
  const start = range.startOffset;
  const end = range.endOffset;
  if (start === end) return null;
  return { text: range.toString(), start, end };
}
