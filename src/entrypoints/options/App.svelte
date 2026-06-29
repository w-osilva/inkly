<script lang="ts">
  import { onMount } from 'svelte';
  import { getAIConfig, setAIConfig, hasKey } from '../../core/ai/ai-config';
  import type { AIConfig } from '../../core/ai/ai-types';
  import { getSettings, effectiveLang } from '../../core/settings';
  import { t, type Lang } from '../../core/i18n';
  import { AI_PROVIDERS, getProvider, providerForEndpoint } from '../../core/ai/providers';

  let providerId = $state('openrouter');
  let endpoint = $state('');
  let apiKey = $state('');
  let model = $state('');
  let lang = $state<Lang>('en');
  let loaded = $state(false);
  let savedFlag = $state(false);

  const provider = $derived(getProvider(providerId));
  const config = $derived({ provider: 'openai-compatible', endpoint, apiKey, model } as AIConfig);

  onMount(async () => {
    const [cfg, settings] = await Promise.all([getAIConfig(), getSettings()]);
    endpoint = cfg.endpoint;
    apiKey = cfg.apiKey;
    model = cfg.model;
    providerId = providerForEndpoint(cfg.endpoint);
    lang = effectiveLang(settings, navigator.language);
    loaded = true;
  });

  // Picking a preset fills the endpoint + a default model (both still editable). Custom
  // clears nothing so the user types their own. A keyless provider gets a dummy key so
  // the request still sends an Authorization header.
  function selectProvider(id: string) {
    providerId = id;
    const p = getProvider(id);
    if (id !== 'custom') {
      endpoint = p.endpoint;
      if (!p.models.includes(model)) model = p.models[0] ?? model;
      if (p.noKey && !apiKey) apiKey = 'ollama';
    }
  }

  async function save() {
    await setAIConfig({ provider: 'openai-compatible', endpoint, apiKey, model });
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

      <label>{t(lang, 'options.provider')}
        <select value={providerId} onchange={(e) => selectProvider((e.currentTarget as HTMLSelectElement).value)}>
          <optgroup label={t(lang, 'options.providersOpen')}>
            {#each AI_PROVIDERS.filter((p) => p.group === 'open') as p}
              <option value={p.id}>{p.label}</option>
            {/each}
          </optgroup>
          <optgroup label={t(lang, 'options.providersProprietary')}>
            {#each AI_PROVIDERS.filter((p) => p.group === 'proprietary') as p}
              <option value={p.id}>{p.label}</option>
            {/each}
          </optgroup>
          {#each AI_PROVIDERS.filter((p) => p.group === 'custom') as p}
            <option value={p.id}>{p.label}</option>
          {/each}
        </select>
      </label>
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
