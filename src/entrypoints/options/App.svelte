<script lang="ts">
  import { onMount } from 'svelte';
  import { getAIConfig, setAIConfig, hasKey } from '../../core/ai/ai-config';
  import type { AIConfig } from '../../core/ai/ai-types';
  import { getSettings, setSettings, effectiveLang, type ThemePref } from '../../core/settings';
  import { t, type Lang } from '../../core/i18n';

  let endpoint = $state('');
  let apiKey = $state('');
  let model = $state('');
  let lang = $state<Lang>('en');
  let theme = $state<ThemePref>('auto');
  let loaded = $state(false);
  let savedFlag = $state(false);

  const config = $derived({ provider: 'openai-compatible', endpoint, apiKey, model } as AIConfig);

  onMount(async () => {
    const [cfg, settings] = await Promise.all([getAIConfig(), getSettings()]);
    endpoint = cfg.endpoint;
    apiKey = cfg.apiKey;
    model = cfg.model;
    lang = effectiveLang(settings, navigator.language);
    theme = settings.theme;
    loaded = true;
  });

  async function saveTheme(value: ThemePref) {
    theme = value;
    const s = await getSettings();
    await setSettings({ ...s, theme: value });
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
      <label>{t(lang, 'options.endpoint')}
        <input type="url" bind:value={endpoint} placeholder="https://api.openai.com/v1" />
      </label>
      <label>{t(lang, 'options.model')}
        <input type="text" bind:value={model} placeholder="gpt-4o-mini" />
      </label>
      <label>{t(lang, 'options.apiKey')}
        <input type="password" bind:value={apiKey} placeholder="sk-…" autocomplete="off" />
      </label>
      <div class="row">
        <button onclick={save}>{savedFlag ? t(lang, 'options.saved') : t(lang, 'options.save')}</button>
        <span class="status" class:ok={hasKey(config)}>
          {hasKey(config) ? t(lang, 'options.configured') : t(lang, 'options.notConfigured')}
        </span>
      </div>
    </section>

    <section>
      <h2>{t(lang, 'options.theme')}</h2>
      <label>{t(lang, 'options.theme')}
        <select value={theme} onchange={(e) => saveTheme((e.currentTarget as HTMLSelectElement).value as ThemePref)}>
          <option value="auto">{t(lang, 'theme.auto')}</option>
          <option value="light">{t(lang, 'theme.light')}</option>
          <option value="dark">{t(lang, 'theme.dark')}</option>
        </select>
      </label>
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
