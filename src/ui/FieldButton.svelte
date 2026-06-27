<script lang="ts">
  import { fieldButtonState } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';
</script>

{#if fieldButtonState.visible}
  <button
    class="inkly-fb"
    style="left:{fieldButtonState.left}px; top:{fieldButtonState.top}px;"
    aria-label="inkly: {fieldButtonState.count} suggestion{fieldButtonState.count === 1 ? '' : 's'}"
    onclick={() => fieldButtonState.onOpen?.()}
  >
    <span class="inkly-fb__mark" aria-hidden="true"><InklyMark size={15} /></span>
    {#if fieldButtonState.count > 0}
      <span class="inkly-fb__badge" data-sev={fieldButtonState.severity}>{fieldButtonState.count}</span>
    {/if}
  </button>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 999px;
    background: var(--inkly-bg, #fff);
    border: 1px solid var(--inkly-border, #e7e7f1);
    box-shadow: var(--inkly-shadow, 0 4px 14px rgba(15, 23, 41, 0.18));
    cursor: pointer;
    pointer-events: auto;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }
  .inkly-fb:hover {
    border-color: var(--inkly-accent, #6366f1);
    transform: translateY(-1px);
  }
  .inkly-fb__mark {
    display: inline-flex;
    color: var(--inkly-accent, #6366f1);
  }
  .inkly-fb__badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--inkly-sev-correct, #e5484d);
    color: #fff;
    font: 700 10px/16px var(--inkly-font, system-ui, sans-serif);
    text-align: center;
    box-sizing: border-box;
  }
  .inkly-fb__badge[data-sev='clarity'] { background: var(--inkly-sev-clarity, #e0a30c); }
  .inkly-fb__badge[data-sev='suggestion'] { background: var(--inkly-sev-suggest, #6366f1); }
  @media (prefers-reduced-motion: reduce) {
    .inkly-fb { transition: none; }
  }
</style>
