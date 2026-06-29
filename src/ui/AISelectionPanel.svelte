<script lang="ts">
  import { aiPanelState } from './ai-panel-state.svelte';
  import { parseSynonymGroups } from '../core/ai/parse-synonyms';
  import InklyMark from './InklyMark.svelte';

  const LOADING_LABELS: Record<string, string> = {
    rewrite: 'Rewriting…',
    translate: 'Translating…',
    synonyms: 'Finding synonyms…',
    improve: 'Checking…',
  };

  const TONES = [
    { id: '', label: 'Neutral' },
    { id: 'formal', label: 'Formal' },
    { id: 'casual', label: 'Casual' },
    { id: 'confident', label: 'Confident' },
    { id: 'friendly', label: 'Friendly' },
    { id: 'professional', label: 'Professional' },
    { id: 'technical', label: 'Technical' },
    { id: 'concise', label: 'Concise' },
  ];
  const LENGTHS = [
    { id: 'shorter', label: 'Shorter' },
    { id: 'asis', label: 'As is' },
    { id: 'longer', label: 'Longer' },
  ];

  // Actions reorder by selection kind: a single word leads with Synonyms; a phrase/
  // sentence leads with Rewrite. The primary (first) button is the accent-filled one.
  type Act = { cap: 'rewrite' | 'translate' | 'synonyms' | 'improve'; icon: string; label: string };
  const TRANSLATE: Act = { cap: 'translate', icon: '🌐', label: 'Translate' };
  const SYNONYMS: Act = { cap: 'synonyms', icon: '⇄', label: 'Synonyms' };
  const IMPROVE: Act = { cap: 'improve', icon: '✨', label: 'Improve' };
  const REWRITE: Act = { cap: 'rewrite', icon: '✦', label: 'Rewrite' };
  // Tab order leads with the most relevant action for the selection kind.
  const ACTIONS: Record<'word' | 'phrase', Act[]> = {
    word: [SYNONYMS, TRANSLATE, IMPROVE, REWRITE],
    phrase: [REWRITE, IMPROVE, TRANSLATE, SYNONYMS],
  };
</script>

{#if aiPanelState.phase !== 'hidden'}
  <div
    class="inkly-ai"
    role="group"
    aria-label="inkly AI"
    style="left:{aiPanelState.left}px; top:{aiPanelState.top}px;"
    onmouseenter={() => (aiPanelState.hovered = true)}
    onmouseleave={() => (aiPanelState.hovered = false)}
  >
    {#if aiPanelState.phase !== 'error'}
      <div class="inkly-ai__head">
        <span class="inkly-ai__mark" aria-hidden="true"><InklyMark size={15} /></span>
        <span class="inkly-ai__brand">Inkly</span>
        <button class="inkly-ai__x inkly-ai__x--head" aria-label="Close" onclick={() => aiPanelState.onClose?.()}>×</button>
      </div>
    {/if}
    {#if aiPanelState.phase === 'actions'}
      <div class="inkly-ai__tabs">
        {#each ACTIONS[aiPanelState.selectionKind] as a, i}
          <button
            class="inkly-ai__tab"
            class:inkly-ai__tab--primary={i === 0}
            onclick={() => (a.cap === 'rewrite' ? (aiPanelState.phase = 'rewrite-config') : aiPanelState.onAction?.(a.cap))}
          >
            <span class="inkly-ai__tab-i" aria-hidden="true">{a.icon}</span>
            <span class="inkly-ai__tab-l">{a.label}</span>
          </button>
        {/each}
      </div>
    {:else if aiPanelState.phase === 'rewrite-config'}
      <p class="inkly-ai__seg">Tone</p>
      <div class="inkly-ai__chips" role="group" aria-label="Tone">
        {#each TONES as t}
          <button
            class="inkly-ai__chip"
            class:inkly-ai__chip--active={aiPanelState.tone === t.id}
            onclick={() => (aiPanelState.tone = t.id)}
          >{t.label}</button>
        {/each}
      </div>
      <p class="inkly-ai__seg">Length</p>
      <div class="inkly-ai__chips" role="group" aria-label="Length">
        {#each LENGTHS as l}
          <button
            class="inkly-ai__chip"
            class:inkly-ai__chip--active={aiPanelState.length === l.id}
            onclick={() => (aiPanelState.length = l.id)}
          >{l.label}</button>
        {/each}
      </div>
      <div class="inkly-ai__row">
        <button class="inkly-ai__btn" onclick={() => aiPanelState.onAction?.('rewrite')}>Rewrite</button>
        <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => (aiPanelState.phase = 'actions')}>Back</button>
      </div>
    {:else if aiPanelState.phase === 'loading'}
      {#if aiPanelState.streamingText}
        <p class="inkly-ai__result">{aiPanelState.streamingText}</p>
      {:else}
        <span class="inkly-ai__loading">{LOADING_LABELS[aiPanelState.capability] ?? 'Working…'}</span>
      {/if}
    {:else if aiPanelState.phase === 'result'}
      {#if aiPanelState.capability === 'synonyms'}
        {#each parseSynonymGroups(aiPanelState.result) as group}
          <div class="inkly-ai__syn-group">
            {#if group.sense}<p class="inkly-ai__syn-sense">{group.sense}</p>{/if}
            <div class="inkly-ai__chips" role="group" aria-label="Synonyms">
              {#each group.words as syn}
                <button class="inkly-ai__chip" onclick={() => aiPanelState.onPickSynonym?.(syn)}>{syn}</button>
              {/each}
            </div>
          </div>
        {/each}
        <div class="inkly-ai__subactions">
          <button class="inkly-ai__mini" onclick={() => aiPanelState.onAction?.('improve')}>✨ Improve</button>
          <button class="inkly-ai__mini" onclick={() => aiPanelState.onAction?.('translate')}>🌐 Translate</button>
          <button class="inkly-ai__mini" onclick={() => (aiPanelState.phase = 'rewrite-config')}>✦ Rewrite</button>
        </div>
        <div class="inkly-ai__row">
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {:else if aiPanelState.capability === 'improve'}
        {#if aiPanelState.improvements.length === 0}
          <p class="inkly-ai__result">Looks good — no changes to suggest.</p>
        {:else}
          {#each aiPanelState.improvements as imp, i}
            <div class="inkly-ai__imp">
              <p class="inkly-ai__imp-text"><del>{imp.from}</del> <strong>{imp.to}</strong></p>
              {#if imp.reason}<p class="inkly-ai__imp-reason">{imp.reason}</p>{/if}
              <button class="inkly-ai__chip" onclick={() => aiPanelState.onApplyImprovement?.(i)}>Apply</button>
            </div>
          {/each}
        {/if}
        <div class="inkly-ai__row">
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {:else}
        <p class="inkly-ai__result">{aiPanelState.result}</p>
        <div class="inkly-ai__row">
          {#if aiPanelState.capability === 'rewrite' || aiPanelState.capability === 'translate'}
            <button class="inkly-ai__btn" onclick={() => aiPanelState.onApply?.()}>Apply</button>
          {/if}
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onCopy?.()}>Copy</button>
          <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
        </div>
      {/if}
    {:else if aiPanelState.phase === 'error'}
      <p class="inkly-ai__error">AI error: {aiPanelState.error}</p>
      <button class="inkly-ai__btn inkly-ai__btn--ghost" onclick={() => aiPanelState.onDismiss?.()}>Dismiss</button>
    {/if}
  </div>
{/if}

<style>
  .inkly-ai {
    position: fixed; z-index: 2147483647; width: 240px; max-width: calc(100vw - 24px);
    background: var(--inkly-bg); color: var(--inkly-text);
    border: 1px solid var(--inkly-border); border-radius: 10px;
    box-shadow: var(--inkly-shadow); padding: 8px;
    font: 12.5px/1.4 var(--inkly-font); pointer-events: auto;
  }

  /* Header row: mark + brand label + hotkey hint. */
  .inkly-ai__head {
    display: flex; align-items: center; gap: 6px; margin: 1px 2px 7px;
  }
  .inkly-ai__mark { flex: none; display: inline-flex; color: var(--inkly-accent); }
  .inkly-ai__brand {
    font-weight: 700; font-size: 11.5px; color: var(--inkly-muted); letter-spacing: 0.02em;
  }
  .inkly-ai__x {
    border: 0; background: none; cursor: pointer; color: var(--inkly-muted);
    font-size: 16px; line-height: 1; padding: 0 2px; border-radius: 5px;
  }
  .inkly-ai__x--head { margin-left: auto; }
  .inkly-ai__x:hover { color: var(--inkly-text); }

  .inkly-ai__result { margin: 2px; white-space: pre-wrap; color: var(--inkly-text); }
  .inkly-ai__imp { padding: 7px 2px; border-bottom: 1px solid var(--inkly-border); }
  .inkly-ai__imp:last-of-type { border-bottom: 0; margin-bottom: 4px; }
  .inkly-ai__imp-text { margin: 0 0 3px; line-height: 1.45; }
  .inkly-ai__imp-text del { color: var(--inkly-sev-correct); text-decoration: line-through; }
  .inkly-ai__imp-text strong { color: var(--inkly-accent); font-weight: 700; }
  .inkly-ai__imp-reason { margin: 0 0 7px; font-size: 11px; color: var(--inkly-muted); }
  .inkly-ai__row { display: flex; gap: 6px; }
  .inkly-ai__loading, .inkly-ai__error { display: block; padding: 2px; }
  .inkly-ai__loading { color: var(--inkly-muted); }
  .inkly-ai__error { color: var(--inkly-sev-correct); margin: 0 0 8px; }

  /* Actions: one compact row of icon+label tabs (no chunky buttons). */
  .inkly-ai__tabs { display: flex; gap: 3px; }
  .inkly-ai__tab {
    flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px;
    border: 0; background: none; color: var(--inkly-muted); cursor: pointer;
    font: 600 10px var(--inkly-font); padding: 7px 2px; border-radius: 8px;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .inkly-ai__tab-i { font-size: 15px; line-height: 1; }
  .inkly-ai__tab-l { white-space: nowrap; }
  .inkly-ai__tab:hover { background: var(--inkly-ghost-bg); color: var(--inkly-text); }
  .inkly-ai__tab--primary { color: var(--inkly-accent); }
  .inkly-ai__tab--primary:hover { color: var(--inkly-accent); }

  /* Footer actions — light + consistent with the tabs. Apply = accent; rest = text. */
  .inkly-ai__row { display: flex; align-items: center; gap: 4px; }
  .inkly-ai__btn {
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; justify-content: center;
    border: 1px solid var(--inkly-accent); background: var(--inkly-accent);
    color: var(--inkly-accent-contrast); border-radius: 8px;
    padding: 6px 14px; cursor: pointer; font: 600 12px var(--inkly-font);
    transition: background 0.12s ease, color 0.12s ease;
  }
  .inkly-ai__btn:hover { background: var(--inkly-accent-press); border-color: var(--inkly-accent-press); }
  .inkly-ai__btn--ghost {
    background: none; border: 0; color: var(--inkly-muted); padding: 6px 10px; border-radius: 7px;
  }
  .inkly-ai__btn--ghost:hover { background: var(--inkly-ghost-bg); color: var(--inkly-text); }

  /* Synonyms grouped by sense. */
  .inkly-ai__syn-group { margin-bottom: 7px; }
  .inkly-ai__syn-group:last-of-type { margin-bottom: 2px; }
  .inkly-ai__syn-sense {
    margin: 0 0 4px; font-size: 10.5px; font-weight: 600; color: var(--inkly-muted);
  }
  .inkly-ai__syn-group .inkly-ai__chips { margin: 0; }

  /* Chips: wrap onto multiple rows — never a horizontal scrollbar. */
  .inkly-ai__chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 2px 0 9px; }
  .inkly-ai__chip {
    white-space: nowrap;
    border: 1px solid var(--inkly-ghost-border); background: var(--inkly-ghost-bg);
    color: var(--inkly-ghost-text); border-radius: 999px;
    padding: 3px 11px; cursor: pointer; font: 600 11.5px var(--inkly-font);
  }
  .inkly-ai__chip:hover { border-color: var(--inkly-accent); color: var(--inkly-accent); }
  .inkly-ai__chip--active {
    background: var(--inkly-accent); color: var(--inkly-accent-contrast); border-color: var(--inkly-accent);
  }
  .inkly-ai__seg {
    margin: 2px 0 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
    text-transform: uppercase; color: var(--inkly-muted);
  }
  /* Secondary actions (in the synonyms result): light text buttons, same family. */
  .inkly-ai__subactions { display: flex; flex-wrap: wrap; gap: 2px; margin: 2px 0 9px; }
  .inkly-ai__mini {
    display: inline-flex; align-items: center; gap: 5px; border: 0; background: none;
    color: var(--inkly-muted); border-radius: 7px; padding: 5px 8px; cursor: pointer;
    font: 600 11.5px var(--inkly-font); white-space: nowrap;
  }
  .inkly-ai__mini:hover { background: var(--inkly-ghost-bg); color: var(--inkly-text); }
</style>
