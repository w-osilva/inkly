<script lang="ts">
  import { reviewState } from './review-state.svelte';
</script>

{#if reviewState.visible}
  <div class="inkly-rv" role="group" aria-label="inkly review suggestions"
    style="left:{reviewState.left}px; top:{reviewState.top}px;">
    <div class="inkly-rv__head">
      <span class="inkly-rv__mark" aria-hidden="true"></span>
      <b>Review suggestions</b>
      <span class="inkly-rv__count">{reviewState.total}</span>
      <button class="inkly-rv__x" aria-label="Close" onclick={() => reviewState.onClose?.()}>×</button>
    </div>

    <p class="inkly-rv__cat">{reviewState.category}{reviewState.title ? ` · ${reviewState.title}` : ''}</p>

    <p class="inkly-rv__preview">
      <span class="inkly-rv__ctx">{reviewState.before}</span>{#if reviewState.oldText}<del>{reviewState.oldText}</del>{/if}{#if reviewState.replacement}<strong>{reviewState.replacement}</strong>{/if}<span class="inkly-rv__ctx">{reviewState.after}</span>
    </p>

    {#if reviewState.replacements.length > 1}
      <div class="inkly-rv__choices" role="group" aria-label="Replacement options">
        {#each reviewState.replacements as rep}
          <button class="inkly-rv__choice" onclick={() => reviewState.onPick?.(rep)}>{rep === '' ? '(remove)' : rep}</button>
        {/each}
      </div>
    {/if}

    <div class="inkly-rv__foot">
      {#if reviewState.canAccept && reviewState.replacements.length <= 1}
        <button class="inkly-rv__accept" onclick={() => reviewState.onAccept?.()}>Accept</button>
      {/if}
      <button class="inkly-rv__dismiss" onclick={() => reviewState.onDismiss?.()}>Dismiss</button>
      <span class="inkly-rv__nav">
        <button class="inkly-rv__arrow" aria-label="Previous" onclick={() => reviewState.onPrev?.()}>‹</button>
        <span class="inkly-rv__pos">{reviewState.index}/{reviewState.total}</span>
        <button class="inkly-rv__arrow" aria-label="Next" onclick={() => reviewState.onNext?.()}>›</button>
      </span>
    </div>
  </div>
{/if}

<style>
  .inkly-rv {
    position: fixed;
    z-index: 2147483647;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: var(--inkly-bg, #fff);
    color: var(--inkly-text, #15172b);
    border: 1px solid var(--inkly-border, #e7e7f1);
    border-radius: var(--inkly-radius, 12px);
    box-shadow: var(--inkly-shadow, 0 12px 38px rgba(15, 23, 41, 0.18));
    padding: 14px;
    font: 13px/1.45 var(--inkly-font, system-ui, sans-serif);
    pointer-events: auto;
  }
  .inkly-rv__head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .inkly-rv__head b { font-size: 14px; letter-spacing: -0.01em; }
  .inkly-rv__mark { width: 16px; height: 16px; border-radius: 5px; background: var(--inkly-accent, #6366f1); flex: none; }
  .inkly-rv__count {
    min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
    background: var(--inkly-ghost-bg, #f3f4fb); color: var(--inkly-muted, #6a6c84);
    font: 700 11px/18px var(--inkly-font, system-ui, sans-serif); text-align: center;
  }
  .inkly-rv__x {
    margin-left: auto; border: 0; background: none; cursor: pointer;
    color: var(--inkly-muted, #6a6c84); font-size: 18px; line-height: 1; padding: 0;
  }
  .inkly-rv__x:hover { color: var(--inkly-text, #15172b); }
  .inkly-rv__cat {
    margin: 0 0 8px; font-size: 11.5px; font-weight: 600; color: var(--inkly-muted, #6a6c84);
  }
  .inkly-rv__preview {
    margin: 0 0 14px; font-size: 14px; line-height: 1.5; word-break: break-word;
  }
  .inkly-rv__ctx { color: var(--inkly-muted, #6a6c84); }
  .inkly-rv__preview del { color: var(--inkly-sev-correct, #e5484d); text-decoration: line-through; }
  .inkly-rv__preview strong { color: var(--inkly-text, #15172b); font-weight: 700; }
  .inkly-rv__choices { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
  .inkly-rv__choice {
    border: 1px solid transparent; border-radius: 7px;
    background: var(--inkly-accent-tint); color: var(--inkly-accent);
    padding: 5px 12px; cursor: pointer; font: 600 13px var(--inkly-font, system-ui, sans-serif);
  }
  .inkly-rv__choice:hover { background: var(--inkly-accent); color: var(--inkly-accent-contrast); }
  .inkly-rv__foot { display: flex; align-items: center; gap: 8px; }
  .inkly-rv__accept {
    border: 1px solid var(--inkly-accent, #6366f1); background: var(--inkly-accent, #6366f1);
    color: var(--inkly-accent-contrast, #fff); border-radius: var(--inkly-radius-sm, 8px);
    padding: 7px 16px; cursor: pointer; font: 600 13px var(--inkly-font, system-ui, sans-serif);
  }
  .inkly-rv__accept:hover { background: var(--inkly-accent-press, #4f46e5); }
  .inkly-rv__dismiss {
    border: 0; background: none; cursor: pointer; color: var(--inkly-muted, #6a6c84);
    font: 600 13px var(--inkly-font, system-ui, sans-serif); padding: 7px 4px;
  }
  .inkly-rv__dismiss:hover { color: var(--inkly-text, #15172b); }
  .inkly-rv__nav { display: flex; align-items: center; gap: 4px; margin-left: auto; }
  .inkly-rv__pos { font-size: 11.5px; color: var(--inkly-muted, #6a6c84); font-variant-numeric: tabular-nums; }
  .inkly-rv__arrow {
    border: 0; background: none; cursor: pointer; color: var(--inkly-muted, #6a6c84);
    font-size: 18px; line-height: 1; padding: 0 4px; border-radius: 5px;
  }
  .inkly-rv__arrow:hover { color: var(--inkly-accent, #6366f1); }
</style>
