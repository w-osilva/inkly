import { browser } from 'wxt/browser';
// Design tokens. With cssInjectionMode:'ui', WXT/Vite collects CSS imported by the
// content entry and injects it into the shadow root, so :host token defs resolve
// for the mounted Svelte components.
import '../ui/tokens.css';
import { classifyField, isEditableField } from '../core/field-detector';
import { getFieldText } from '../core/text-model';
import { mergeSuggestions } from '../core/orchestrator';
import { checkPunctuation } from '../core/punctuation';
import { priorityFromOrder, toolIdForSource, DEFAULT_CORRECTION_ORDER } from '../core/tools';
import { isEnglishLang, fieldLangTag } from '../core/lang-detect';
import { HarperProvider } from '../core/providers/harper-provider';
import { OverlayRenderer } from '../ui/overlay-renderer';
import { computeUnderlineStyles, type Rect } from '../ui/underline-layout';
import { applyReplacement, applyRange } from '../core/apply-engine';
import { debounce } from '../core/debounce';
import { offsetToRange } from '../core/dom-offset';
import { type FieldType, type Suggestion, makeSuggestion } from '../core/types';
import { mount } from 'svelte';
import SuggestionCard from '../ui/SuggestionCard.svelte';
import { cardState } from '../ui/card-state.svelte';
import { findHitIndex, type HitRect } from '../ui/hit-test';
import { computeCardPosition } from '../ui/card-position';
import { getSettings, setSettings, addWord, onSettingsChanged, isEnabledForHost, effectiveLang, applyTheme } from '../core/settings';
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
import { categoryLabel, LANG_NAME, dictCode } from '../core/i18n';
import { ruleExplanation } from '../core/rule-descriptions';
import { getSelectionInfo, type SelectionInfo } from '../core/selection';
import { expandToSentence, isSingleWord } from '../core/sentence';
import { parseImprovements, type Improvement } from '../core/ai/parse-improvements';
import { stripThinking } from '../core/ai/strip-thinking';
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

        // Promote the overlay into the browser TOP LAYER (Popover API) so it renders above
        // ALL page content — including the page's own top-layer popovers/tooltips (e.g. a
        // docs site's "Copy to clipboard" button), which otherwise leak in front of our
        // dropdown regardless of z-index. Reset the UA popover styles back to our
        // full-viewport, transparent, click-through overlay.
        try {
          const host = shadowHost as HTMLElement & { showPopover?: () => void };
          host.setAttribute('popover', 'manual');
          for (const [k, v] of Object.entries({
            border: '0', background: 'transparent', padding: '0', margin: '0',
            inset: '0', width: '100%', height: '100%', 'max-width': 'none', 'max-height': 'none',
            overflow: 'visible',
          })) host.style.setProperty(k, v);
          host.showPopover?.();
        } catch { /* no Popover API → falls back to the high z-index below */ }

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
    let current: Suggestion[] = [];      // grammar/spelling (Harper + punctuation + proofread)
    let rendered: Suggestion[] = [];     // what's actually drawn/hit-tested: grammar + AI suggestions
    let checkSeq = 0;
    let hitRects: HitRect[] = [];
    let lang: Lang = 'en';
    let defaultTone = '';
    let defaultStyles: string[] = [];
    let defaultLength = 'asis';
    let correctionOrder: string[] = [...DEFAULT_CORRECTION_ORDER];
    let correctionDisabled: string[] = [];
    let selectionActionsDisabled: string[] = [];
    const aiImproveEnabled = () => !correctionDisabled.includes('aiImprove');
    // Keep only suggestions whose tool is enabled; rank overlaps by the user's tool order.
    const toolOn = (s: Suggestion) => {
      const id = toolIdForSource(s.source);
      return !id || !correctionDisabled.includes(id);
    };
    const priority = () => priorityFromOrder(correctionOrder);

    // AI "improve" never converges (clarity can always be re-tweaked), so applying one of
    // its suggestions used to re-trigger auto-improve on the changed text → endless loop.
    // After applying an AI improvement we PAUSE auto-improve until the user actually types
    // again. `programmaticEdit` marks edits we make ourselves (their input event isn't
    // typing, so it must not lift the pause).
    let programmaticEdit = false;
    let suppressAutoImprove = false;
    // Text we just applied — don't let any engine immediately re-flag it (e.g. LanguageTool
    // suggesting "occasionally on weekends" right after you accepted "on weekends
    // occasionally"). Cleared when the user actually types. Text-based, so offset shifts
    // from other edits don't matter.
    const appliedText = new Set<string>();
    function applyEdit(fn: () => void) {
      programmaticEdit = true;
      try { fn(); } finally { programmaticEdit = false; }
    }

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
      // Harper/LanguageTool/Proofreader (raw) + our punctuation rules — each kept only if
      // its tool is enabled, then merged by the user's priority order. On non-English
      // fields, drop the English-only engines (Harper, Proofreader) so they don't flag
      // correct words; LanguageTool (auto-detect) covers the language instead.
      const punct = correctionDisabled.includes('punctuation') ? [] : checkPunctuation(text);
      const englishField = isEnglishLang(fieldLangTag(field));
      const langOk = (s: Suggestion) => englishField || (s.source !== 'harper' && s.source !== 'chrome-proofread');
      current = mergeSuggestions([...raw, ...punct].filter(toolOn).filter(langOk), priority());
      current = current.filter((s) => !dismissed.has(suggestionKey(s)));
      current = current.filter(
        (s) => !isSuppressed(s, text.slice(s.offset, s.offset + s.length), disabledCategories, dictionary),
      );
      // Don't re-flag text we just applied (stops accept → re-suggest flip-flop).
      current = current.filter((s) => !appliedText.has(text.slice(s.offset, s.offset + s.length)));
      // Drop improvements whose target no longer exists (applied or edited away) so the
      // ✨ count/panel don't keep marking already-fixed text.
      aiImprovements = aiImprovements.filter((im) => text.includes(im.original) && !appliedText.has(im.original));
      if (cardState.visible) hideCard();
      drawUnderlines();
      if (reviewState.visible) renderReviewItem();
      scheduleAutoImprove();
    }
    const runCheck = debounce(runCheckNow, 400);

    // AI writing improvements live in their OWN list (not in `current`), so grammar
    // underlines and the grammar review stay clean. They surface via a separate ✨
    // field button. `current` is grammar/spelling (Harper) only.
    let aiImprovements: Improvement[] = [];

    // Automatic writing suggestions on typing pause: on-device when a built-in model
    // exists (free), otherwise the user's BYOK key. Gated by the autoSuggest setting so a
    // cost-conscious user can turn off the BYOK passes. Results surface inline (and in the
    // ✨ panel). Errors/rate-limits are swallowed silently — no cost surprises, no spam.
    // Count of in-flight AI improvement passes → drives the ✨ button spinner. A counter
    // (not a boolean) so overlapping passes don't clear the spinner prematurely.
    let improveInFlight = 0;
    function setImproveLoading() {
      fieldButtonState.improveLoading = improveInFlight > 0;
    }

    async function runAutoImprove() {
      const field = activeField;
      const type = activeType;
      if (!enabled || !aiImproveEnabled() || suppressAutoImprove || !field) return;
      // AI runs ALONGSIDE LanguageTool — LT is the base, but it misses things (e.g. a wrong
      // verb form like "to eating"), so AI catches the gaps. Overlaps with LT/Harper are
      // deduped by priority in the merge (rules win), so AI only adds what they missed.
      const text = getFieldText(field, type);
      if (text.trim().length < 12) return;
      const myCheck = checkSeq;
      improveInFlight++;
      setImproveLoading();
      try {
        const res = await runAI({ capability: 'improve', text, options: defaultTone ? { tone: defaultTone } : {} }, crypto.randomUUID());
        if (!res.ok) return; // no on-device model AND no/failed BYOK — silent
        if (checkSeq !== myCheck || activeField !== field) return;
        aiImprovements = parseImprovements(res.text).filter((im) => text.includes(im.original));
        updateFieldButton();
        drawUnderlines(); // surface the new suggestions inline
      } finally {
        improveInFlight--;
        setImproveLoading();
      }
    }
    const scheduleAutoImprove = debounce(() => { void runAutoImprove(); }, 1500);

    // ✨ button: show the improvements we have, or fetch them on demand (built-in→BYOK).
    function openImprovePanel() {
      if (aiImprovements.length > 0) showImprovePanel();
      else void runFieldImprove();
    }

    function positionImprovePanel() {
      const W = 300, H = 160, GAP = 8;
      let left = fieldButtonState.left + 28 - W; // right-align near the widget
      let top = fieldButtonState.top - H - GAP;
      if (top < 8) top = fieldButtonState.top + 32 + GAP;
      if (left < 8) left = 8;
      aiPanelState.left = left;
      aiPanelState.top = top;
      // Anchor to the field-button widget so the panel can re-fit after measuring.
      aiPanelState.anchor = { left: fieldButtonState.left, top: fieldButtonState.top, width: 28, height: 28 };
    }

    function improvementsToState() {
      const text = activeField ? getFieldText(activeField, activeType) : '';
      return aiImprovements
        .filter((im) => text.includes(im.original) && !appliedText.has(im.original))
        .map((im) => ({ from: im.original, to: im.improved, reason: im.reason }));
    }

    function showImprovePanel() {
      if (!activeField) return;
      raiseOverlay();
      hideCard();
      hideReview();
      positionImprovePanel();
      aiPanelState.capability = 'improve';
      aiPanelState.onClose = userDismissAIPanel;
      aiPanelState.improvements = improvementsToState();
      aiPanelState.onApplyImprovement = (i: number) => {
        const im = aiImprovements[i];
        if (im && activeField) {
          const full = getFieldText(activeField, activeType);
          const off = full.indexOf(im.original);
          if (off !== -1) applyEdit(() => applyRange(activeField!, activeType, off, off + im.original.length, im.improved));
        }
        if (im) appliedText.add(im.improved); // leave the applied result alone
        suppressAutoImprove = true; // don't auto-suggest more until the user types again
        aiImprovements = aiImprovements.filter((_, idx) => idx !== i);
        aiPanelState.improvements = improvementsToState();
        updateFieldButton();
        if (activeField) runCheck();
        if (aiImprovements.length === 0) hideAIPanel();
      };
      aiPanelState.onDismiss = () => hideAIPanel();
      aiPanelState.phase = 'result';
    }

    async function runFieldImprove() {
      const field = activeField;
      const type = activeType;
      if (!field) return;
      const text = getFieldText(field, type);
      if (!text.trim()) return;
      positionImprovePanel();
      aiPanelState.capability = 'improve';
      aiPanelState.onClose = userDismissAIPanel;
      aiPanelState.phase = 'loading';
      const gen = ++rewriteSeq;
      improveInFlight++;
      setImproveLoading();
      let res;
      try {
        res = await runAI({ capability: 'improve', text, options: defaultTone ? { tone: defaultTone } : {} }, crypto.randomUUID());
      } finally {
        improveInFlight--;
        setImproveLoading();
      }
      if (gen !== rewriteSeq || aiPanelState.phase !== 'loading') return;
      if (!res.ok) {
        aiPanelState.error = res.error;
        aiPanelState.phase = 'error';
        aiPanelState.onDismiss = () => hideAIPanel();
        return;
      }
      aiImprovements = parseImprovements(res.text).filter((im) => text.includes(im.original));
      updateFieldButton();
      drawUnderlines(); // surface inline too
      if (aiImprovements.length === 0) {
        aiPanelState.improvements = [];
        aiPanelState.onDismiss = () => hideAIPanel();
        aiPanelState.phase = 'result'; // shows "Looks good — no changes to suggest."
        return;
      }
      showImprovePanel();
    }

    // AI writing improvements as inline suggestions: locate each in the live text and map
    // to the subjective ('suggestion') tier so they underline distinctly from grammar.
    function aiSuggestionList(): Suggestion[] {
      if (!activeField || !aiImproveEnabled() || aiImprovements.length === 0) return [];
      const text = getFieldText(activeField, activeType);
      const out: Suggestion[] = [];
      for (const im of aiImprovements) {
        if (appliedText.has(im.original)) continue; // don't re-suggest what we just applied
        const offset = text.indexOf(im.original);
        if (offset === -1) continue;
        out.push(makeSuggestion({
          offset,
          length: im.original.length,
          replacements: [im.improved],
          message: im.reason || 'Consider rephrasing for clarity.',
          ruleId: 'AIImprovement',
          category: 'Style',
          severity: 'suggestion',
          source: 'byok',
        }));
      }
      return out;
    }

    // Re-promote our top-layer overlay to the FRONT of the top layer. Page top-layer
    // elements (e.g. a docs "Copy" popover) shown after us would otherwise sit in front;
    // re-showing the popover moves us back on top whenever we open interactive UI.
    function raiseOverlay() {
      const host = overlayHost as (HTMLElement & { hidePopover?: () => void; showPopover?: () => void }) | null;
      if (!host?.showPopover) return;
      try { host.hidePopover?.(); host.showPopover(); } catch { /* not open / unsupported */ }
    }

    function drawUnderlines() {
      if (!activeField) {
        hitRects = [];
        rendered = [];
        return renderer.clear();
      }
      // Grammar (Harper et al.) + AI suggestions, deduped by the user's tool priority.
      rendered = mergeSuggestions([...current, ...aiSuggestionList()], priority());
      const containerRect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const nextHitRects: HitRect[] = [];
      const styles = rendered.flatMap((s, index) => {
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
      if (!enabled || !activeField) { fieldButtonState.visible = false; return; }
      const r = activeField.getBoundingClientRect();
      // Off-screen / detached field → hide rather than park the widget at 0,0.
      if (r.width === 0 && r.height === 0) { fieldButtonState.visible = false; return; }
      const fieldText = getFieldText(activeField, activeType);
      const hasText = fieldText.trim().length > 0;
      // Only improvements whose target still exists (and weren't just applied) count.
      const liveImprovements = aiImprovements.filter((im) => fieldText.includes(im.original) && !appliedText.has(im.original));
      // Show the widget whenever there's text to act on (so the ✨ improve button is
      // always reachable), or there are grammar issues / improvements pending.
      if (!hasText && current.length === 0 && liveImprovements.length === 0) {
        fieldButtonState.visible = false;
        return;
      }
      const SIZE = 28, INSET = 6, GROUP_W = SIZE; // a single round widget
      // Bottom-right for tall fields; vertically centered for short ones (inputs).
      const top = r.height < SIZE + INSET * 2 ? r.top + (r.height - SIZE) / 2 : r.bottom - SIZE - INSET;
      fieldButtonState.left = Math.max(8, r.right - GROUP_W - INSET);
      fieldButtonState.top = top;
      fieldButtonState.count = current.length; // grammar/spelling (Harper) only
      fieldButtonState.improveCount = liveImprovements.length;
      fieldButtonState.severity = current.reduce(
        (acc, s) => (SEVERITY_RANK[s.severity] > SEVERITY_RANK[acc] ? s.severity : acc),
        'suggestion' as Suggestion['severity'],
      );
      fieldButtonState.onOpen = openReview;
      fieldButtonState.onOpenImprove = openImprovePanel;
      fieldButtonState.onDisableSite = disableForSite;
      fieldButtonState.visible = true;
    }

    // Turn inkly off for this host from the widget menu. Persisting the override fires the
    // storage listener above, which flips `enabled` and tears the in-page UI down.
    async function disableForSite() {
      const cur = await getSettings();
      await setSettings({ ...cur, siteOverrides: { ...cur.siteOverrides, [host]: false } });
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
      raiseOverlay();
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
      applyEdit(() => applyReplacement(activeField!, activeType, s, rep));
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

    // The correction card opens on a click on an underlined word (not hover), so it
    // never competes with text selection. `shownIndex` tracks which card is open.
    let shownIndex = -1;

    function showCardFor(index: number) {
      raiseOverlay();
      const s = rendered[index];
      const hit = hitRects.find((h) => h.index === index);
      if (!s || !hit) return;
      const CARD = { width: 300, height: 140 };
      const pos = computeCardPosition(hit, CARD, { width: window.innerWidth, height: window.innerHeight });
      cardState.suggestion = s;
      cardState.severity = s.severity;
      cardState.left = pos.left;
      cardState.top = pos.top;
      const isAI = s.ruleId === 'AIImprovement';
      // Capture the flagged text BEFORE applying (after apply the slice is the replacement).
      const origText = activeField ? getFieldText(activeField, activeType).slice(s.offset, s.offset + s.length) : '';
      // Drop the just-acted-on suggestion from the right source list so its underline
      // disappears immediately. Grammar lives in `current`; AI suggestions are derived
      // from `aiImprovements`.
      const dropSuggestion = () => {
        if (isAI) {
          aiImprovements = aiImprovements.filter((im) => !(im.improved === s.replacements[0] && im.original === origText));
        } else {
          const key = suggestionKey(s);
          current = current.filter((c) => suggestionKey(c) !== key);
        }
      };
      cardState.onApply = (replacement: string) => {
        if (activeField) applyEdit(() => applyReplacement(activeField!, activeType, s, replacement));
        appliedText.add(replacement); // leave the applied result alone (no flip-flop)
        if (isAI) suppressAutoImprove = true; // applying an AI clarity fix shouldn't spawn more
        // Drop it now so its underline/count update immediately; the text changed, so
        // re-check for the authoritative set (other offsets have shifted).
        dropSuggestion();
        hideCard();
        drawUnderlines();
        if (activeField) runCheck();
      };
      cardState.onDismiss = () => {
        if (!isAI) dismissed.add(suggestionKey(s));
        dropSuggestion();
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

    function hideCard() {
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
      aiPanelState.onDismiss = null;
      aiPanelState.onPickSynonym = null;
      aiPanelState.hovered = false;
      aiPanelState.tone = '';
      aiPanelState.styles = [];
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
      raiseOverlay();
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
      const rect = selectionRect();
      const pos = computeCardPosition(rect, { width: 320, height: 160 }, { width: window.innerWidth, height: window.innerHeight });
      aiPanelState.left = pos.left;
      aiPanelState.top = pos.top;
      aiPanelState.anchor = rect;
      aiPanelState.tone = defaultTone;
      aiPanelState.styles = [...defaultStyles];
      aiPanelState.length = defaultLength;
      // Word selection → Synonyms-first; phrase/sentence → Rewrite-first.
      const kind = isSingleWord(info.text) ? 'word' : 'phrase';
      aiPanelState.selectionKind = kind;
      aiPanelState.disabledActions = selectionActionsDisabled;
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
      raiseOverlay();
      aiSelection = info;
      const rect = selectionRect();
      const pos = computeCardPosition(
        rect,
        { width: 320, height: 160 },
        { width: window.innerWidth, height: window.innerHeight },
      );
      aiPanelState.left = pos.left;
      aiPanelState.top = pos.top;
      aiPanelState.anchor = rect;
      aiPanelState.tone = defaultTone;
      aiPanelState.styles = [...defaultStyles];
      aiPanelState.length = defaultLength;
      if (capability === 'open') {
        aiPanelState.capability = 'rewrite';
        aiPanelState.disabledActions = selectionActionsDisabled;
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
        if (aiPanelState.styles.length) options.style = aiPanelState.styles.join(', ');
        if (aiPanelState.length && aiPanelState.length !== 'asis') options.length = aiPanelState.length;
      } else if (capability === 'improve') {
        if (aiPanelState.tone) options.tone = aiPanelState.tone;
      } else if (capability === 'synonyms') {
        // Synonyms act on the literal selected word, but the surrounding sentence helps the
        // AI pick the sense that actually fits — pass it as context when it adds anything.
        const full = getFieldText(field, type);
        const span = expandToSentence(full, sel.start, sel.end);
        const sentence = full.slice(span.start, span.end).trim();
        if (sentence && sentence !== sel.text.trim()) options.context = sentence;
      } else if (capability === 'translate') {
        // Translate INTO the UI language in use.
        options.targetLang = LANG_NAME[lang];
      } else if (capability === 'define') {
        // Define IN the UI language: a code for the dictionary API, a name for the AI fallback.
        options.defineCode = dictCode(lang);
        options.defineLang = LANG_NAME[lang];
      }
      const res = await runAI({ capability, text: aText, options }, streamId);
      // Guard: if the panel was dismissed/hidden meanwhile, or a newer call started, drop the result.
      if (gen !== rewriteSeq || aiPanelState.phase !== 'loading') return;
      activeStreamId = null;
      // Drop any reasoning-model <think> block before display/apply (e.g. Qwen3 in Ollama),
      // so it never lands in the document or the result panel.
      if (res.ok) res.text = stripThinking(res.text);
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
              if (off !== -1) applyEdit(() => applyRange(activeField!, activeType, off, off + im.original.length, im.improved));
            }
            if (im) appliedText.add(im.improved);
            suppressAutoImprove = true;
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
        aiPanelState.onDismiss = () => hideAIPanel();
        aiPanelState.onApply =
          (capability === 'rewrite' || capability === 'translate')
            ? () => { applyEdit(() => applyRange(field, type, aStart, aEnd, res.text)); hideAIPanel(); }
            : null;
        aiPanelState.onPickSynonym =
          capability === 'synonyms'
            ? (w: string) => { applyEdit(() => applyRange(field, type, sel.start, sel.end, w)); hideAIPanel(); }
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
      defaultStyles = s.defaultStyles;
      defaultLength = s.defaultLength;
      correctionOrder = s.correctionOrder;
      correctionDisabled = s.correctionDisabled;
      selectionActionsDisabled = s.selectionActionsDisabled;
      if (overlayHost) applyTheme(overlayHost, s.theme);
    });
    onSettingsChanged((s) => {
      const next = isEnabledForHost(s, host);
      enabled = next;
      disabledCategories = new Set(s.disabledCategories);
      dictionary = new Set(s.dictionary);
      lang = effectiveLang(s, navigator.language);
      defaultTone = s.defaultTone;
      defaultStyles = s.defaultStyles;
      defaultLength = s.defaultLength;
      correctionOrder = s.correctionOrder;
      correctionDisabled = s.correctionDisabled;
      selectionActionsDisabled = s.selectionActionsDisabled;
      if (overlayHost) applyTheme(overlayHost, s.theme);
      if (cardState.visible) cardState.lang = lang;
      if (!enabled) {
        runCheck.cancel();
        hideCard();
        hideAIPanel();
        current = [];
        hitRects = [];
        aiImprovements = [];
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
        // Turning the AI-improve tool off clears any pending inline AI suggestions now.
        if (!aiImproveEnabled() && aiImprovements.length > 0) {
          aiImprovements = [];
          updateFieldButton();
          drawUnderlines();
        }
        if (activeField) runCheck();
      }
    });

    // Click on an underlined word → open its correction card. A click that's part of
    // selecting text (non-collapsed selection) is left to the AI toolbox path. Clicks
    // inside our overlay (card/panel buttons) and clicks off any underline are ignored
    // here; clicking elsewhere closes an open card.
    ctx.addEventListener(document, 'click', (e) => {
      if (!enabled || !activeField) return;
      const me = e as MouseEvent;
      if (overlayHost && me.composedPath().includes(overlayHost)) return; // our own UI
      if (getSelectionInfo(activeField, activeType)) return; // a selection → toolbox
      const idx = findHitIndex(me.clientX, me.clientY, hitRects);
      if (idx !== -1) showCardFor(idx);
      else if (cardState.visible) hideCard();
    });

    // Hand cursor over a marked word, so it reads as clickable. We toggle the field's own
    // cursor (the underline overlay is pointer-events:none); restored when not over a mark.
    let cursorOnHit = false;
    function setHitCursor(on: boolean) {
      if (on === cursorOnHit || !activeField) return;
      cursorOnHit = on;
      if (on) activeField.style.setProperty('cursor', 'pointer');
      else activeField.style.removeProperty('cursor');
    }
    ctx.addEventListener(document, 'mousemove', (e) => {
      if (!enabled || !activeField) return;
      const me = e as MouseEvent;
      const overMark = !getSelectionInfo(activeField, activeType)
        && findHitIndex(me.clientX, me.clientY, hitRects) !== -1;
      setHitCursor(overMark);
    });

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
      if (!(enabled && t instanceof HTMLElement && isEditableField(t))) return;
      // Re-focusing the field we already track (e.g. clicking an underline to open its
      // card): results are still valid — leave the card and underlines alone. Tearing
      // down + re-checking here is what made a just-clicked card flash open then closed.
      if (t === activeField) {
        suppressNativeSpellcheck(t);
        return;
      }
      // A different field → adopt it; drop the previous field's persisted marks.
      setHitCursor(false); // clear the hand cursor from the field we're leaving
      runCheck.cancel();
      hideCard();
      current = [];
      hitRects = [];
      aiImprovements = [];
      renderer.clear();
      fieldButtonState.visible = false;
      hideReview();
      activeField = t;
      activeType = classifyField(t);
      suppressNativeSpellcheck(t);
      warmEngine();
      runCheck();
    });
    ctx.addEventListener(document, 'input', (e) => {
      if (e.target !== activeField) return;
      if (programmaticEdit) {
        // Our own applied edit: the apply handler keeps the remaining improvements (they
        // relocate by text match) and re-renders. Just re-lint grammar for shifted offsets;
        // do NOT wipe the list or tear down the panel, or applying one would drop the rest.
        runCheck();
        return;
      }
      // Real typing lifts the auto-improve pause and re-enables suggestions everywhere.
      suppressAutoImprove = false;
      appliedText.clear();
      dismissed.clear();
      aiImprovements = [];
      hideCard();
      hideAIPanel();
      renderer.clear();
      runCheck();
    });
    ctx.addEventListener(document, 'focusout', (e) => {
      // Only the tracked field's own blur matters here. Focus churn *inside* our shadow
      // overlay — clicking a panel button, or the panel unmounting after Apply — retargets
      // to the overlay host, not the field. Acting on it would cancel the pending recheck
      // (`runCheck.cancel()` below), which left the grammar count/underlines stale after
      // applying an edit in a textarea/input (where applyRange doesn't refocus the field).
      if (e.target !== activeField) return;
      // Clicking a card button moves focus into our shadow-DOM overlay, which the
      // editor sees as a focusout. Ignore it: tearing down here would unmount the
      // card mid-click, so the replacement/dismiss handler would never run.
      const related = (e as FocusEvent).relatedTarget as Node | null;
      const intoOverlay = related != null && overlayHost != null
        && (related === overlayHost || overlayHost.contains(related));
      if (intoOverlay) {
        return;
      }
      // Clicking any panel button (tab, tone chip, Apply, …) focuses it and fires a
      // focusout on the field with relatedTarget null (focus settling) or the overlay
      // host. That must NOT tear the panel down — otherwise multi-step flows like the
      // rewrite tone-config collapse mid-interaction. Keep ANY visible panel alive when
      // focus goes to null or into the overlay; only a genuine focus-away to another
      // real element (e.g. Tab to a different field) closes it. Outside clicks are
      // handled separately by the pointerdown dismissal.
      const keepAIPanel = aiPanelState.phase !== 'hidden' && (related === null || intoOverlay);
      runCheck.cancel();
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
