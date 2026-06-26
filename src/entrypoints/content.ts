import { classifyField, isEditableField } from '../core/field-detector';
import { getFieldText } from '../core/text-model';
import { mergeSuggestions } from '../core/orchestrator';
import { HarperProvider } from '../core/providers/harper-provider';
import { OverlayRenderer } from '../ui/overlay-renderer';
import { computeUnderlineStyles, type Rect } from '../ui/underline-layout';
import { applyReplacement } from '../core/apply-engine';
import { debounce } from '../core/debounce';
import type { FieldType, Suggestion } from '../core/types';
import { mount } from 'svelte';
import SuggestionCard from '../ui/SuggestionCard.svelte';
import { cardState } from '../ui/card-state.svelte';
import { findHitIndex, type HitRect } from '../ui/hit-test';
import { computeCardPosition } from '../ui/card-position';
import { getSettings, onSettingsChanged, isEnabledForHost } from '../core/settings';

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
    let enabled = true;
    const host = location.host;
    let overlayHost: HTMLElement | null = null;
    const ui = await createShadowRootUi(ctx, {
      name: 'inkly-overlay',
      // 'modal' positions the shadow host as a fixed full-viewport element
      // anchored to body — ideal for an overlay that tracks all editable fields.
      position: 'modal',
      zIndex: 2147483646,
      onMount: (uiContainer, shadow, shadowHost) => {
        overlayHost = shadowHost as HTMLElement;
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
        // Mount the suggestion card into the SAME shadow container as the
        // underlines. The card sets its own pointer-events:auto, so the
        // container's pointer-events:none fix does not block its clicks.
        mount(SuggestionCard, { target: uiContainer });
        return new OverlayRenderer(layer);
      },
    });
    ui.mount();
    const renderer = ui.mounted as OverlayRenderer;

    let activeField: HTMLElement | null = null;
    let activeType: FieldType = 'unknown';
    let current: Suggestion[] = [];
    let checkSeq = 0;
    let hitRects: HitRect[] = [];

    const dismissed = new Set<string>();
    function suggestionKey(s: Suggestion): string {
      return `${s.ruleId}:${s.offset}:${s.length}:${s.replacements.join('|')}`;
    }

    const runCheck = debounce(async () => {
      const field = activeField;
      const type = activeType;
      if (!enabled || !field) return;
      const seq = ++checkSeq;
      const text = getFieldText(field, type);
      const raw = await provider.check(text, { fieldType: type, language: 'en' });
      if (seq !== checkSeq || activeField !== field) return; // stale: focus/newer check
      current = mergeSuggestions(raw);
      current = current.filter((s) => !dismissed.has(suggestionKey(s)));
      if (cardState.visible) hideCard();
      drawUnderlines();
    }, 400);

    function drawUnderlines() {
      if (!activeField) {
        hitRects = [];
        return renderer.clear();
      }
      const containerRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const nextHitRects: HitRect[] = [];
      const styles = current.flatMap((s, index) => {
        const rects = getSpanRects(activeField!, activeType, s.offset, s.length);
        const first = rects[0];
        if (first) {
          nextHitRects.push({
            index,
            left: first.left,
            top: first.top,
            width: first.width,
            height: first.height,
          });
        }
        return computeUnderlineStyles(rects, containerRect, s.severity);
      });
      hitRects = nextHitRects;
      renderer.render(styles);
    }

    let rafId = 0;
    function scheduleRedraw() {
      // M2b: hide the card on scroll/resize rather than repositioning it.
      // Repositioning against moving anchors is M4; hiding is the accepted fallback.
      if (cardState.visible) hideCard();
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; drawUnderlines(); });
    }

    const HOVER_DELAY = 150;
    const HIDE_GRACE = 120;
    let hoverTimer = 0, hideTimer = 0, shownIndex = -1, pendingHoverIndex = -1;
    let mouseMoveScheduled = false, lastX = 0, lastY = 0;

    function showCardFor(index: number) {
      const s = current[index];
      const hit = hitRects.find((h) => h.index === index);
      if (!s || !hit) return;
      const CARD = { width: 300, height: 140 };
      const pos = computeCardPosition(hit, CARD, { width: window.innerWidth, height: window.innerHeight });
      cardState.suggestion = s;
      cardState.severity = s.severity;
      cardState.left = pos.left;
      cardState.top = pos.top;
      cardState.onApply = (replacement: string) => {
        if (activeField) applyReplacement(activeField, activeType, s, replacement);
        hideCard();
        renderer.clear();
      };
      cardState.onDismiss = () => {
        dismissed.add(suggestionKey(s));
        hideCard();
        drawUnderlines();
      };
      cardState.visible = true;
      shownIndex = index;
    }

    function clearHoverTimers() {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = 0; }
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
      mouseMoveScheduled = false;
      pendingHoverIndex = -1;
    }

    function hideCard() {
      clearHoverTimers();
      cardState.visible = false;
      cardState.suggestion = null;
      cardState.onApply = null;
      cardState.onDismiss = null;
      cardState.hovered = false;
      shownIndex = -1;
    }

    getSettings().then((s) => {
      enabled = isEnabledForHost(s, host);
    });
    onSettingsChanged((s) => {
      const next = isEnabledForHost(s, host);
      if (next === enabled) return;
      enabled = next;
      if (!enabled) {
        runCheck.cancel();
        clearHoverTimers();
        hideCard();
        current = [];
        hitRects = [];
        renderer.clear();
      } else if (activeField) {
        runCheck();
      }
    });

    function onMouseMove(e: MouseEvent) {
      lastX = e.clientX; lastY = e.clientY;
      if (mouseMoveScheduled) return;
      mouseMoveScheduled = true;
      requestAnimationFrame(() => {
        mouseMoveScheduled = false;
        const idx = findHitIndex(lastX, lastY, hitRects);
        if (idx !== -1) {
          if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
          if (idx !== shownIndex && idx !== pendingHoverIndex) {
            if (hoverTimer) clearTimeout(hoverTimer);
            pendingHoverIndex = idx;
            hoverTimer = window.setTimeout(() => {
              hoverTimer = 0;
              pendingHoverIndex = -1;
              showCardFor(idx);
            }, HOVER_DELAY);
          }
        } else {
          if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = 0; pendingHoverIndex = -1; }
          if (cardState.visible && !hideTimer) {
            hideTimer = window.setTimeout(() => { hideTimer = 0; if (!cardState.hovered) hideCard(); }, HIDE_GRACE);
          }
        }
      });
    }
    ctx.addEventListener(document, 'mousemove', onMouseMove);

    ctx.addEventListener(document, 'focusin', (e) => {
      const t = e.target as Element;
      if (enabled && t instanceof HTMLElement && isEditableField(t)) {
        runCheck.cancel();
        clearHoverTimers();
        hideCard();
        activeField = t;
        activeType = classifyField(t);
        runCheck();
      }
    });
    ctx.addEventListener(document, 'input', (e) => {
      if (e.target === activeField) {
        // Text changed → offsets stale: drop dismissals and any open card.
        dismissed.clear();
        hideCard();
        renderer.clear();
        runCheck();
      }
    });
    ctx.addEventListener(document, 'focusout', (e) => {
      // Clicking a card button moves focus into our shadow-DOM overlay, which the
      // editor sees as a focusout. Ignore it: tearing down here would unmount the
      // card mid-click, so the replacement/dismiss handler would never run.
      const related = (e as FocusEvent).relatedTarget as Node | null;
      if (related && overlayHost && (related === overlayHost || overlayHost.contains(related))) {
        return;
      }
      runCheck.cancel();
      clearHoverTimers();
      hideCard();
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
