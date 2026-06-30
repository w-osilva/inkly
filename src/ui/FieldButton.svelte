<script lang="ts">
  import { fieldButtonState as s } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';

  // A single Inkly widget: at rest a round badge, on hover/focus the SAME capsule stretches
  // to reveal icon actions inside it (one shared pill, not separate floating circles).
  // The main segment opens the primary action; the pill holds Improve + Disable.

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
    <div class="inkly-fb__pill">
      <!-- Main segment (right): brand + count; opens the primary action. -->
      <button
        class="inkly-fb__seg inkly-fb__main"
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

      <!-- Icon actions, revealed inside the same capsule on hover/focus. Disable sits at the
           far (left) end, set apart from the primary actions, so it's never a mis-click. -->
      <div class="inkly-fb__acts">
        <button
          class="inkly-fb__seg inkly-fb__seg--muted inkly-fb__seg--end"
          data-act="disable"
          title="Disable on this site"
          aria-label="Disable on this site"
          onclick={() => s.onDisableSite?.()}
        >⦸</button>
        <button
          class="inkly-fb__seg"
          data-act="improve"
          title={`Improve writing${s.improveCount > 0 ? ` (${s.improveCount})` : ''}`}
          aria-label={`Improve writing${s.improveCount > 0 ? ` (${s.improveCount})` : ''}`}
          onclick={() => s.onOpenImprove?.()}
        >✨</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none; /* spacer; the pill re-enables */
  }
  /* One capsule: shared background, border, radius and shadow. */
  .inkly-fb__pill {
    display: flex;
    flex-direction: row-reverse; /* main segment at the right; actions grow leftwards */
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

  /* Borderless segments inside the pill. */
  .inkly-fb__seg {
    position: relative;
    flex: none;
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    font-size: 13px;
    line-height: 1;
    color: var(--inkly-text, #1f2430);
    cursor: pointer;
  }
  .inkly-fb__seg:hover { background: var(--inkly-hover, #f3f3fb); }
  .inkly-fb__seg--muted { color: var(--inkly-muted, #6b7280); }
  /* Set the disable action apart from the primary ones with a little extra space. */
  .inkly-fb__seg--end { margin-right: 4px; }
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

  /* Action group collapses to nothing until the pill is hovered/focused. */
  .inkly-fb__acts {
    display: flex;
    gap: 1px;
    max-width: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: max-width 0.16s ease, opacity 0.16s ease;
  }
  .inkly-fb__pill:hover .inkly-fb__acts,
  .inkly-fb__pill:focus-within .inkly-fb__acts {
    max-width: 80px;
    opacity: 1;
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__acts { transition: none; }
    .inkly-fb__ring { animation-duration: 1.6s; }
  }
</style>
