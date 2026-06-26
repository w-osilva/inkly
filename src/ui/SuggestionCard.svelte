<script lang="ts">
  import { cardState } from './card-state.svelte';
  import { t, categoryLabel } from '../core/i18n';

  const COLORS: Record<string, string> = {
    correctness: '#e23b3b',
    clarity: '#d99100',
    suggestion: '#7b53d6',
  };
</script>

{#if cardState.visible && cardState.suggestion}
  <!-- Non-modal hover popover; role="group" (non-interactive) satisfies a11y without focus-trapping. -->
  <div
    class="inkly-card"
    role="group"
    aria-label="inkly suggestion"
    style="left:{cardState.left}px; top:{cardState.top}px; border-left-color:{COLORS[cardState.severity]};"
    onmouseenter={() => (cardState.hovered = true)}
    onmouseleave={() => (cardState.hovered = false)}
  >
    <button class="inkly-card__dismiss" aria-label={t(cardState.lang, 'card.dismiss')} onclick={() => cardState.onDismiss?.()}>×</button>
    <p class="inkly-card__cat">{categoryLabel(cardState.lang, cardState.suggestion.category)}</p>
    {#if cardState.suggestion.message}
      <p class="inkly-card__msg">{cardState.suggestion.message}</p>
    {/if}
    <div class="inkly-card__reps">
      {#each cardState.suggestion.replacements as rep}
        <button class="inkly-card__rep" onclick={() => cardState.onApply?.(rep)}>{rep === '' ? t(cardState.lang, 'card.removeReplacement') : rep}</button>
      {/each}
    </div>
    {#if cardState.dictionaryWord}
      <button class="inkly-card__dict" onclick={() => cardState.onAddToDictionary?.()}>
        {t(cardState.lang, 'card.addToDictionary', { word: cardState.dictionaryWord })}
      </button>
    {/if}
  </div>
{/if}

<style>
  .inkly-card {
    position: fixed;
    z-index: 2147483647;
    max-width: 300px;
    background: #fff;
    color: #1a1a1a;
    border: 1px solid #e0e0e0;
    border-left-width: 4px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
    padding: 10px 12px;
    font: 13px/1.4 -apple-system, system-ui, sans-serif;
    pointer-events: auto;
  }
  .inkly-card__dismiss {
    position: absolute; top: 4px; right: 6px;
    border: 0; background: none; cursor: pointer; font-size: 16px; line-height: 1; color: #999;
  }
  .inkly-card__cat {
    margin: 0 16px 4px 0; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.04em; color: #888;
  }
  .inkly-card__msg { margin: 0 16px 8px 0; }
  .inkly-card__reps { display: flex; flex-wrap: wrap; gap: 6px; }
  .inkly-card__rep {
    border: 1px solid #cdcdcd; border-radius: 6px; background: #f6f6f6;
    padding: 3px 10px; cursor: pointer; font: inherit; font-weight: 600;
  }
  .inkly-card__rep:hover { background: #ececec; }
  .inkly-card__dict {
    display: block; margin-top: 8px; border: 0; background: none; padding: 0;
    color: #2d6cdf; cursor: pointer; font: inherit; font-size: 12px;
  }
  .inkly-card__dict:hover { text-decoration: underline; }
</style>
