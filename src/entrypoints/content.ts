import { browser } from 'wxt/browser';
// Design tokens. With cssInjectionMode:'ui', WXT/Vite collects CSS imported by the
// content entry and injects it into the shadow root, so :host token defs resolve
// for the mounted Svelte components.
import '../ui/tokens.css';
import { classifyField, isEditableField } from '../core/field-detector';
import { getFieldText } from '../core/text-model';
import { mergeSuggestions } from '../core/orchestrator';
import { HarperProvider } from '../core/providers/harper-provider';
import { OverlayRenderer } from '../ui/overlay-renderer';
import { computeUnderlineStyles, type Rect } from '../ui/underline-layout';
import { applyReplacement, applyRange } from '../core/apply-engine';
import { debounce } from '../core/debounce';
import { offsetToRange } from '../core/dom-offset';
import type { FieldType, Suggestion } from '../core/types';
import { mount } from 'svelte';
import SuggestionCard from '../ui/SuggestionCard.svelte';
import { cardState } from '../ui/card-state.svelte';
import { findHitIndex, type HitRect } from '../ui/hit-test';
import { computeCardPosition } from '../ui/card-position';
import { getSettings, setSettings, addWord, onSettingsChanged, isEnabledForHost, effectiveLang } from '../core/settings';
import { isSuppressed, isDictionaryCategory } from '../core/suppression';
import type { Lang } from '../core/i18n';
import { runAI } from '../core/ai/ai-client';
import type { AICapability } from '../core/ai/ai-types';
import AISelectionPanel from '../ui/AISelectionPanel.svelte';
import { aiPanelState } from '../ui/ai-panel-state.svelte';
import FieldButton from '../ui/FieldButton.svelte';
import { fieldButtonState } from '../ui/field-button-state.svelte';
import ReviewPanel from '../ui/ReviewPanel.svelte';
import { reviewState } from '../ui/review-state.svelte';
import { categoryLabel } from '../core/i18n';
import { ruleExplanation } from '../core/rule-descriptions';
import { getSelectionInfo, type SelectionInfo } from '../core/selection';
import { expandToSentence, isSingleWord } from '../core/sentence';
import { parseImprovements } from '../core/ai/parse-improvements';
import { textareaSpanRects } from '../ui/textarea-rects';

const provider = new HarperProvider();

// Field types whose text lives in the DOM as nodes → precise rects via a Range.
const CONTENTEDITABLE_FAMILY: ReadonlySet<FieldType> = new Set<FieldType>([
  'contenteditable', 'prosemirror', 'slate', 'ckeditor', 'lexical', 'quill',
]);

/** Build client rects for a (offset,length) span: a Range for contenteditable, a hidden mirror clone for textarea/input. */
function getSpanRects(el: HTMLElement, type: FieldType, offset: number, length: number): Rect[] {
  if (CONTENTEDITABLE_FAMILY.has(type)) {
    const range = offsetToRange(el, offset, offset + length);
    if (!range) return [];
    return Array.from(range.getClientRects()).map((r) => ({
      left: r.left, top: r.top, width: r.width, height: r.height,
    }));
  }
  // textarea/input: precise per-span rects via a hidden mirror clone (M4a).
  if (type === 'textarea' || type === 'input') {
    return textareaSpanRects(el as HTMLTextAreaElement | HTMLInputElement, offset, length);
  }
  // unknown field: coarse full-field underline fallback.
  const r = el.getBoundingClientRect();
  return [{ left: r.left + 2, top: r.top + 2, width: Math.max(0, r.width - 4), height: r.height - 4 }];
}

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let enabled = true;
    let disabledCategories = new Set<string>();
    let dictionary = new Set<string>();
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
        mount(AISelectionPanel, { target: uiContainer });
        mount(FieldButton, { target: uiContainer });
        mount(ReviewPanel, { target: uiContainer });
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
    let lang: Lang = 'en';
    let defaultTone = '';

    const dismissed = new Set<string>();
    function suggestionKey(s: Suggestion): string {
      return `${s.ruleId}:${s.offset}:${s.length}:${s.replacements.join('|')}`;
    }

    async function runCheckNow() {
      const field = activeField;
      const type = activeType;
      if (!enabled || !field) return;
      const seq = ++checkSeq;
      const text = getFieldText(field, type);
      const raw = await provider.check(text, { fieldType: type, language: 'en' });
      if (seq !== checkSeq || activeField !== field) return; // stale: focus/newer check
      current = mergeSuggestions(raw);
      current = current.filter((s) => !dismissed.has(suggestionKey(s)));
      current = current.filter(
        (s) => !isSuppressed(s, text.slice(s.offset, s.offset + s.length), disabledCategories, dictionary),
      );
      if (cardState.visible) hideCard();
      drawUnderlines();
      if (reviewState.visible) renderReviewItem();
    }
    const runCheck = debounce(runCheckNow, 400);

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
      updateFieldButton();
    }

    // Turn off the browser's native spellcheck on a field we track, so its red
    // squiggle doesn't double up with inkly's own underlines (Grammarly does this).
    function suppressNativeSpellcheck(el: HTMLElement) {
      try { el.setAttribute('spellcheck', 'false'); } catch { /* ignore */ }
    }

    // Kick off Harper's WASM compile (in the offscreen doc) on first field focus, so the
    // first lint doesn't stall on the ~17MB cold start. Fire once per content script.
    let warmed = false;
    function warmEngine() {
      if (warmed) return;
      warmed = true;
      void browser.runtime.sendMessage({ type: 'inkly:warm' }).catch(() => {});
    }

    // Severity priority for the field-button badge color (most severe wins).
    const SEVERITY_RANK: Record<Suggestion['severity'], number> = { correctness: 3, clarity: 2, suggestion: 1 };

    function updateFieldButton() {
      if (!enabled || !activeField || current.length === 0) {
        fieldButtonState.visible = false;
        fieldButtonState.onOpen = null;
        return;
      }
      const r = activeField.getBoundingClientRect();
      // Off-screen / detached field → hide rather than park the button at 0,0.
      if (r.width === 0 && r.height === 0) {
        fieldButtonState.visible = false;
        return;
      }
      const SIZE = 28, INSET = 6;
      // Bottom-right for tall fields; vertically centered for short ones (inputs).
      const top = r.height < SIZE + INSET * 2 ? r.top + (r.height - SIZE) / 2 : r.bottom - SIZE - INSET;
      fieldButtonState.left = r.right - SIZE - INSET;
      fieldButtonState.top = top;
      fieldButtonState.count = current.length;
      fieldButtonState.severity = current.reduce(
        (acc, s) => (SEVERITY_RANK[s.severity] > SEVERITY_RANK[acc] ? s.severity : acc),
        'suggestion' as Suggestion['severity'],
      );
      fieldButtonState.onOpen = openReview;
      fieldButtonState.visible = true;
    }

    // ---- Review panel: step through the field's issues with Accept/Dismiss + prev/next ----
    let reviewIndex = 0;

    function positionReview() {
      const W = 320, H_EST = 170, GAP = 8;
      let left = fieldButtonState.left + 28 - W; // right edge aligns with the button
      let top = fieldButtonState.top - H_EST - GAP; // above the button…
      if (top < 8) top = fieldButtonState.top + 28 + GAP; // …or below if no room
      if (left < 8) left = 8;
      reviewState.left = left;
      reviewState.top = top;
    }

    function renderReviewItem() {
      if (!activeField || current.length === 0) { hideReview(); return; }
      reviewIndex = Math.max(0, Math.min(reviewIndex, current.length - 1));
      const s = current[reviewIndex];
      const full = getFieldText(activeField, activeType);
      const CTX = 28;
      reviewState.before = full.slice(Math.max(0, s.offset - CTX), s.offset);
      reviewState.oldText = full.slice(s.offset, s.offset + s.length);
      reviewState.replacement = s.replacements[0] ?? '';
      reviewState.after = full.slice(s.offset + s.length, s.offset + s.length + CTX);
      reviewState.category = categoryLabel(lang, s.category);
      reviewState.title = ruleExplanation(lang, s.ruleId, s.message) ?? '';
      reviewState.replacements = s.replacements;
      reviewState.canAccept = s.replacements.length > 0;
      reviewState.index = reviewIndex + 1;
      reviewState.total = current.length;
      positionReview();
      renderer.highlight(getSpanRects(activeField, activeType, s.offset, s.length), s.severity);
    }

    function openReview() {
      if (!activeField || current.length === 0) return;
      reviewIndex = 0;
      hideCard();
      hideAIPanel();
      reviewState.onAccept = () => { const s = current[reviewIndex]; if (s) void reviewApply(s.replacements[0] ?? ''); };
      reviewState.onPick = (rep) => void reviewApply(rep);
      reviewState.onDismiss = reviewDismiss;
      reviewState.onPrev = () => { reviewIndex = (reviewIndex - 1 + current.length) % current.length; renderReviewItem(); };
      reviewState.onNext = () => { reviewIndex = (reviewIndex + 1) % current.length; renderReviewItem(); };
      reviewState.onClose = hideReview;
      renderReviewItem();
      reviewState.visible = true;
    }

    function hideReview() {
      reviewState.visible = false;
      reviewState.onAccept = null;
      reviewState.onPick = null;
      reviewState.onDismiss = null;
      reviewState.onPrev = null;
      reviewState.onNext = null;
      reviewState.onClose = null;
      renderer.clearHighlight();
    }

    async function reviewApply(rep: string) {
      const s = current[reviewIndex];
      if (!s || !activeField) return;
      applyReplacement(activeField, activeType, s, rep);
      // Text changed → re-check for valid offsets; runCheckNow re-renders the panel.
      await runCheckNow();
      if (current.length === 0) hideReview();
      else renderReviewItem();
    }

    function reviewDismiss() {
      const s = current[reviewIndex];
      if (!s) return;
      dismissed.add(suggestionKey(s));
      current = current.filter((c) => suggestionKey(c) !== suggestionKey(s));
      drawUnderlines();
      if (current.length === 0) hideReview();
      else renderReviewItem();
    }

    let rafId = 0;
    function scheduleRedraw() {
      // M2b: hide the card on scroll/resize rather than repositioning it.
      // Repositioning against moving anchors is M4; hiding is the accepted fallback.
      if (cardState.visible) hideCard();
      if (reviewState.visible) renderReviewItem();
      if (rafId) return;
      rafId = requestAnimationFrame(() => { rafId = 0; drawUnderlines(); });
    }

    const HOVER_DELAY = 150;
    // Generous grace so moving the mouse from the underline across the gap to the
    // card doesn't dismiss it (Grammarly waits ~1s). The card's own mouseenter sets
    // cardState.hovered, which cancels the hide entirely once reached.
    const HIDE_GRACE = 700;
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
        const key = suggestionKey(s);
        if (activeField) applyReplacement(activeField, activeType, s, replacement);
        // Drop the applied suggestion immediately so its underline disappears and the
        // field-button count drops now — don't wait for a re-focus. The text changed,
        // so re-check for the authoritative set (other offsets have shifted).
        current = current.filter((c) => suggestionKey(c) !== key);
        hideCard();
        drawUnderlines();
        if (activeField) runCheck();
      };
      cardState.onDismiss = () => {
        const key = suggestionKey(s);
        dismissed.add(key);
        // Actually drop the dismissed suggestion so its underline disappears and the
        // field-button count decrements. (Previously dismiss only hid the card; the
        // underline used to vanish only as a side effect of the field-blur clearing
        // everything — which no longer happens now that results persist on blur.)
        current = current.filter((c) => suggestionKey(c) !== key);
        hideCard();
        drawUnderlines();
      };
      // Safe to re-read field text here: a card is only ever shown for the last
      // completed check, and the `input` handler hides the card on every keystroke,
      // so the field text still matches the suggestion's offsets.
      const word =
        activeField ? getFieldText(activeField, activeType).slice(s.offset, s.offset + s.length).trim() : '';
      cardState.dictionaryWord = isDictionaryCategory(s.category) && word ? word : null;
      cardState.onAddToDictionary =
        cardState.dictionaryWord
          ? async () => {
              const cur = await getSettings();
              await setSettings(addWord(cur, word));
              dictionary.add(word.toLowerCase()); // optimistic local update
              hideCard();
              if (activeField) runCheck();
            }
          : null;
      cardState.lang = lang;
      cardState.visible = true;
      shownIndex = index;
      // Tint the flagged span while its card is open.
      if (activeField) renderer.highlight(getSpanRects(activeField, activeType, s.offset, s.length), s.severity);
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
      cardState.dictionaryWord = null;
      cardState.onAddToDictionary = null;
      shownIndex = -1;
      renderer.clearHighlight();
    }

    let aiSelection: SelectionInfo | null = null;
    let rewriteSeq = 0;
    let activeStreamId: string | null = null;

    function hideAIPanel() {
      aiPanelState.phase = 'hidden';
      aiPanelState.result = '';
      aiPanelState.streamingText = '';
      aiPanelState.error = '';
      aiPanelState.onAction = null;
      aiPanelState.capability = 'rewrite';
      aiPanelState.onApply = null;
      aiPanelState.onCopy = null;
      aiPanelState.onDismiss = null;
      aiPanelState.onPickSynonym = null;
      aiPanelState.hovered = false;
      aiPanelState.tone = '';
      aiPanelState.length = 'asis';
      aiPanelState.onSetTone = null;
      aiPanelState.onSetLength = null;
      aiPanelState.onClose = null;
      aiPanelState.improvements = [];
      aiPanelState.onApplyImprovement = null;
      aiSelection = null;
      activeStreamId = null;
    }

    // The user explicitly closed the panel (× or click-outside): remember which
    // selection it was for, so mouseup/selectionchange don't immediately reopen it.
    let closedSelKey = '';
    function userDismissAIPanel() {
      closedSelKey = aiSelection ? `${aiSelection.start}:${aiSelection.end}` : '';
      hideAIPanel();
    }

    function selectionRect(): { left: number; top: number; width: number; height: number } {
      if (activeType === 'contenteditable') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0).getBoundingClientRect();
          if (r.width || r.height) return { left: r.left, top: r.top, width: r.width, height: r.height };
        }
      }
      const r = activeField!.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }

    function showAIActions() {
      if (!activeField) return;
      const info = getSelectionInfo(activeField, activeType);
      if (!info) {
        closedSelKey = ''; // selection gone → allow a fresh panel next time
        // hide only if idle (not loading/result) and not hovering the panel
        if ((aiPanelState.phase === 'actions') && !aiPanelState.hovered) hideAIPanel();
        return;
      }
      // Don't reopen the panel for a selection the user just closed.
      if (`${info.start}:${info.end}` === closedSelKey) return;
      // A settled loading/result/error panel is immutable until resolved: don't
      // reposition, re-bind the selection, or reset the phase out from under it.
      if (aiPanelState.phase !== 'hidden' && aiPanelState.phase !== 'actions') return;
      aiSelection = info;
      const pos = computeCardPosition(selectionRect(), { width: 320, height: 160 }, { width: window.innerWidth, height: window.innerHeight });
      aiPanelState.left = pos.left;
      aiPanelState.top = pos.top;
      aiPanelState.tone = defaultTone;
      aiPanelState.length = 'asis';
      // Word selection → Synonyms-first; phrase/sentence → Rewrite-first.
      const kind = isSingleWord(info.text) ? 'word' : 'phrase';
      aiPanelState.selectionKind = kind;
      aiPanelState.capability = kind === 'word' ? 'synonyms' : 'rewrite';
      aiPanelState.phase = 'actions';
      aiPanelState.onAction = (cap) => void doAction(cap);
      aiPanelState.onClose = userDismissAIPanel;
    }

    function triggerAI(capability: AICapability | 'open') {
      if (!enabled || !activeField) return;
      if (capability !== 'open' && !['rewrite', 'translate', 'synonyms', 'improve'].includes(capability)) return;
      const info = getSelectionInfo(activeField, activeType);
      if (!info) return; // need a non-collapsed selection in the focused field
      aiSelection = info;
      const pos = computeCardPosition(
        selectionRect(),
        { width: 320, height: 160 },
        { width: window.innerWidth, height: window.innerHeight },
      );
      aiPanelState.left = pos.left;
      aiPanelState.top = pos.top;
      aiPanelState.tone = defaultTone;
      aiPanelState.length = 'asis';
      if (capability === 'open') {
        aiPanelState.capability = 'rewrite';
        aiPanelState.phase = 'actions';
        aiPanelState.onAction = (cap) => void doAction(cap);
      } else {
        void doAction(capability);
      }
    }

    async function doAction(capability: AICapability) {
      const sel = aiSelection;
      const field = activeField;
      const type = activeType;
      if (!sel || !field) return;
      const gen = ++rewriteSeq;
      aiPanelState.capability = capability;
      aiPanelState.onClose = userDismissAIPanel;
      aiPanelState.phase = 'loading';
      const streamId = crypto.randomUUID();
      activeStreamId = streamId;
      aiPanelState.streamingText = '';
      // Rewrite & Analyze operate on the whole sentence the selection belongs to (so a
      // single selected word still gets a meaningful rewrite/analysis). Translate &
      // Synonyms act on the literal selection.
      let aStart = sel.start, aEnd = sel.end, aText = sel.text;
      if (capability === 'rewrite' || capability === 'improve') {
        const full = getFieldText(field, type);
        const span = expandToSentence(full, sel.start, sel.end);
        aStart = span.start; aEnd = span.end; aText = full.slice(aStart, aEnd);
      }
      const options: Record<string, string> = {};
      if (capability === 'rewrite') {
        if (aiPanelState.tone) options.tone = aiPanelState.tone;
        if (aiPanelState.length && aiPanelState.length !== 'asis') options.length = aiPanelState.length;
      } else if (capability === 'improve') {
        if (aiPanelState.tone) options.tone = aiPanelState.tone;
      } else if (capability === 'translate') {
        options.targetLang = lang === 'pt-br' ? 'Portuguese' : 'English';
      }
      const res = await runAI({ capability, text: aText, options }, streamId);
      // Guard: if the panel was dismissed/hidden meanwhile, or a newer call started, drop the result.
      if (gen !== rewriteSeq || aiPanelState.phase !== 'loading') return;
      activeStreamId = null;
      if (res.ok) {
        if (capability === 'improve') {
          // Parse the model's edit list into applicable items; each Apply finds its
          // `original` in the live text (offsets may have shifted) and replaces it.
          const imps = parseImprovements(res.text);
          const toState = () => imps.map((x) => ({ from: x.original, to: x.improved, reason: x.reason }));
          aiPanelState.improvements = toState();
          aiPanelState.onApplyImprovement = (i: number) => {
            const im = imps[i];
            if (im && activeField) {
              const full = getFieldText(activeField, activeType);
              const off = full.indexOf(im.original);
              if (off !== -1) applyRange(activeField, activeType, off, off + im.original.length, im.improved);
            }
            imps.splice(i, 1);
            aiPanelState.improvements = toState();
            if (activeField) runCheck();
            if (imps.length === 0) hideAIPanel();
          };
          aiPanelState.onDismiss = () => hideAIPanel();
          aiPanelState.phase = 'result';
          return;
        }
        aiPanelState.result = res.text;
        aiPanelState.phase = 'result';
        aiPanelState.onCopy = () => { void navigator.clipboard?.writeText(res.text); };
        aiPanelState.onDismiss = () => hideAIPanel();
        aiPanelState.onApply =
          (capability === 'rewrite' || capability === 'translate')
            ? () => { applyRange(field, type, aStart, aEnd, res.text); hideAIPanel(); }
            : null;
        aiPanelState.onPickSynonym =
          capability === 'synonyms'
            ? (w: string) => { applyRange(field, type, sel.start, sel.end, w); hideAIPanel(); }
            : null;
        if (capability === 'rewrite') {
          aiPanelState.onSetTone = (t: string) => { aiPanelState.tone = t; void doAction('rewrite'); };
          aiPanelState.onSetLength = (l: string) => { aiPanelState.length = l; void doAction('rewrite'); };
        } else {
          aiPanelState.onSetTone = null;
          aiPanelState.onSetLength = null;
        }
      } else {
        aiPanelState.error = res.error;
        aiPanelState.phase = 'error';
        aiPanelState.onDismiss = () => hideAIPanel();
      }
    }

    getSettings().then((s) => {
      enabled = isEnabledForHost(s, host);
      disabledCategories = new Set(s.disabledCategories);
      dictionary = new Set(s.dictionary);
      lang = effectiveLang(s, navigator.language);
      defaultTone = s.defaultTone;
    });
    onSettingsChanged((s) => {
      const next = isEnabledForHost(s, host);
      enabled = next;
      disabledCategories = new Set(s.disabledCategories);
      dictionary = new Set(s.dictionary);
      lang = effectiveLang(s, navigator.language);
      defaultTone = s.defaultTone;
      if (cardState.visible) cardState.lang = lang;
      if (!enabled) {
        runCheck.cancel();
        clearHoverTimers();
        hideCard();
        hideAIPanel();
        current = [];
        hitRects = [];
        renderer.clear();
        fieldButtonState.visible = false;
        hideReview();
      } else {
        // Re-enabled or settings changed (categories/dictionary).
        // While disabled, focusin was gated, so a field that was
        // already focused was never adopted. Adopt the live focused editable
        // element (if any) so re-checking works without a blur/refocus.
        if (!activeField) {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && isEditableField(focused)) {
            activeField = focused;
            activeType = classifyField(focused);
            suppressNativeSpellcheck(focused);
          }
        }
        if (activeField) runCheck();
      }
    });

    function onMouseMove(e: MouseEvent) {
      if (!enabled) return;
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

    let selScheduled = false;
    function onSelectionMaybe() {
      if (!enabled) return;
      if (selScheduled) return;
      selScheduled = true;
      requestAnimationFrame(() => { selScheduled = false; showAIActions(); });
    }
    ctx.addEventListener(document, 'selectionchange', onSelectionMaybe);
    ctx.addEventListener(document, 'mouseup', onSelectionMaybe);

    ctx.addEventListener(document, 'focusin', (e) => {
      const t = e.target as Element;
      if (enabled && t instanceof HTMLElement && isEditableField(t)) {
        runCheck.cancel();
        clearHoverTimers();
        hideCard();
        // Switching to a different field: drop the previous field's persisted
        // underlines/button immediately so they don't linger at stale positions
        // until the new check completes.
        if (t !== activeField) {
          current = [];
          hitRects = [];
          renderer.clear();
          fieldButtonState.visible = false;
          hideReview();
        }
        activeField = t;
        activeType = classifyField(t);
        suppressNativeSpellcheck(t);
        warmEngine();
        runCheck();
      }
    });
    ctx.addEventListener(document, 'input', (e) => {
      if (e.target === activeField) {
        // Text changed → offsets stale: drop dismissals and any open card.
        dismissed.clear();
        hideCard();
        hideAIPanel();
        renderer.clear();
        runCheck();
      }
    });
    ctx.addEventListener(document, 'focusout', (e) => {
      // Clicking a card button moves focus into our shadow-DOM overlay, which the
      // editor sees as a focusout. Ignore it: tearing down here would unmount the
      // card mid-click, so the replacement/dismiss handler would never run.
      const related = (e as FocusEvent).relatedTarget as Node | null;
      const intoOverlay = related != null && overlayHost != null
        && (related === overlayHost || overlayHost.contains(related));
      if (intoOverlay) {
        return;
      }
      // An in-flight AI panel (loading/result/error) survives the blur churn of a
      // panel-button click: that click focuses the button, then a follow-up focusout
      // fires with relatedTarget=null (focus settling), which would otherwise tear
      // down the panel mid-action and make doAction's loading-phase guard drop the
      // result. So keep it alive ONLY when related is null or moving into the overlay.
      // A genuine focus-away (Tab to another field, focus to a real element outside
      // the overlay) must tear the panel down so it does not orphan over the old field.
      const aiInFlight = aiPanelState.phase === 'loading'
        || aiPanelState.phase === 'result'
        || aiPanelState.phase === 'error';
      const keepAIPanel = aiInFlight && (related === null || intoOverlay);
      runCheck.cancel();
      clearHoverTimers();
      hideCard();
      if (!keepAIPanel) hideAIPanel();
      // Persist the underlines and the field button after blur — Grammarly/LanguageTool
      // behavior. We KEEP activeField/activeType tracked and the results drawn; they are
      // replaced only when another editable field is focused (focusin) or inkly is
      // disabled. (Keeping activeField also lets result-phase tone/length chips re-run
      // doAction() against the live field.)
    });
    // Deterministic outside-click dismissal for the AI panel. focusout can't tell a
    // genuine click on empty page area (relatedTarget=null) from panel-button churn
    // (also null), so a pointerdown anywhere outside the overlay tears the panel down.
    // A click on a panel button is inside overlayHost → NOT dismissed, so the button's
    // own click still fires. A new drag-selection's pointerdown hides any stale panel,
    // then mouseup/selectionchange re-opens a fresh actions panel.
    ctx.addEventListener(document, 'pointerdown', (e) => {
      if (aiPanelState.phase === 'hidden') return;
      // Use composedPath so a click landing inside the shadow root is detected even if
      // the event's retargeted .target is the shadow host (or a descendant of it).
      const path = e.composedPath();
      if (overlayHost && path.includes(overlayHost)) return; // clicking the panel itself
      const target = e.target as Node | null;
      if (target && overlayHost && overlayHost.contains(target)) return;
      userDismissAIPanel();
    });
    ctx.addEventListener(window, 'scroll', scheduleRedraw, { capture: true });
    ctx.addEventListener(window, 'resize', scheduleRedraw);

    browser.runtime.onMessage.addListener((msg: unknown) => {
      const m = msg as { type?: string; capability?: string };
      if (m?.type === 'inkly:ai:chunk') {
        const c = m as { streamId?: string; delta?: string };
        if (c.streamId && c.streamId === activeStreamId && aiPanelState.phase === 'loading') {
          aiPanelState.streamingText += c.delta ?? '';
        }
        return;
      }
      if (m?.type === 'inkly:trigger') {
        triggerAI((m.capability ?? 'open') as AICapability | 'open');
      }
      // return nothing (undefined) — this is a fire-and-forget trigger
    });

    if (import.meta.env.VITE_INKLY_E2E) {
      // Test-only hooks (e2e bridge). NEVER present in production builds.
      // Expose apply for manual/e2e testing (removed in M3 UI work):
      (window as any).__inklyApplyFirst = () => {
        if (activeField && current[0]) {
          applyReplacement(activeField, activeType, current[0], current[0].replacements[0]);
        }
      };
      (window as any).__inklyAIRewrite = async (text: string) => {
        const res = await runAI({ capability: 'rewrite', text }, crypto.randomUUID());
        return res.ok ? res.text : `ERROR:${res.error}`;
      };

      // e2e seam: the main-world test stub (loaded by the fixture page as a same-origin
      // <script>, since page CSP blocks inline injection) round-trips a rewrite request
      // here via window.postMessage. Content scripts run in an isolated world, so the
      // window.__inklyAIRewrite above is not reachable from page.evaluate (main world);
      // this listener bridges the gap by performing the real runAI call.
      ctx.addEventListener(window, 'message', (e: MessageEvent) => {
        const d = (e as MessageEvent).data;
        if (e.source !== window || !d || d.__inkly !== 'ai-rewrite-req') return;
        runAI({ capability: 'rewrite', text: d.text }, crypto.randomUUID()).then((res) => {
          window.postMessage(
            { __inkly: 'ai-rewrite-res', id: d.id, result: res.ok ? res.text : `ERROR:${res.error}` },
            '*',
          );
        });
      });
    }
  },
});
