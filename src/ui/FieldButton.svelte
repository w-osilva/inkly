<script lang="ts">
  import { fieldButtonState as s } from './field-button-state.svelte';
  import InklyMark from './InklyMark.svelte';

  // A single Inkly widget. Clicking opens a small menu that groups the actions —
  // grammar suggestions, AI improvements, and "disable on this site" — instead of
  // crowding the input with several floating buttons + badges.
  let open = $state(false);
  let btnEl = $state<HTMLElement>();
  let menuEl = $state<HTMLElement>();

  // Badge prioritises real grammar errors; falls back to the improvement count so a
  // suggestion-only field still shows something. Severity drives the colour.
  const badge = $derived(s.count > 0 ? s.count : s.improveCount);
  const badgeSev = $derived(s.count > 0 ? s.severity : 'suggestion');

  function close() { open = false; }
  function pick(run: (() => void) | null) { open = false; run?.(); }

  // Close on outside click, and whenever the widget hides.
  $effect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      // We live in a shadow root: a document-level listener sees the retargeted host as
      // e.target, so contains() fails. Use composedPath(), which includes our inner nodes.
      const path = e.composedPath();
      if ((!btnEl || !path.includes(btnEl)) && (!menuEl || !path.includes(menuEl))) open = false;
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  });
  $effect(() => { if (!s.visible) open = false; });
</script>

{#if s.visible}
  <div class="inkly-fb" style="left:{s.left}px; top:{s.top}px;">
    <button
      bind:this={btnEl}
      class="inkly-fb__btn"
      class:inkly-fb__btn--open={open}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`inkly${badge > 0 ? `: ${badge} item${badge === 1 ? '' : 's'}` : ''}`}
      title={s.improveLoading ? 'Analyzing…' : 'inkly'}
      onclick={() => (open = !open)}
    >
      <span class="inkly-fb__mark"><InklyMark size={15} /></span>
      {#if s.improveLoading}<span class="inkly-fb__ring" aria-hidden="true"></span>{/if}
      {#if badge > 0}
        <span class="inkly-fb__badge" data-sev={badgeSev}>{badge}</span>
      {/if}
    </button>

    {#if open}
      <div bind:this={menuEl} class="inkly-fb__menu" role="menu">
        {#if s.count > 0}
          <button class="inkly-fb__item" role="menuitem" data-act="grammar" onclick={() => pick(s.onOpen)}>
            <span class="inkly-fb__swatch" data-sev={s.severity} aria-hidden="true"></span>
            <span>{s.count} suggestion{s.count === 1 ? '' : 's'}</span>
          </button>
        {/if}
        <button class="inkly-fb__item" role="menuitem" data-act="improve" onclick={() => pick(s.onOpenImprove)}>
          <span class="inkly-fb__sparkle" aria-hidden="true">✨</span>
          <span>Improve writing{s.improveCount > 0 ? ` (${s.improveCount})` : ''}</span>
        </button>
        <div class="inkly-fb__sep"></div>
        <button class="inkly-fb__item inkly-fb__item--muted" role="menuitem" data-act="disable" onclick={() => pick(s.onDisableSite)}>
          <span class="inkly-fb__off" aria-hidden="true">⦸</span>
          <span>Disable on this site</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .inkly-fb {
    position: fixed;
    z-index: 2147483647;
    pointer-events: none; /* spacer; the button/menu re-enable */
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
  .inkly-fb__btn:hover,
  .inkly-fb__btn--open {
    border-color: var(--inkly-accent, #6366f1);
    transform: translateY(-1px);
  }
  .inkly-fb__mark { display: inline-flex; color: var(--inkly-accent, #6366f1); }
  /* Busy ring around the mark while an AI improvement pass runs. */
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

  /* Mini-menu opens above the widget, right-aligned. */
  .inkly-fb__menu {
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    pointer-events: auto;
    min-width: 176px;
    padding: 4px;
    border-radius: 10px;
    background: var(--inkly-bg, #fff);
    border: 1px solid var(--inkly-border, #e7e7f1);
    box-shadow: var(--inkly-shadow, 0 8px 24px rgba(15, 23, 41, 0.22));
  }
  .inkly-fb__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 9px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--inkly-text, #1f2430);
    font: 500 12.5px/1 var(--inkly-font, system-ui, sans-serif);
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
  }
  .inkly-fb__item:hover { background: var(--inkly-hover, #f3f3fb); }
  .inkly-fb__item--muted { color: var(--inkly-muted, #6b7280); }
  .inkly-fb__swatch {
    width: 9px; height: 9px; border-radius: 999px; flex: none;
    background: var(--inkly-sev-correct, #e5484d);
  }
  .inkly-fb__swatch[data-sev='clarity'] { background: var(--inkly-sev-clarity, #e0a30c); }
  .inkly-fb__swatch[data-sev='suggestion'] { background: var(--inkly-accent, #6366f1); }
  .inkly-fb__sparkle, .inkly-fb__off { font-size: 12px; line-height: 1; flex: none; width: 9px; text-align: center; }
  .inkly-fb__sep { height: 1px; margin: 4px 6px; background: var(--inkly-border, #e7e7f1); }

  @media (prefers-reduced-motion: reduce) {
    .inkly-fb__btn { transition: none; }
    .inkly-fb__ring { animation-duration: 1.6s; }
  }
</style>
