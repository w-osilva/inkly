<script lang="ts">
  import { fieldButtonState as s } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';

  // A single Inkly widget that expands into a pill of icon actions on hover/focus
  // (Grammarly-style), instead of crowding the input with several labelled buttons.
  // The main button opens the primary action; the pill holds Improve + Disable.

  // Badge prioritises real grammar errors, falling back to the improvement count.
  const badge = $derived(s.count > 0 ? s.count : s.improveCount);
  const badgeSev = $derived(s.count > 0 ? s.severity : 'suggestion');

  function primary() {
    if (s.count > 0) s.onOpen?.();
    else if (s.improveCount > 0) s.onOpenImprove?.();
    else s.onOpen?.();
  }
</script>

{#if s.visible}
  <div class="inkly-fb" style="right:{s.right}px; top:{s.top}px;">
    <!-- Main button (right): brand + count; opens the primary action. -->
    <button
      class="inkly-fb__btn"
      aria-label={`inkly${badge > 0 ? `: ${badge} item${badge === 1 ? '' : 's'}` : ''} — review`}
      title={s.improveLoading ? 'inkly — analyzing…' : 'inkly — review suggestions'}
      onclick={primary}
    >
      <span class="inkly-fb__mark"><InklyMark size={15} /></span>
      {#if s.improveLoading}<span class="inkly-fb__ring" aria-hidden="true"></span>{/if}
      {#if badge > 0}
        <span class="inkly-fb__badge" data-sev={badgeSev}>{badge}</span>
      {/if}
    </button>

    <!-- Pill (expands left on hover/focus): icon-only actions with tooltips. -->
    <div class="inkly-fb__acts">
      <button
        class="inkly-fb__act"
        data-act="improve"
        title={`Improve writing${s.improveCount > 0 ? ` (${s.improveCount})` : ''}`}
        aria-label={`Improve writing${s.improveCount > 0 ? ` (${s.improveCount})` : ''}`}
        onclick={() => s.onOpenImprove?.()}
      >✨</button>
      <button
        class="inkly-fb__act"
        data-act="disable"
        title="Disable on this site"
        aria-label="Disable on this site"
        onclick={() => s.onDisableSite?.()}
      >⦸</button>
    </div>
  </div>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    display: flex;
    flex-direction: row-reverse; /* main button at the right edge; pill grows leftwards */
    align-items: center;
    gap: 4px;
    pointer-events: none; /* spacer; the buttons re-enable */
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
  .inkly-fb:hover .inkly-fb__btn,
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

  /* Action pill — collapsed by default, revealed on hover/keyboard focus. */
  .inkly-fb__acts {
    display: flex;
    gap: 4px;
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: max-width 0.16s ease, opacity 0.16s ease;
  }
  .inkly-fb:hover .inkly-fb__acts,
  .inkly-fb:focus-within .inkly-fb__acts {
    max-width: 120px;
    opacity: 1;
    pointer-events: auto;
  }
  .inkly-fb__act {
    flex: none;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 999px;
    background: var(--inkly-bg, #fff);
    border: 1px solid var(--inkly-border, #e7e7f1);
    box-shadow: var(--inkly-shadow, 0 4px 14px rgba(15, 23, 41, 0.18));
    font-size: 13px;
    line-height: 1;
    color: var(--inkly-text, #1f2430);
    cursor: pointer;
    pointer-events: auto;
    transition: border-color 0.12s ease, transform 0.12s ease;
  }
  .inkly-fb__act:hover { border-color: var(--inkly-accent, #6366f1); transform: translateY(-1px); }
  .inkly-fb__act[data-act='disable'] { color: var(--inkly-muted, #6b7280); }

  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__btn, .inkly-fb__act { transition: none; }
    .inkly-fb__acts { transition: none; }
    .inkly-fb__ring { animation-duration: 1.6s; }
  }
</style>
