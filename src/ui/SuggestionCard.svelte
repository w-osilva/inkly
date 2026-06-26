<script lang="ts">
  import { cardState } from './card-state.svelte';
  import { t, categoryLabel } from '../core/i18n';
  import { ruleExplanation } from '../core/rule-descriptions';

  // Severity → stripe/dot color, sourced from design tokens so it tracks dark mode.
  const STRIPE: Record<string, string> = {
    correctness: 'var(--inkly-sev-correct)',
    clarity: 'var(--inkly-sev-clarity)',
    suggestion: 'var(--inkly-sev-suggest)',
  };
</script>

{#if cardState.visible && cardState.suggestion}
  <!-- Non-modal hover popover; role="group" (non-interactive) satisfies a11y without focus-trapping. -->
  <div
    class="inkly-card"
    role="group"
    aria-label="inkly suggestion"
    style="left:{cardState.left}px; top:{cardState.top}px; --stripe:{STRIPE[cardState.severity] ?? STRIPE.suggestion};"
    onmouseenter={() => (cardState.hovered = true)}
    onmouseleave={() => (cardState.hovered = false)}
  >
    <button class="inkly-card__dismiss" aria-label={t(cardState.lang, 'card.dismiss')} onclick={() => cardState.onDismiss?.()}>×</button>
    <p class="inkly-card__cat"><span class="inkly-card__dot" aria-hidden="true"></span>{categoryLabel(cardState.lang, cardState.suggestion.category)}</p>
    {#if cardState.suggestion}
      {@const explanation = ruleExplanation(cardState.lang, cardState.suggestion.ruleId, cardState.suggestion.message)}
      {#if explanation}
        <p class="inkly-card__msg">{explanation}</p>
      {/if}
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
    overflow: hidden;
    background: var(--inkly-bg);
    color: var(--inkly-text);
    border: 1px solid var(--inkly-border);
    border-radius: var(--inkly-radius);
    box-shadow: var(--inkly-shadow);
    padding: 12px 14px;
    font: 13px/1.45 var(--inkly-font);
    pointer-events: auto;
  }
  /* Left severity stripe (3px), color from the per-card --stripe var. */
  .inkly-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--stripe);
  }
  .inkly-card__dismiss {
    position: absolute; top: 6px; right: 8px;
    border: 0; background: none; cursor: pointer; font-size: 16px; line-height: 1;
    color: var(--inkly-muted);
  }
  .inkly-card__dismiss:hover { color: var(--inkly-text); }
  .inkly-card__cat {
    display: flex; align-items: center; gap: 6px;
    margin: 0 16px 5px 0; font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: var(--inkly-muted);
  }
  .inkly-card__dot {
    flex: none; width: 7px; height: 7px; border-radius: 50%;
    background: var(--stripe);
  }
  .inkly-card__msg { margin: 0 16px 9px 0; color: var(--inkly-text); }
  .inkly-card__reps { display: flex; flex-wrap: wrap; gap: 6px; }
  .inkly-card__rep {
    color: var(--inkly-accent);
    background: var(--inkly-accent-tint);
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 4px 10px; cursor: pointer; font: inherit; font-weight: 600;
  }
  .inkly-card__rep:hover {
    background: var(--inkly-accent);
    color: var(--inkly-accent-contrast);
  }
  .inkly-card__dict {
    display: block; width: 100%; margin-top: 10px; padding: 9px 0 0;
    border: 0; border-top: 1px solid var(--inkly-border); background: none;
    text-align: left; color: var(--inkly-accent); cursor: pointer;
    font: inherit; font-size: 12px; font-weight: 600;
  }
  .inkly-card__dict:hover { text-decoration: underline; }
</style>
