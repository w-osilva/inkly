import type { Rect } from './underline-layout';

let mirror: HTMLDivElement | null = null;

function getMirror(): HTMLDivElement {
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.setAttribute('data-inkly-mirror', '');
    document.body.appendChild(mirror);
  }
  return mirror;
}

// CSSStyleDeclaration's index signature is readonly in lib.dom, so writes via a
// camelCase key are typed against that readonly map. We copy text-layout
// properties by their kebab-case name using setProperty, which is writable and
// avoids `any`/`@ts-ignore`.
const COPY_PROPS = [
  'box-sizing',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-style',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'letter-spacing',
  'word-spacing',
  'text-transform',
  'text-indent',
  'line-height',
  'tab-size',
] as const;

/**
 * Per-span viewport rects for a textarea/input, measured with a hidden mirror clone of
 * the field's text box. Returns [] for empty/out-of-range spans. Geometry depends on real
 * layout (validated by e2e); happy-dom returns zeroed rects.
 */
export function textareaSpanRects(
  el: HTMLTextAreaElement | HTMLInputElement,
  offset: number,
  length: number,
): Rect[] {
  if (length <= 0) return [];
  const value = el.value ?? '';
  const start = Math.min(offset, value.length);
  const end = Math.min(offset + length, value.length);
  if (start >= end) return [];

  const cs = getComputedStyle(el);
  const isInput = el.tagName === 'INPUT';
  const m = getMirror();
  const s = m.style;
  // copy text-layout styles so wrapping/metrics match the field
  for (const prop of COPY_PROPS) {
    s.setProperty(prop, cs.getPropertyValue(prop));
  }
  const fieldRect = el.getBoundingClientRect();
  s.position = 'fixed';
  s.top = '0px';
  s.left = '0px';
  s.visibility = 'hidden';
  s.pointerEvents = 'none';
  s.overflow = 'hidden';
  s.margin = '0';
  s.width = `${fieldRect.width}px`;
  if (isInput) {
    s.whiteSpace = 'pre';
    s.wordWrap = 'normal';
    s.height = `${fieldRect.height}px`;
  } else {
    s.whiteSpace = 'pre-wrap';
    s.wordWrap = 'break-word';
    s.setProperty('overflow-wrap', 'break-word');
    s.height = `${fieldRect.height}px`;
  }

  m.textContent = '';
  const before = document.createTextNode(value.slice(0, start));
  const span = document.createElement('span');
  span.textContent = value.slice(start, end);
  const after = document.createTextNode(value.slice(end));
  m.append(before, span, after);

  const mirrorRect = m.getBoundingClientRect();
  const out: Rect[] = [];
  for (const c of Array.from(span.getClientRects())) {
    let left = fieldRect.left + (c.left - mirrorRect.left) - el.scrollLeft;
    const top = fieldRect.top + (c.top - mirrorRect.top) - el.scrollTop;
    const bottom = top + c.height;
    // clip out rects scrolled out of the visible field box vertically
    if (bottom <= fieldRect.top || top >= fieldRect.bottom) continue;
    // trim horizontally to the field's visible box
    let right = left + c.width;
    if (left < fieldRect.left) left = fieldRect.left;
    if (right > fieldRect.right) right = fieldRect.right;
    const width = right - left;
    if (width <= 0) continue;
    out.push({ left, top, width, height: c.height });
  }
  return out;
}
