<script lang="ts">
  import { cardState } from './card-state.svelte';

  const COLORS: Record<string, string> = {
    correctness: '#e23b3b',
    clarity: '#d99100',
    suggestion: '#7b53d6',
  };

  function label(replacement: string): string {
    return replacement === '' ? 'Remove' : replacement;
  }
</script>

{#if cardState.visible && cardState.suggestion}
  <div
    class="inkly-card"
    role="dialog"
    style="left:{cardState.left}px; top:{cardState.top}px; border-left-color:{COLORS[cardState.severity]};"
    onmouseenter={() => (cardState.hovered = true)}
    onmouseleave={() => (cardState.hovered = false)}
  >
    <button class="inkly-card__dismiss" aria-label="Dismiss" onclick={() => cardState.onDismiss?.()}>×</button>
    {#if cardState.suggestion.message}
      <p class="inkly-card__msg">{cardState.suggestion.message}</p>
    {/if}
    <div class="inkly-card__reps">
      {#each cardState.suggestion.replacements as rep}
        <button class="inkly-card__rep" onclick={() => cardState.onApply?.(rep)}>{label(rep)}</button>
      {/each}
    </div>
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
  .inkly-card__msg { margin: 0 16px 8px 0; }
  .inkly-card__reps { display: flex; flex-wrap: wrap; gap: 6px; }
  .inkly-card__rep {
    border: 1px solid #cdcdcd; border-radius: 6px; background: #f6f6f6;
    padding: 3px 10px; cursor: pointer; font: inherit; font-weight: 600;
  }
  .inkly-card__rep:hover { background: #ececec; }
</style>
