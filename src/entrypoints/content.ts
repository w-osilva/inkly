import { classifyField, isEditableField } from '../core/field-detector';
import { getFieldText } from '../core/text-model';
import { mergeSuggestions } from '../core/orchestrator';
import { HarperProvider } from '../core/providers/harper-provider';
import { OverlayRenderer } from '../ui/overlay-renderer';
import { computeUnderlineStyles, type Rect } from '../ui/underline-layout';
import { applyReplacement } from '../core/apply-engine';
import { debounce } from '../core/debounce';
import type { FieldType, Suggestion } from '../core/types';

const provider = new HarperProvider();

// Field types whose text lives in the DOM as nodes → precise rects via a Range.
const CONTENTEDITABLE_FAMILY: ReadonlySet<FieldType> = new Set<FieldType>([
  'contenteditable', 'prosemirror', 'slate', 'ckeditor', 'lexical', 'quill',
]);

/** Build client rects for a (offset,length) span: a Range for contenteditable, the field rect for textarea/input. */
function getSpanRects(el: HTMLElement, type: FieldType, offset: number, length: number): Rect[] {
  if (CONTENTEDITABLE_FAMILY.has(type)) {
    const textNode = el.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [];
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset + length);
    return Array.from(range.getClientRects()).map((r) => ({
      left: r.left, top: r.top, width: r.width, height: r.height,
    }));
  }
  // textarea/input: coarse full-field underline for M1 (mirror-div precision is M4).
  const r = el.getBoundingClientRect();
  return [{ left: r.left + 2, top: r.top + 2, width: Math.max(0, r.width - 4), height: r.height - 4 }];
}

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'inkly-overlay',
      // 'modal' positions the shadow host as a fixed full-viewport element
      // anchored to body — ideal for an overlay that tracks all editable fields.
      position: 'modal',
      zIndex: 2147483646,
      onMount: (uiContainer, shadow, shadowHost) => {
        // WXT's 'modal' strategy gives the inner <html> element a fixed full-viewport
        // layout but does NOT set pointer-events:none on it or the shadow host, so the
        // overlay would intercept all pointer events on the page. Patch both here.
        (uiContainer.parentElement as HTMLElement | null)?.style.setProperty('pointer-events', 'none');
        (shadowHost as HTMLElement).style.setProperty('pointer-events', 'none');

        const layer = document.createElement('div');
        layer.style.position = 'fixed';
        layer.style.inset = '0';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '2147483646';
        uiContainer.appendChild(layer);
        return new OverlayRenderer(layer);
      },
    });
    ui.mount();
    const renderer = ui.mounted as OverlayRenderer;

    let activeField: HTMLElement | null = null;
    let activeType: FieldType = 'unknown';
    let current: Suggestion[] = [];
    let checkSeq = 0;

    const runCheck = debounce(async () => {
      const field = activeField;
      const type = activeType;
      if (!field) return;
      const seq = ++checkSeq;
      const text = getFieldText(field, type);
      const raw = await provider.check(text, { fieldType: type, language: 'en' });
      if (seq !== checkSeq || activeField !== field) return; // stale: focus/newer check
      current = mergeSuggestions(raw);
      drawUnderlines();
    }, 400);

    function drawUnderlines() {
      if (!activeField) return renderer.clear();
      const containerRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const styles = current.flatMap((s) =>
        computeUnderlineStyles(
          getSpanRects(activeField!, activeType, s.offset, s.length),
          containerRect,
          s.severity,
        ),
      );
      renderer.render(styles);
    }

    let rafId = 0;
    function scheduleRedraw() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; drawUnderlines(); });
    }

    ctx.addEventListener(document, 'focusin', (e) => {
      const t = e.target as Element;
      if (t instanceof HTMLElement && isEditableField(t)) {
        runCheck.cancel();
        activeField = t;
        activeType = classifyField(t);
        runCheck();
      }
    });
    ctx.addEventListener(document, 'input', (e) => {
      if (e.target === activeField) {
        renderer.clear();
        runCheck();
      }
    });
    ctx.addEventListener(document, 'focusout', () => {
      runCheck.cancel();
      activeField = null;
      activeType = 'unknown';
      current = [];
      renderer.clear();
    });
    ctx.addEventListener(window, 'scroll', scheduleRedraw, { capture: true });
    ctx.addEventListener(window, 'resize', scheduleRedraw);

    // Expose apply for manual/e2e testing (removed in M3 UI work):
    (window as any).__inklyApplyFirst = () => {
      if (activeField && current[0]) {
        applyReplacement(activeField, activeType, current[0], current[0].replacements[0]);
      }
    };
  },
});
