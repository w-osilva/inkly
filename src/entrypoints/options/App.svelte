<script lang="ts">
  import { onMount } from 'svelte';
  import { getAIConfig, setAIConfig, hasKey } from '../../core/ai/ai-config';
  import type { AIConfig } from '../../core/ai/ai-types';
  import { getSettings, setSettings, effectiveLang, DEFAULT_LT_ENDPOINT } from '../../core/settings';
  import { t, type Lang } from '../../core/i18n';
  import { AI_PROVIDERS, getProvider, providerForEndpoint } from '../../core/ai/providers';
  import { detectBuiltins, type BuiltinStatus, type BuiltinCapability } from '../../core/ai/builtin-apis';
  import { CORRECTION_TOOLS, SELECTION_ACTIONS } from '../../core/tools';

  // Friendly names for the on-device Writing Assistance capabilities, in display order.
  const BUILTIN_LABELS: Record<BuiltinCapability, string> = {
    languageModel: 'Prompt', rewriter: 'Rewriter', writer: 'Writer',
    proofreader: 'Proofreader', summarizer: 'Summarizer',
  };

  let providerId = $state('openrouter');
  let endpoint = $state('');
  let apiKey = $state('');
  let model = $state('');
  let lang = $state<Lang>('en');
  let loaded = $state(false);
  let savedFlag = $state(false);
  let builtins = $state<Record<BuiltinCapability, BuiltinStatus> | null>(null);

  // Headline state: any capability ready → active; else any downloadable → soon; else none.
  const builtin = $derived<BuiltinStatus>(
    !builtins ? 'unavailable'
    : Object.values(builtins).includes('available') ? 'available'
    : Object.values(builtins).includes('downloadable') ? 'downloadable'
    : 'unavailable',
  );
  const builtinNames = $derived(
    !builtins ? [] :
    (Object.keys(BUILTIN_LABELS) as BuiltinCapability[])
      .filter((c) => builtins![c] === 'available').map((c) => BUILTIN_LABELS[c]),
  );

  const provider = $derived(getProvider(providerId));
  const config = $derived({ provider: 'openai-compatible', endpoint, apiKey, model } as AIConfig);
  const privacyKey = $derived(
    provider.privacy === 'local' ? 'options.privacyLocal'
    : provider.privacy === 'no-train' ? 'options.privacyNoTrain'
    : provider.privacy === 'trains' ? 'options.privacyTrains'
    : null,
  );

  // Per-provider keys, so switching providers keeps each one's saved key.
  let keys = $state<Record<string, string>>({});

  // Tools: correction engines (order = priority) + selection actions + LT endpoint.
  const TOOL_SCOPE = Object.fromEntries(CORRECTION_TOOLS.map((t) => [t.id, t.scope])) as Record<string, string>;
  let order = $state<string[]>([]);
  let disabled = $state<string[]>([]);
  let actionsDisabled = $state<string[]>([]);
  let ltEndpoint = $state(DEFAULT_LT_ENDPOINT);

  onMount(async () => {
    const [cfg, settings, detected] = await Promise.all([getAIConfig(), getSettings(), detectBuiltins()]);
    endpoint = cfg.endpoint;
    apiKey = cfg.apiKey;
    model = cfg.model;
    providerId = providerForEndpoint(cfg.endpoint);
    keys = { ...(cfg.keys ?? {}) };
    // Migrate: seed the active provider's key from the legacy single key if unset.
    if (cfg.apiKey && !keys[providerId]) keys[providerId] = cfg.apiKey;
    order = [...settings.correctionOrder];
    disabled = [...settings.correctionDisabled];
    actionsDisabled = [...settings.selectionActionsDisabled];
    ltEndpoint = settings.languageToolEndpoint;
    lang = effectiveLang(settings, navigator.language);
    builtins = detected;
    loaded = true;
  });

  async function persistTools() {
    const cur = await getSettings();
    // Spread to plain arrays: Svelte $state proxies serialize to objects through
    // chrome.storage, which would break Array.isArray on read.
    await setSettings({
      ...cur,
      correctionOrder: [...order],
      correctionDisabled: [...disabled],
      selectionActionsDisabled: [...actionsDisabled],
      languageToolEndpoint: ltEndpoint.trim() || DEFAULT_LT_ENDPOINT,
    });
  }
  const toolOn = (id: string) => !disabled.includes(id);
  function toggleTool(id: string) {
    disabled = toolOn(id) ? [...disabled, id] : disabled.filter((x) => x !== id);
    void persistTools();
  }
  function toggleAction(id: string) {
    actionsDisabled = actionsDisabled.includes(id) ? actionsDisabled.filter((x) => x !== id) : [...actionsDisabled, id];
    void persistTools();
  }
  // Reorder = repriority: earlier in the list wins overlaps.
  function moveTool(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    order = next;
    void persistTools();
  }

  // Picking a preset fills the endpoint + a default model (both still editable) and swaps
  // in that provider's saved key. The key being left is stashed first so it isn't lost.
  // A keyless provider (Ollama) gets a dummy key so the request still sends a header.
  function selectProvider(id: string) {
    keys = { ...keys, [providerId]: apiKey };
    providerId = id;
    const p = getProvider(id);
    if (id !== 'custom') {
      endpoint = p.endpoint;
      if (!p.models.includes(model)) model = p.models[0] ?? model;
    }
    apiKey = p.noKey ? keys[id] || 'ollama' : keys[id] ?? '';
  }

  async function save() {
    const nextKeys = { ...keys, [providerId]: apiKey };
    await setAIConfig({ provider: 'openai-compatible', endpoint, apiKey, model, keys: nextKeys });
    keys = nextKeys;
    savedFlag = true;
    setTimeout(() => (savedFlag = false), 1500);
  }
</script>

<main>
  <h1>inkly</h1>
  {#if loaded}
    <section>
      <h2>{t(lang, 'options.aiHeading')}</h2>
      <p class="hint">{t(lang, 'options.aiHint')}</p>

      <div class="builtin" class:on={builtin === 'available'} class:soon={builtin === 'downloadable'}>
        {#if builtin === 'available'}{t(lang, 'options.builtinAvailable')}
        {:else if builtin === 'downloadable'}{t(lang, 'options.builtinDownloadable')}
        {:else}{t(lang, 'options.builtinUnavailable')}{/if}
        {#if builtinNames.length > 0}
          <span class="builtin-caps">{t(lang, 'options.builtinCaps')}: {builtinNames.join(', ')}</span>
        {/if}
      </div>
      <p class="hint">{t(lang, 'options.builtinNote')}</p>

      <label>{t(lang, 'options.provider')}
        <select value={providerId} onchange={(e) => selectProvider((e.currentTarget as HTMLSelectElement).value)}>
          <optgroup label={t(lang, 'options.providersOpen')}>
            {#each AI_PROVIDERS.filter((p) => p.group === 'open') as p}
              <option value={p.id}>{p.label}{p.recommended ? ` — ${t(lang, 'options.recommended')}` : ''}</option>
            {/each}
          </optgroup>
          <optgroup label={t(lang, 'options.providersProprietary')}>
            {#each AI_PROVIDERS.filter((p) => p.group === 'proprietary') as p}
              <option value={p.id}>{p.label}{p.recommended ? ` — ${t(lang, 'options.recommended')}` : ''}</option>
            {/each}
          </optgroup>
          {#each AI_PROVIDERS.filter((p) => p.group === 'custom') as p}
            <option value={p.id}>{p.label}</option>
          {/each}
        </select>
      </label>
      <div class="badges">
        {#if privacyKey}<span class="badge badge--{provider.privacy}">{t(lang, privacyKey)}</span>{/if}
        {#if provider.recommended}<span class="badge badge--rec">★ {t(lang, 'options.recommended')}</span>{/if}
      </div>
      {#if provider.note}<p class="hint">{provider.note}</p>{/if}

      {#if providerId === 'custom'}
        <label>{t(lang, 'options.endpoint')}
          <input type="url" bind:value={endpoint} placeholder="https://api.openai.com/v1" />
        </label>
      {/if}

      <label>{t(lang, 'options.model')}
        <input type="text" bind:value={model} list="inkly-models" placeholder="model id" />
        <datalist id="inkly-models">
          {#each provider.models as m}<option value={m}></option>{/each}
        </datalist>
      </label>

      {#if !provider.noKey}
        <label>{t(lang, 'options.apiKey')}
          <input type="password" bind:value={apiKey} placeholder="sk-…" autocomplete="off" />
        </label>
        {#if provider.keyUrl}
          <a class="key-link" href={provider.keyUrl} target="_blank" rel="noopener noreferrer">{t(lang, 'options.getKey')}</a>
        {/if}
      {/if}

      <div class="row">
        <button onclick={save}>{savedFlag ? t(lang, 'options.saved') : t(lang, 'options.save')}</button>
        <span class="status" class:ok={hasKey(config)}>
          {hasKey(config) ? t(lang, 'options.configured') : t(lang, 'options.notConfigured')}
        </span>
      </div>
    </section>

    <section>
      <h2>{t(lang, 'tools.heading')}</h2>

      <h3 class="tools-group">{t(lang, 'tools.correctionGroup')}</h3>
      <p class="hint">{t(lang, 'tools.priorityHint')}</p>
      <ul class="tools">
        {#each order as id, i (id)}
          <li class="tool" class:off={!toolOn(id)}>
            <span class="tool-rank">{i + 1}</span>
            <span class="tool-reorder">
              <button class="tool-move" aria-label={t(lang, 'tools.moveUp')} disabled={i === 0} onclick={() => moveTool(i, -1)}>▲</button>
              <button class="tool-move" aria-label={t(lang, 'tools.moveDown')} disabled={i === order.length - 1} onclick={() => moveTool(i, 1)}>▼</button>
            </span>
            <span class="tool-name">{t(lang, `tool.${id}`)}</span>
            <span class="badge badge--{TOOL_SCOPE[id]}">{t(lang, `tools.scope.${TOOL_SCOPE[id]}`)}</span>
            <label class="switch"><input type="checkbox" checked={toolOn(id)} onchange={() => toggleTool(id)} /></label>
          </li>
        {/each}
      </ul>
      {#if toolOn('languagetool')}
        <label class="lt-server">{t(lang, 'options.ltServer')}
          <input type="url" bind:value={ltEndpoint} onblur={persistTools} placeholder={DEFAULT_LT_ENDPOINT} />
        </label>
        <p class="hint">{t(lang, 'options.ltPrivacy')}</p>
      {/if}

      <h3 class="tools-group">{t(lang, 'tools.actionsGroup')}</h3>
      <p class="hint">{t(lang, 'tools.actionsHint')}</p>
      <div class="actions">
        {#each SELECTION_ACTIONS as a}
          <label class="action" class:off={actionsDisabled.includes(a)}>
            <input type="checkbox" checked={!actionsDisabled.includes(a)} onchange={() => toggleAction(a)} />
            <span>{t(lang, `tool.action.${a}`)}</span>
          </label>
        {/each}
      </div>
    </section>
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: var(--inkly-bg); color: var(--inkly-text); }
  main {
    max-width: 480px; margin: 24px auto; padding: 0 16px;
    font: 14px/1.5 var(--inkly-font); color: var(--inkly-text);
  }
  h1 { font-size: 18px; margin: 0 0 4px; font-weight: 700; }
  h2 { font-size: 15px; margin: 16px 0 4px; font-weight: 700; }
  .hint { color: var(--inkly-muted); margin: 0 0 12px; font-size: 13px; }
  label { display: block; margin: 10px 0; }
  input, select {
    display: block; width: 100%; margin-top: 4px; padding: 7px 9px;
    border: 1px solid var(--inkly-border); border-radius: var(--inkly-radius-sm);
    box-sizing: border-box; font: inherit;
    background: var(--inkly-bg); color: var(--inkly-text);
  }
  input:focus, select:focus { outline: none; border-color: var(--inkly-accent); }
  .key-link { display: inline-block; margin-top: 2px; color: var(--inkly-accent); font-size: 13px; text-decoration: none; }
  .key-link:hover { text-decoration: underline; }
  .builtin {
    margin: 8px 0 4px; padding: 8px 10px; font-size: 13px; line-height: 1.4;
    border-radius: var(--inkly-radius-sm); border: 1px solid var(--inkly-border);
    background: var(--inkly-bg-subtle, rgba(127,127,127,0.08)); color: var(--inkly-muted);
  }
  .builtin.on { border-color: var(--inkly-accent); color: var(--inkly-text); }
  .builtin.soon { border-color: var(--inkly-accent); }
  .builtin-caps { display: block; margin-top: 4px; font-size: 12px; color: var(--inkly-muted); }
  .badges { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; }
  .badge {
    font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
    border: 1px solid var(--inkly-border); color: var(--inkly-muted);
  }
  .badge--local, .badge--no-train { color: var(--inkly-accent); border-color: var(--inkly-accent); }
  .badge--server, .badge--trains { color: var(--inkly-sev-correct); border-color: var(--inkly-sev-correct); }
  .badge--mixed { color: var(--inkly-sev-clarity, #e0a30c); border-color: var(--inkly-sev-clarity, #e0a30c); }
  .badge--rec { color: var(--inkly-accent-contrast); background: var(--inkly-accent); border-color: var(--inkly-accent); }
  /* Tools page */
  h3.tools-group { font-size: 13px; margin: 16px 0 2px; font-weight: 700; }
  .tools { list-style: none; margin: 6px 0; padding: 0; }
  .tool {
    display: flex; align-items: center; gap: 8px; padding: 6px 0;
    border-bottom: 1px solid var(--inkly-border);
  }
  .tool.off { opacity: 0.55; }
  .tool-rank { width: 16px; color: var(--inkly-muted); font-size: 12px; text-align: center; }
  .tool-reorder { display: flex; flex-direction: column; line-height: 0.8; }
  .tool-move {
    border: 0; background: none; cursor: pointer; color: var(--inkly-muted);
    font-size: 9px; padding: 1px 3px; width: auto;
  }
  .tool-move:hover:not(:disabled) { color: var(--inkly-accent); }
  .tool-move:disabled { opacity: 0.3; cursor: default; }
  .tool-name { flex: 1; }
  .switch input { width: auto; margin: 0; }
  .lt-server { display: block; margin: 8px 0; }
  .actions { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 4px 0; }
  .action { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .action input { width: auto; margin: 0; }
  .action.off { opacity: 0.55; }
  .row { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  button {
    border: 1px solid var(--inkly-accent); background: var(--inkly-accent);
    color: var(--inkly-accent-contrast); border-radius: var(--inkly-radius-sm);
    padding: 7px 16px; cursor: pointer; font: inherit; font-weight: 600;
  }
  button:hover { background: var(--inkly-accent-press); border-color: var(--inkly-accent-press); }
  .status { color: var(--inkly-sev-correct); font-size: 13px; }
  .status.ok { color: var(--inkly-accent); }
</style>
