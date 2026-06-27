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
    { id: 'professional', label: 'Professional' },
    { id: 'technical', label: 'Technical' },
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
        { cap: 'rewrite', label: '✨ Rewrite' },
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
        <div class="inkly-ai__subactions">
          <button class="inkly-ai__mini" onclick={() => aiPanelState.onAction?.('translate')}>🌐 Translate</button>
          <button class="inkly-ai__mini" onclick={() => aiPanelState.onAction?.('analyze')}>🔍 Analyze</button>
          <button class="inkly-ai__mini" onclick={() => aiPanelState.onAction?.('rewrite')}>✨ Rewrite sentence</button>
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
    position: fixed; z-index: 2147483647; width: 240px; max-width: calc(100vw - 24px);
    background: var(--inkly-bg); color: var(--inkly-text);
    border: 1px solid var(--inkly-border); border-radius: 10px;
    box-shadow: var(--inkly-shadow); padding: 8px;
    font: 12.5px/1.4 var(--inkly-font); pointer-events: auto;
  }

  /* Header row: mark + brand label + hotkey hint. */
  .inkly-ai__head {
    display: flex; align-items: center; gap: 6px; margin: 1px 2px 7px;
  }
  .inkly-ai__mark {
    flex: none; width: 13px; height: 13px; border-radius: 4px;
    background: var(--inkly-accent);
  }
  .inkly-ai__brand {
    font-weight: 700; font-size: 11.5px; color: var(--inkly-muted); letter-spacing: 0.02em;
  }
  .inkly-ai__kbd {
    margin-left: auto; font-size: 10px; color: var(--inkly-muted);
    border: 1px solid var(--inkly-border); border-radius: 4px; padding: 0 4px;
  }

  .inkly-ai__result { margin: 2px; white-space: pre-wrap; color: var(--inkly-text); }
  .inkly-ai__row { display: flex; gap: 6px; }
  .inkly-ai__loading, .inkly-ai__error { display: block; padding: 2px; }
  .inkly-ai__loading { color: var(--inkly-muted); }
  .inkly-ai__error { color: var(--inkly-sev-correct); margin: 0 0 8px; }

  /* Actions: tidy 2×2 grid of equal, compact buttons. */
  .inkly-ai__actions {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  }
  .inkly-ai__btn {
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
    justify-content: center;
    border: 1px solid var(--inkly-accent); background: var(--inkly-accent);
    color: var(--inkly-accent-contrast); border-radius: 8px;
    padding: 7px 8px; cursor: pointer; font: inherit; font-weight: 600;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }
  .inkly-ai__btn:hover { background: var(--inkly-accent-press); border-color: var(--inkly-accent-press); }
  .inkly-ai__btn--ghost {
    background: var(--inkly-ghost-bg); color: var(--inkly-ghost-text);
    border: 1px solid var(--inkly-ghost-border);
  }
  .inkly-ai__btn--ghost:hover {
    background: var(--inkly-ghost-bg);
    border-color: var(--inkly-accent); color: var(--inkly-accent);
  }
  /* In the result footer the buttons sit in a flex row, not the grid. */
  .inkly-ai__row .inkly-ai__btn { flex: 1; }

  /* Chips: horizontal scroller so tone/length never wrap raggedly. */
  .inkly-ai__chips {
    display: flex; gap: 5px; overflow-x: auto; padding-bottom: 2px; margin: 2px 0 8px;
  }
  .inkly-ai__chip {
    flex: none; white-space: nowrap;
    border: 1px solid var(--inkly-ghost-border); background: var(--inkly-ghost-bg);
    color: var(--inkly-ghost-text); border-radius: 999px;
    padding: 3px 10px; cursor: pointer; font: inherit; font-size: 11.5px;
  }
  .inkly-ai__chip:hover { border-color: var(--inkly-accent); color: var(--inkly-accent); }
  .inkly-ai__chip--active {
    background: var(--inkly-accent); color: var(--inkly-accent-contrast);
    border-color: var(--inkly-accent);
  }
  .inkly-ai__subactions { display: flex; flex-wrap: wrap; gap: 5px; margin: 2px 0 8px; }
  .inkly-ai__mini {
    border: 1px solid var(--inkly-ghost-border); background: var(--inkly-ghost-bg);
    color: var(--inkly-ghost-text); border-radius: 7px;
    padding: 4px 8px; cursor: pointer; font: 600 11.5px var(--inkly-font); white-space: nowrap;
  }
  .inkly-ai__mini:hover { border-color: var(--inkly-accent); color: var(--inkly-accent); }
</style>
