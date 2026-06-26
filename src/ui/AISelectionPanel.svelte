<script lang="ts">
  import { aiPanelState } from './ai-panel-state.svelte';

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
    {#if aiPanelState.phase === 'actions'}
      <button class="inkly-ai__btn" onclick={() => aiPanelState.onAction?.('rewrite')}>✨ Rewrite</button>
      <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onAction?.('translate')}>🌐 Translate</button>
      <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onAction?.('synonyms')}>🔁 Synonyms</button>
      <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onAction?.('analyze')}>🔍 Analyze</button>
    {:else if aiPanelState.phase === 'loading'}
      <span class="inkly-ai__loading">{aiPanelState.capability === 'translate' ? 'Translating…' : 'Rewriting…'}</span>
    {:else if aiPanelState.phase === 'result'}
      {#if aiPanelState.capability === 'synonyms'}
        <div class="inkly-ai__chips" role="group" aria-label="Synonyms">
          {#each aiPanelState.result.split(',').map((s) => s.trim()).filter(Boolean) as syn}
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
    background: #fff; color: #1a1a1a; border: 1px solid #e0e0e0; border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.16); padding: 8px 10px;
    font: 13px/1.4 -apple-system, system-ui, sans-serif; pointer-events: auto;
  }
  .inkly-ai__result { margin: 0 0 8px; white-space: pre-wrap; }
  .inkly-ai__row { display: flex; gap: 6px; }
  .inkly-ai__loading, .inkly-ai__error { display: block; }
  .inkly-ai__error { color: #c0392b; margin: 0 0 8px; }
  .inkly-ai__btn {
    border: 1px solid #7b53d6; background: #7b53d6; color: #fff; border-radius: 6px;
    padding: 4px 12px; cursor: pointer; font: inherit; font-weight: 600;
  }
  .inkly-ai__btn--ghost { background: #f6f6f6; color: #333; border-color: #cdcdcd; }
  .inkly-ai__btn:hover { filter: brightness(0.96); }
  .inkly-ai__chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .inkly-ai__chip {
    border: 1px solid #cdcdcd; background: #f6f6f6; color: #333; border-radius: 12px;
    padding: 2px 10px; cursor: pointer; font: inherit; font-size: 12px;
  }
  .inkly-ai__chip--active { background: #7b53d6; color: #fff; border-color: #7b53d6; }
</style>
