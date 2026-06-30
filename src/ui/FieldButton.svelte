<script lang="ts">
  import { fieldButtonState as s } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';

  // A single round Inkly widget: the unified suggestion count, a spinner while the AI
  // verification tier is checking, and a click to open the review. Nothing else.
</script>

{#if s.visible}
  <div class="inkly-fb" style="left:{s.left}px; top:{s.top}px;">
    <button
      class="inkly-fb__btn"
      aria-label={`inkly${s.count > 0 ? `: ${s.count} suggestion${s.count === 1 ? '' : 's'}` : ''} — review`}
      title={s.improveLoading ? 'inkly — checking…' : 'inkly — review suggestions'}
      onclick={() => s.onOpen?.()}
    >
      <span class="inkly-fb__mark"><InklyMark size={15} /></span>
      {#if s.improveLoading}<span class="inkly-fb__ring" aria-hidden="true"></span>{/if}
      {#if s.count > 0}
        <span class="inkly-fb__badge" data-sev={s.severity}>{s.count}</span>
      {/if}
    </button>
  </div>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none; /* spacer; the button re-enables */
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
  .inkly-fb__btn:hover { border-color: var(--inkly-accent, #6366f1); transform: translateY(-1px); }
  .inkly-fb__mark { display: inline-flex; color: var(--inkly-accent, #6366f1); }
  .inkly-fb__ring {
    position: absolute;
    inset: -3px;
    border-radius: 999px;
    border: 2px solid transparent;
    border-top-color: var(--inkly-accent, #6366f1);
    animation: inkly-fb-spin 0.7s linear infinite;
  }
  @keyframes inkly-fb-spin { to { transform: rotate(360deg); } }
  .inkly-fb__badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: 999px;
    color: #fff;
    font: 700 9.5px/15px var(--inkly-font, system-ui, sans-serif);
    text-align: center;
    box-sizing: border-box;
    border: 1.5px solid var(--inkly-bg, #fff);
    background: var(--inkly-sev-correct, #e5484d);
  }
  .inkly-fb__badge[data-sev='clarity'] { background: var(--inkly-sev-clarity, #e0a30c); }
  .inkly-fb__badge[data-sev='suggestion'] { background: var(--inkly-accent, #6366f1); }

  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__btn { transition: none; }
    .inkly-fb__ring { animation-duration: 1.6s; }
  }
</style>
