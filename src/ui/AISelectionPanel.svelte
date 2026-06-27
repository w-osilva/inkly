<script lang="ts">
  import { aiPanelState } from './ai-panel-state.svelte';
  import { parseSynonyms } from '../core/ai/parse-synonyms';

  const LOADING_LABELS: Record<string, string> = {
    rewrite: 'Rewriting…',
    translate: 'Translating…',
    synonyms: 'Finding synonyms…',
    analyze: 'Analyzing…',
  };

  const TONES = [
    { id: '', label: 'Neutral' },
    { id: 'formal', label: 'Formal' },
    { id: 'casual', label: 'Casual' },
    { id: 'confident', label: 'Confident' },
    { id: 'friendly', label: 'Friendly' },
    { id: 'concise', label: 'Concise' },
  ];
  const LENGTHS = [
    { id: 'shorter', label: 'Shorter' },
    { id: 'asis', label: 'As is' },
    { id: 'longer', label: 'Longer' },
  ];

  // Actions reorder by selection kind: a single word leads with Synonyms; a phrase/
  // sentence leads with Rewrite. The primary (first) button is the accent-filled one.
  type Act = { cap: 'rewrite' | 'translate' | 'synonyms' | 'analyze'; label: string };
  const ACTIONS: Record<'word' | 'phrase', { primary: Act; rest: Act[] }> = {
    word: {
      primary: { cap: 'synonyms', label: '⇄ Synonyms' },
      rest: [
        { cap: 'translate', label: '🌐 Translate' },
        { cap: 'analyze', label: '🔍 Analyze' },
        { cap: 'rewrite', label: '✨ Rewrite sentence' },
      ],
    },
    phrase: {
      primary: { cap: 'rewrite', label: '✨ Rewrite' },
      rest: [
        { cap: 'translate', label: '🌐 Translate' },
        { cap: 'synonyms', label: '⇄ Synonyms' },
        { cap: 'analyze', label: '🔍 Analyze' },
      ],
    },
  };
</script>

{#if aiPanelState.phase !== 'hidden'}
  <div
    class="inkly-ai"
    role="group"
    aria-label="inkly AI"
    style="left:{aiPanelState.left}px; top:{aiPanelState.top}px;"
    onmouseenter={() => (aiPanelState.hovered = true)}
    onmouseleave={() => (aiPanelState.hovered = false)}
  >
    {#if aiPanelState.phase !== 'error'}
      <div class="inkly-ai__head" aria-hidden="true">
        <span class="inkly-ai__mark"></span>
        <span class="inkly-ai__brand">Inkly</span>
        <span class="inkly-ai__kbd">⌥I</span>
      </div>
    {/if}
    {#if aiPanelState.phase === 'actions'}
      {@const acts = ACTIONS[aiPanelState.selectionKind]}
      <div class="inkly-ai__actions">
        <button class="inkly-ai__btn" onclick={() => aiPanelState.onAction?.(acts.primary.cap)}>{acts.primary.label}</button>
        {#each acts.rest as a}
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onAction?.(a.cap)}>{a.label}</button>
        {/each}
      </div>
    {:else if aiPanelState.phase === 'loading'}
      {#if aiPanelState.streamingText}
        <p class="inkly-ai__result">{aiPanelState.streamingText}</p>
      {:else}
        <span class="inkly-ai__loading">{LOADING_LABELS[aiPanelState.capability] ?? 'Working…'}</span>
      {/if}
    {:else if aiPanelState.phase === 'result'}
      {#if aiPanelState.capability === 'synonyms'}
        <div class="inkly-ai__chips" role="group" aria-label="Synonyms">
          {#each parseSynonyms(aiPanelState.result) as syn}
            <button class="inkly-ai__chip" onclick={() => aiPanelState.onPickSynonym?.(syn)}>{syn}</button>
          {/each}
        </div>
        <div class="inkly-ai__row">
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {:else}
        <p class="inkly-ai__result">{aiPanelState.result}</p>
        {#if aiPanelState.capability === 'rewrite'}
          <div class="inkly-ai__chips" role="group" aria-label="Tone">
            {#each TONES as t}
              <button
                class="inkly-ai__chip"
                class:inkly-ai__chip--active={aiPanelState.tone === t.id}
                onclick={() => aiPanelState.onSetTone?.(t.id)}
              >{t.label}</button>
            {/each}
          </div>
          <div class="inkly-ai__chips" role="group" aria-label="Length">
            {#each LENGTHS as l}
              <button
                class="inkly-ai__chip"
                class:inkly-ai__chip--active={aiPanelState.length === l.id}
                onclick={() => aiPanelState.onSetLength?.(l.id)}
              >{l.label}</button>
            {/each}
          </div>
        {/if}
        <div class="inkly-ai__row">
          {#if aiPanelState.capability === 'rewrite' || aiPanelState.capability === 'translate'}
            <button class="inkly-ai__btn" onclick={() => aiPanelState.onApply?.()}>Apply</button>
          {/if}
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onCopy?.()}>Copy</button>
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {/if}
    {:else if aiPanelState.phase === 'error'}
      <p class="inkly-ai__error">AI error: {aiPanelState.error}</p>
      <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
    {/if}
  </div>
{/if}

<style>
  .inkly-ai {
    position: fixed; z-index: 2147483647; max-width: 320px;
    background: var(--inkly-bg); color: var(--inkly-text);
    border: 1px solid var(--inkly-border); border-radius: var(--inkly-radius);
    box-shadow: var(--inkly-shadow); padding: 12px 14px;
    font: 13px/1.45 var(--inkly-font); pointer-events: auto;
  }

  /* Header row: placeholder mark + brand label + hotkey hint. */
  .inkly-ai__head {
    display: flex; align-items: center; gap: 7px; margin-bottom: 10px;
  }
  .inkly-ai__mark {
    flex: none; width: 16px; height: 16px; border-radius: 5px;
    background: var(--inkly-accent);
  }
  .inkly-ai__brand {
    font-weight: 700; font-size: 13px; color: var(--inkly-text); letter-spacing: 0.01em;
  }
  .inkly-ai__kbd {
    margin-left: auto; font-size: 11px; color: var(--inkly-muted);
    border: 1px solid var(--inkly-border); border-radius: 5px; padding: 1px 5px;
  }

  .inkly-ai__result { margin: 0 0 10px; white-space: pre-wrap; color: var(--inkly-text); }
  .inkly-ai__row { display: flex; gap: 8px; }
  .inkly-ai__loading, .inkly-ai__error { display: block; }
  .inkly-ai__loading { color: var(--inkly-muted); }
  .inkly-ai__error { color: var(--inkly-sev-correct); margin: 0 0 8px; }

  /* Actions: fixed 2×2 grid, no wrapping. Rewrite spans the full top row. */
  .inkly-ai__actions {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .inkly-ai__btn {
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
    justify-content: flex-start;
    border: 1px solid var(--inkly-accent); background: var(--inkly-accent);
    color: var(--inkly-accent-contrast); border-radius: var(--inkly-radius-sm);
    padding: 9px 11px; cursor: pointer; font: inherit; font-weight: 600;
  }
  .inkly-ai__btn:hover { background: var(--inkly-accent-press); border-color: var(--inkly-accent-press); }
  .inkly-ai__actions .inkly-ai__btn { grid-column: 1 / -1; justify-content: center; }
  .inkly-ai__actions .inkly-ai__btn--ghost { grid-column: auto; }
  .inkly-ai__btn--ghost {
    background: var(--inkly-ghost-bg); color: var(--inkly-ghost-text);
    border: 1px solid var(--inkly-ghost-border);
  }
  .inkly-ai__btn--ghost:hover {
    background: var(--inkly-ghost-bg);
    border-color: var(--inkly-accent); color: var(--inkly-accent);
  }

  /* Chips: horizontal scroller so tone/length never wrap raggedly. */
  .inkly-ai__chips {
    display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; margin-bottom: 8px;
  }
  .inkly-ai__chip {
    flex: none; white-space: nowrap;
    border: 1px solid var(--inkly-ghost-border); background: var(--inkly-ghost-bg);
    color: var(--inkly-ghost-text); border-radius: 999px;
    padding: 3px 11px; cursor: pointer; font: inherit; font-size: 12px;
  }
  .inkly-ai__chip:hover { border-color: var(--inkly-accent); color: var(--inkly-accent); }
  .inkly-ai__chip--active {
    background: var(--inkly-accent); color: var(--inkly-accent-contrast);
    border-color: var(--inkly-accent);
  }
</style>
