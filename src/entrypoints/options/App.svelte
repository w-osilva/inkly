<script lang="ts">
  import { onMount } from 'svelte';
  import { getAIConfig, setAIConfig, hasKey } from '../../core/ai/ai-config';
  import type { AIConfig } from '../../core/ai/ai-types';
  import { getSettings, effectiveLang } from '../../core/settings';
  import { t, type Lang } from '../../core/i18n';

  let endpoint = $state('');
  let apiKey = $state('');
  let model = $state('');
  let lang = $state<Lang>('en');
  let loaded = $state(false);
  let savedFlag = $state(false);

  const config = $derived({ provider: 'openai-compatible', endpoint, apiKey, model } as AIConfig);

  onMount(async () => {
    const [cfg, settings] = await Promise.all([getAIConfig(), getSettings()]);
    endpoint = cfg.endpoint;
    apiKey = cfg.apiKey;
    model = cfg.model;
    lang = effectiveLang(settings, navigator.language);
    loaded = true;
  });

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
  {/if}
</main>

<style>
  main { max-width: 480px; margin: 24px auto; padding: 0 16px; font: 14px/1.5 -apple-system, system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 16px 0 4px; }
  .hint { color: #888; margin: 0 0 12px; font-size: 13px; }
  label { display: block; margin: 10px 0; }
  input { display: block; width: 100%; margin-top: 4px; padding: 6px 8px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font: inherit; }
  .row { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
  button { border: 1px solid #7b53d6; background: #7b53d6; color: #fff; border-radius: 6px; padding: 6px 16px; cursor: pointer; font: inherit; font-weight: 600; }
  .status { color: #c0392b; font-size: 13px; }
  .status.ok { color: #2e7d32; }
</style>
