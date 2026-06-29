<script lang="ts">
  import { aiPanelState } from './ai-panel-state.svelte';
  import { parseSynonymGroups } from '../core/ai/parse-synonyms';
  import InklyMark from './InklyMark.svelte';

  const LOADING_LABELS: Record<string, string> = {
    rewrite: 'Rewriting…',
    translate: 'Translating…',
    synonyms: 'Finding synonyms…',
    improve: 'Checking…',
    define: 'Looking up…',
  };

  // Register scale (casual ↔ formal); neutral is the middle. The slider index maps here.
  const REGISTER = [
    { id: 'casual', label: 'Casual' },
    { id: 'friendly', label: 'Friendly' },
    { id: '', label: 'Neutral' },
    { id: 'professional', label: 'Professional' },
    { id: 'formal', label: 'Formal' },
  ];
  // Orthogonal style modifiers, layered on top of the register.
  const MODIFIERS = [
    { id: 'confident', label: 'Confident' },
    { id: 'technical', label: 'Technical' },
    { id: 'concise', label: 'Concise' },
  ];
  const registerIdx = $derived(Math.max(0, REGISTER.findIndex((r) => r.id === (aiPanelState.tone || ''))));
  function setRegister(i: number) { aiPanelState.tone = REGISTER[i]?.id ?? ''; }
  function toggleStyle(id: string) {
    aiPanelState.styles = aiPanelState.styles.includes(id)
      ? aiPanelState.styles.filter((s) => s !== id)
      : [...aiPanelState.styles, id];
  }
  const LENGTHS = [
    { id: 'asis', label: 'Same length' },
    { id: 'shorter', label: 'Shorter' },
    { id: 'longer', label: 'Longer' },
  ];

  // Actions reorder by selection kind: a single word leads with Synonyms; a phrase/
  // sentence leads with Rewrite. The primary (first) button is the accent-filled one.
  type Act = { cap: 'rewrite' | 'translate' | 'synonyms' | 'improve' | 'define'; icon: string; label: string };
  const TRANSLATE: Act = { cap: 'translate', icon: '🌐', label: 'Translate' };
  const SYNONYMS: Act = { cap: 'synonyms', icon: '⇄', label: 'Synonyms' };
  const IMPROVE: Act = { cap: 'improve', icon: '✨', label: 'Improve' };
  const REWRITE: Act = { cap: 'rewrite', icon: '✦', label: 'Rewrite' };
  const DEFINE: Act = { cap: 'define', icon: '📖', label: 'Define' };
  // Tab order leads with the most relevant action for the selection kind. Define is
  // word-only (you look up the meaning of a word, not a sentence).
  const ACTIONS: Record<'word' | 'phrase', Act[]> = {
    word: [SYNONYMS, DEFINE, TRANSLATE, IMPROVE, REWRITE],
    phrase: [REWRITE, IMPROVE, TRANSLATE, SYNONYMS],
  };

  // Positioning: content.ts gives a best-guess left/top + the anchor rect. Once mounted we
  // measure the panel's real height (which the guess can't know — synonyms/results vary a
  // lot) and re-fit: cap the scrollable body to the available space and place it on the
  // side (below/above) with more room, clamped to the viewport. This prevents the panel
  // from overflowing offscreen and clipping content.
  const MARGIN = 8, GAP = 6, MIN_BODY = 120;
  let node = $state<HTMLDivElement>();
  let bodyEl = $state<HTMLDivElement>();
  let posLeft = $state(0);
  let posTop = $state(0);
  let bodyMax = $state(10000);

  function reposition() {
    if (!node || !bodyEl) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const a = aiPanelState.anchor;
    const chrome = node.offsetHeight - bodyEl.offsetHeight; // header + paddings
    const natural = bodyEl.scrollHeight;                    // full content height, uncapped
    const spaceBelow = vh - (a.top + a.height) - GAP - MARGIN;
    const spaceAbove = a.top - GAP - MARGIN;
    // Prefer below; flip above only when it doesn't fit below and above is roomier.
    const fitsBelow = spaceBelow >= chrome + natural;
    const below = fitsBelow || spaceBelow >= spaceAbove;
    const avail = below ? spaceBelow : spaceAbove;
    bodyMax = Math.max(MIN_BODY, Math.min(natural, avail - chrome));
    const totalH = chrome + bodyMax;
    let top = below ? a.top + a.height + GAP : a.top - GAP - totalH;
    posTop = Math.max(MARGIN, Math.min(top, vh - totalH - MARGIN));
    let left = a.left;
    posLeft = Math.max(MARGIN, Math.min(left, vw - node.offsetWidth - MARGIN));
  }

  // Re-fit whenever the panel opens or its content (and thus height) changes.
  $effect(() => {
    void [
      aiPanelState.phase, aiPanelState.capability, aiPanelState.result,
      aiPanelState.streamingText, aiPanelState.improvements.length,
      aiPanelState.anchor.top, aiPanelState.anchor.left,
    ];
    if (aiPanelState.phase === 'hidden') return;
    reposition();
  });
</script>

{#if aiPanelState.phase !== 'hidden'}
  <div
    bind:this={node}
    class="inkly-ai"
    role="group"
    aria-label="inkly AI"
    style="left:{posLeft}px; top:{posTop}px;"
    onmouseenter={() => (aiPanelState.hovered = true)}
    onmouseleave={() => (aiPanelState.hovered = false)}
  >
    {#if aiPanelState.phase !== 'error'}
      <div class="inkly-ai__head">
        <span class="inkly-ai__mark" aria-hidden="true"><InklyMark size={15} /></span>
        <span class="inkly-ai__brand">Inkly</span>
        <button class="inkly-ai__x inkly-ai__x--head" aria-label="Close" onclick={() => aiPanelState.onClose?.()}>×</button>
      </div>
    {/if}
    <div class="inkly-ai__body" bind:this={bodyEl} style="max-height:{bodyMax}px">
    {#if aiPanelState.phase === 'actions'}
      <div class="inkly-ai__tabs">
        {#each ACTIONS[aiPanelState.selectionKind].filter((a) => !aiPanelState.disabledActions.includes(a.cap)) as a, i}
          <button
            class="inkly-ai__tab"
            class:inkly-ai__tab--primary={i === 0}
            onclick={() => (a.cap === 'rewrite' ? (aiPanelState.phase = 'rewrite-config') : aiPanelState.onAction?.(a.cap))}
          >
            <span class="inkly-ai__tab-i" aria-hidden="true">{a.icon}</span>
            <span class="inkly-ai__tab-l">{a.label}</span>
          </button>
        {/each}
      </div>
    {:else if aiPanelState.phase === 'rewrite-config'}
      <div class="inkly-ai__seg">Tone — <strong>{REGISTER[registerIdx].label}</strong></div>
      <input
        class="inkly-ai__range" type="range" min="0" max={REGISTER.length - 1} step="1"
        value={registerIdx} aria-label="Tone register"
        oninput={(e) => setRegister(+(e.currentTarget as HTMLInputElement).value)}
      />
      <div class="inkly-ai__range-ends"><span>{REGISTER[0].label}</span><span>{REGISTER[REGISTER.length - 1].label}</span></div>
      <div class="inkly-ai__mods">
        {#each MODIFIERS as m}
          <button
            class="inkly-ai__mod" class:inkly-ai__mod--on={aiPanelState.styles.includes(m.id)}
            aria-pressed={aiPanelState.styles.includes(m.id)} onclick={() => toggleStyle(m.id)}
          >{m.label}</button>
        {/each}
      </div>
      <label class="inkly-ai__seg" for="inkly-length">Length</label>
      <select id="inkly-length" class="inkly-ai__select" bind:value={aiPanelState.length}>
        {#each LENGTHS as l}
          <option value={l.id}>{l.label}</option>
        {/each}
      </select>
      <div class="inkly-ai__row">
        <button class="inkly-ai__btn" onclick={() => aiPanelState.onAction?.('rewrite')}>Rewrite</button>
        <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => (aiPanelState.phase = 'actions')}>Back</button>
      </div>
    {:else if aiPanelState.phase === 'loading'}
      {#if aiPanelState.streamingText}
        <p class="inkly-ai__result">{aiPanelState.streamingText}</p>
      {:else}
        <span class="inkly-ai__loading">{LOADING_LABELS[aiPanelState.capability] ?? 'Working…'}</span>
      {/if}
    {:else if aiPanelState.phase === 'result'}
      {#if aiPanelState.capability === 'synonyms'}
        {#each parseSynonymGroups(aiPanelState.result) as group}
          <div class="inkly-ai__syn-group">
            {#if group.sense}<p class="inkly-ai__syn-sense">{group.sense}</p>{/if}
            <div class="inkly-ai__chips" role="group" aria-label="Synonyms">
              {#each group.words as syn}
                <button class="inkly-ai__chip" onclick={() => aiPanelState.onPickSynonym?.(syn)}>{syn}</button>
              {/each}
            </div>
          </div>
        {/each}
        <div class="inkly-ai__row">
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {:else if aiPanelState.capability === 'improve'}
        {#if aiPanelState.improvements.length === 0}
          <p class="inkly-ai__result">Looks good — no changes to suggest.</p>
        {:else}
          {#each aiPanelState.improvements as imp, i}
            <div class="inkly-ai__imp">
              {#if imp.reason}<p class="inkly-ai__imp-reason">{imp.reason}</p>{/if}
              <p class="inkly-ai__imp-line inkly-ai__imp-line--old"><del>{imp.from}</del></p>
              <p class="inkly-ai__imp-line inkly-ai__imp-line--new"><strong>{imp.to}</strong></p>
              <button class="inkly-ai__chip" onclick={() => aiPanelState.onApplyImprovement?.(i)}>Apply</button>
            </div>
          {/each}
        {/if}
        <div class="inkly-ai__row">
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {:else}
        <p class="inkly-ai__result">{aiPanelState.result}</p>
        <div class="inkly-ai__row">
          {#if aiPanelState.capability === 'rewrite' || aiPanelState.capability === 'translate'}
            <button class="inkly-ai__btn" onclick={() => aiPanelState.onApply?.()}>Apply</button>
          {/if}
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {/if}
    {:else if aiPanelState.phase === 'error'}
      <p class="inkly-ai__error">AI error: {aiPanelState.error}</p>
      <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
    {/if}
    </div>
  </div>
{/if}

<style>
  .inkly-ai {
    position: fixed; z-index: 2147483647; width: 274px; max-width: calc(100vw - 24px);
    background: var(--inkly-bg); color: var(--inkly-text);
    border: 1px solid var(--inkly-border); border-radius: 10px;
    box-shadow: var(--inkly-shadow); padding: 8px;
    font: 12.5px/1.4 var(--inkly-font); pointer-events: auto;
  }

  /* Scrollable body: caps to the available viewport space (set inline) so tall content
     (synonyms, long results) scrolls instead of overflowing offscreen. The header stays
     pinned above it. -2px/2px padding keeps focus rings from clipping at the scroll edge. */
  .inkly-ai__body {
    overflow-y: auto; overflow-x: hidden;
    margin: 0 -2px; padding: 0 2px;
    overscroll-behavior: contain;
  }

  /* Header row: mark + brand label + hotkey hint. */
  .inkly-ai__head {
    display: flex; align-items: center; gap: 6px; margin: 1px 2px 7px;
  }
  .inkly-ai__mark { flex: none; display: inline-flex; color: var(--inkly-accent); }
  .inkly-ai__brand {
    font-weight: 700; font-size: 11.5px; color: var(--inkly-muted); letter-spacing: 0.02em;
  }
  .inkly-ai__x {
    border: 0; background: none; cursor: pointer; color: var(--inkly-muted);
    font-size: 16px; line-height: 1; padding: 0 2px; border-radius: 5px;
  }
  .inkly-ai__x--head { margin-left: auto; }
  .inkly-ai__x:hover { color: var(--inkly-text); }

  .inkly-ai__result { margin: 2px; white-space: pre-wrap; color: var(--inkly-text); }
  .inkly-ai__imp { padding: 8px 2px; border-bottom: 1px solid var(--inkly-border); }
  .inkly-ai__imp:last-of-type { border-bottom: 0; margin-bottom: 4px; }
  .inkly-ai__imp-reason { margin: 0 0 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--inkly-muted); }
  .inkly-ai__imp-line { margin: 0 0 4px; padding: 4px 8px; border-radius: 6px; line-height: 1.4; font-size: 12.5px; }
  .inkly-ai__imp-line--old { background: rgba(229, 72, 77, 0.08); }
  .inkly-ai__imp-line--old del { color: var(--inkly-sev-correct); text-decoration: line-through; }
  .inkly-ai__imp-line--new { background: rgba(99, 102, 241, 0.1); margin-bottom: 7px; }
  .inkly-ai__imp-line--new strong { color: var(--inkly-accent); font-weight: 700; }
  .inkly-ai__row { display: flex; gap: 6px; }
  .inkly-ai__loading, .inkly-ai__error { display: block; padding: 2px; }
  .inkly-ai__loading { color: var(--inkly-muted); }
  .inkly-ai__error { color: var(--inkly-sev-correct); margin: 0 0 8px; }

  /* Actions: one compact row of icon+label tabs (no chunky buttons). */
  .inkly-ai__tabs { display: flex; gap: 3px; }
  .inkly-ai__tab {
    flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px;
    border: 0; background: none; color: var(--inkly-muted); cursor: pointer;
    font: 600 10px var(--inkly-font); padding: 7px 2px; border-radius: 8px;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .inkly-ai__tab-i { font-size: 15px; line-height: 1; }
  .inkly-ai__tab-l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .inkly-ai__tab:hover { background: var(--inkly-ghost-bg); color: var(--inkly-text); }
  .inkly-ai__tab--primary { color: var(--inkly-accent); }
  .inkly-ai__tab--primary:hover { color: var(--inkly-accent); }

  /* Footer actions — light + consistent with the tabs. Apply = accent; rest = text. */
  .inkly-ai__row { display: flex; align-items: center; gap: 4px; }
  .inkly-ai__btn {
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; justify-content: center;
    border: 1px solid var(--inkly-accent); background: var(--inkly-accent);
    color: var(--inkly-accent-contrast); border-radius: 8px;
    padding: 6px 14px; cursor: pointer; font: 600 12px var(--inkly-font);
    transition: background 0.12s ease, color 0.12s ease;
  }
  .inkly-ai__btn:hover { background: var(--inkly-accent-press); border-color: var(--inkly-accent-press); }
  .inkly-ai__btn--ghost {
    background: none; border: 0; color: var(--inkly-muted); padding: 6px 10px; border-radius: 7px;
  }
  .inkly-ai__btn--ghost:hover { background: var(--inkly-ghost-bg); color: var(--inkly-text); }

  /* Synonyms grouped by sense. */
  .inkly-ai__syn-group { margin-bottom: 7px; }
  .inkly-ai__syn-group:last-of-type { margin-bottom: 2px; }
  .inkly-ai__syn-sense {
    margin: 0 0 4px; font-size: 10.5px; font-weight: 600; color: var(--inkly-muted);
  }
  .inkly-ai__syn-group .inkly-ai__chips { margin: 0; }

  /* Chips: wrap onto multiple rows — never a horizontal scrollbar. */
  .inkly-ai__chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 2px 0 9px; }
  .inkly-ai__chip {
    white-space: nowrap;
    border: 1px solid var(--inkly-ghost-border); background: var(--inkly-ghost-bg);
    color: var(--inkly-ghost-text); border-radius: 999px;
    padding: 3px 11px; cursor: pointer; font: 600 11.5px var(--inkly-font);
  }
  .inkly-ai__chip:hover { border-color: var(--inkly-accent); color: var(--inkly-accent); }
  .inkly-ai__seg {
    display: block; margin: 2px 0 5px; font-size: 10.5px; font-weight: 700;
    letter-spacing: 0.04em; text-transform: uppercase; color: var(--inkly-muted);
  }
  .inkly-ai__select {
    width: 100%; margin-bottom: 10px; padding: 7px 9px; cursor: pointer;
    background: var(--inkly-ghost-bg); color: var(--inkly-text);
    border: 1px solid var(--inkly-ghost-border); border-radius: 8px;
    font: 500 12.5px var(--inkly-font); appearance: none;
  }
  .inkly-ai__select:focus-visible { outline: 2px solid var(--inkly-accent); outline-offset: 1px; }
  .inkly-ai__seg strong { color: var(--inkly-accent); text-transform: none; letter-spacing: 0; }
  .inkly-ai__range { width: 100%; margin: 0 0 2px; accent-color: var(--inkly-accent); cursor: pointer; }
  .inkly-ai__range-ends {
    display: flex; justify-content: space-between; margin-bottom: 9px;
    font-size: 10.5px; color: var(--inkly-muted);
  }
  .inkly-ai__mods { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .inkly-ai__mod {
    border: 1px solid var(--inkly-ghost-border); background: var(--inkly-ghost-bg);
    color: var(--inkly-muted); border-radius: 999px; padding: 4px 10px; cursor: pointer;
    font: 600 11.5px var(--inkly-font);
  }
  .inkly-ai__mod--on { background: var(--inkly-accent); border-color: var(--inkly-accent); color: var(--inkly-accent-contrast); }
</style>
