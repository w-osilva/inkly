<script lang="ts">
  import { fieldButtonState as s } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';

  // A single Inkly capsule: the unified suggestion count + review (main button), and an
  // on-demand ✨ Improve that reveals on hover/focus and asks the AI to check the sentence.
</script>

{#if s.visible}
  <div class="inkly-fb" style="right:{s.right}px; top:{s.top}px;">
    <div class="inkly-fb__pill">
      <!-- Main: brand + count; opens the review (or "all clear"). Spinner while AI runs. -->
      <button
        class="inkly-fb__seg inkly-fb__main"
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

      <!-- On-demand AI Improve — revealed on hover/focus. -->
      {#if s.onImprove}
        <button
          class="inkly-fb__seg inkly-fb__collapse"
          data-act="improve"
          title="Improve with AI"
          aria-label="Improve with AI"
          onclick={() => s.onImprove?.()}
        >✨</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none; /* spacer; the pill re-enables */
  }
  .inkly-fb__pill {
    display: flex;
    flex-direction: row-reverse; /* main at the right; ✨ grows leftwards */
    align-items: center;
    gap: 1px;
    padding: 2px;
    border-radius: 999px;
    background: var(--inkly-bg, #fff);
    border: 1px solid var(--inkly-border, #e7e7f1);
    box-shadow: var(--inkly-shadow, 0 4px 14px rgba(15, 23, 41, 0.18));
    pointer-events: auto;
    transition: border-color 0.12s ease;
  }
  .inkly-fb__pill:hover,
  .inkly-fb__pill:focus-within { border-color: var(--inkly-accent, #6366f1); }

  .inkly-fb__seg {
    position: relative;
    flex: none;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font-size: 12px;
    line-height: 1;
    color: var(--inkly-text, #1f2430);
    cursor: pointer;
  }
  .inkly-fb__seg:hover { background: var(--inkly-hover, #f3f3fb); }
  .inkly-fb__mark { display: inline-flex; color: var(--inkly-accent, #6366f1); }
  .inkly-fb__ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    border: 2px solid transparent;
    border-top-color: var(--inkly-accent, #6366f1);
    animation: inkly-fb-spin 0.7s linear infinite;
  }
  @keyframes inkly-fb-spin { to { transform: rotate(360deg); } }
  .inkly-fb__badge {
    position: absolute;
    top: -6px;
    right: -6px;
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

  /* ✨ collapses until the pill is hovered/focused. */
  .inkly-fb__collapse {
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-width 0.16s ease 0.45s, opacity 0.16s ease 0.45s;
  }
  .inkly-fb__pill:hover .inkly-fb__collapse,
  .inkly-fb__pill:focus-within .inkly-fb__collapse {
    max-width: 22px;
    opacity: 1;
    transition: max-width 0.16s ease, opacity 0.16s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__collapse { transition: none; }
    .inkly-fb__ring { animation-duration: 1.6s; }
  }
</style>
