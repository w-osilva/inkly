<script lang="ts">
  import { fieldButtonState } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';
</script>

{#if fieldButtonState.visible}
  <div class="inkly-fb" style="left:{fieldButtonState.left}px; top:{fieldButtonState.top}px;">
    <!-- AI writing improvements (separate from grammar). -->
    <button
      class="inkly-fb__btn inkly-fb__btn--improve"
      aria-label="inkly: improve writing{fieldButtonState.improveCount > 0 ? ` (${fieldButtonState.improveCount})` : ''}"
      title={fieldButtonState.improveLoading ? 'Analyzing…' : 'Improve writing'}
      onclick={() => fieldButtonState.onOpenImprove?.()}
    >
      {#if fieldButtonState.improveLoading}
        <span class="inkly-fb__spinner" aria-hidden="true"></span>
      {:else}
        <span class="inkly-fb__icon" aria-hidden="true">✨</span>
      {/if}
      {#if fieldButtonState.improveCount > 0}
        <span class="inkly-fb__badge inkly-fb__badge--imp">{fieldButtonState.improveCount}</span>
      {/if}
    </button>

    <!-- Grammar / spelling (Harper). -->
    <button
      class="inkly-fb__btn inkly-fb__btn--grammar"
      aria-label="inkly: {fieldButtonState.count} suggestion{fieldButtonState.count === 1 ? '' : 's'}"
      title="Review suggestions"
      onclick={() => fieldButtonState.onOpen?.()}
    >
      <span class="inkly-fb__mark" aria-hidden="true"><InklyMark size={15} /></span>
      {#if fieldButtonState.count > 0}
        <span class="inkly-fb__badge inkly-fb__badge--err" data-sev={fieldButtonState.severity}>{fieldButtonState.count}</span>
      {/if}
    </button>
  </div>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    display: flex;
    gap: 4px;
    pointer-events: none; /* the group spacer; buttons re-enable */
  }
  .inkly-fb__btn {
    position: relative;
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
  .inkly-fb__btn:hover {
    border-color: var(--inkly-accent, #6366f1);
    transform: translateY(-1px);
  }
  .inkly-fb__mark { display: inline-flex; color: var(--inkly-accent, #6366f1); }
  .inkly-fb__icon { font-size: 14px; line-height: 1; }
  /* Spinner shown on the ✨ button while an AI improvement pass is running. */
  .inkly-fb__spinner {
    width: 14px; height: 14px; border-radius: 999px;
    border: 2px solid var(--inkly-border, #e7e7f1);
    border-top-color: var(--inkly-accent, #6366f1);
    animation: inkly-fb-spin 0.7s linear infinite;
  }
  @keyframes inkly-fb-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__spinner { animation-duration: 1.6s; }
  }
  .inkly-fb__badge {
    position: absolute;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: 999px;
    color: #fff;
    font: 700 9.5px/15px var(--inkly-font, system-ui, sans-serif);
    text-align: center;
    box-sizing: border-box;
    border: 1.5px solid var(--inkly-bg, #fff);
  }
  /* Grammar/spelling count — top-right, severity-colored. */
  .inkly-fb__badge--err { top: -5px; right: -5px; background: var(--inkly-sev-correct, #e5484d); }
  .inkly-fb__badge--err[data-sev='clarity'] { background: var(--inkly-sev-clarity, #e0a30c); }
  .inkly-fb__badge--err[data-sev='suggestion'] { background: var(--inkly-sev-suggest, #6366f1); }
  /* AI improvements count — top-right of the ✨ button, indigo. */
  .inkly-fb__badge--imp { top: -5px; right: -5px; background: var(--inkly-accent, #6366f1); }
  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__btn { transition: none; }
  }
</style>
