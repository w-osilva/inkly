import { classifyField, isEditableField } from '../core/field-detector';
import { getFieldText } from '../core/text-model';
import { mergeSuggestions } from '../core/orchestrator';
import { StubProvider } from '../core/providers/stub-provider';
import { OverlayRenderer } from '../ui/overlay-renderer';
import { computeUnderlineStyles, type Rect } from '../ui/underline-layout';
import { applyReplacement } from '../core/apply-engine';
import { debounce } from '../core/debounce';
import type { Suggestion } from '../core/types';

const provider = new StubProvider();

/** Build client rects for a (offset,length) span: a Range for contenteditable, the field rect for textarea/input. */
function getSpanRects(el: HTMLElement, type: string, offset: number, length: number): Rect[] {
  if (type === 'contenteditable') {
    const range = document.createRange();
    const textNode = el.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [];
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset + length);
    return Array.from(range.getClientRects()).map((r) => ({
      left: r.left, top: r.top, width: r.width, height: r.height,
    }));
  }
  // textarea/input: approximate with the field's own rect (full mirror-div
  // precision is M4). For M1 we draw a single underline across the field bottom.
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
      onMount: (uiContainer) => {
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
    let activeType = 'unknown';
    let current: Suggestion[] = [];

    const runCheck = debounce(async () => {
      if (!activeField) return;
      const text = getFieldText(activeField, activeType as any);
      const raw = await provider.check(text, { fieldType: activeType as any, language: 'en' });
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

    document.addEventListener('focusin', (e) => {
      const t = e.target as Element;
      if (t instanceof HTMLElement && isEditableField(t)) {
        activeField = t;
        activeType = classifyField(t);
        runCheck();
      }
    });
    document.addEventListener('input', (e) => {
      if (e.target === activeField) {
        renderer.clear();      // stale: clear until re-checked (offsets changed)
        runCheck();
      }
    });
    document.addEventListener('focusout', () => {
      activeField = null;
      current = [];
      renderer.clear();
    });
    window.addEventListener('scroll', drawUnderlines, true);
    window.addEventListener('resize', drawUnderlines);

    // Expose apply for manual/e2e testing (removed in M3 UI work):
    (window as any).__inklyApplyFirst = () => {
      if (activeField && current[0]) {
        applyReplacement(activeField, activeType as any, current[0], current[0].replacements[0]);
      }
    };
  },
});
