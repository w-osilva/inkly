<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from 'wxt/browser';
  import { getSettings, setSettings, hostOf, isEnabledForHost, isCategoryEnabled, toggleCategory, removeWord, DEFAULT_SETTINGS, effectiveLang, type Settings } from '../../core/settings';
  import { LINT_CATEGORIES } from '../../core/lint-categories';
  import { t, categoryLabel } from '../../core/i18n';

  let settings = $state<Settings>({ ...DEFAULT_SETTINGS });
  let host = $state('');
  let loaded = $state(false);

  const siteEnabled = $derived(isEnabledForHost(settings, host));
  const lang = $derived(effectiveLang(settings, navigator.language));

  onMount(async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    host = hostOf(tabs[0]?.url ?? '');
    settings = await getSettings();
    loaded = true;
  });

  async function toggleGlobal() {
    const cur = await getSettings();
    const next = { ...cur, globalEnabled: !cur.globalEnabled };
    settings = next;
    await setSettings(next);
  }

  async function toggleSite() {
    if (!host) return;
    const cur = await getSettings();
    const next = {
      ...cur,
      siteOverrides: { ...cur.siteOverrides, [host]: !isEnabledForHost(cur, host) },
    };
    settings = next;
    await setSettings(next);
  }

  async function setCategory(cat: string, enabled: boolean) {
    const cur = await getSettings();
    const next = toggleCategory(cur, cat, enabled);
    settings = next;
    await setSettings(next);
  }

  async function deleteWord(word: string) {
    const cur = await getSettings();
    const next = removeWord(cur, word);
    settings = next;
    await setSettings(next);
  }

  async function setLanguage(value: 'auto' | 'en' | 'pt-br') {
    const cur = await getSettings();
    const next = { ...cur, uiLanguage: value };
    settings = next;
    await setSettings(next);
  }

  async function setDefaultTone(tone: string) {
    const cur = await getSettings();
    const next = { ...cur, defaultTone: tone };
    settings = next;
    await setSettings(next);
  }

  const TONE_OPTIONS = [
    { id: '', key: 'tone.neutral' },
    { id: 'formal', key: 'tone.formal' },
    { id: 'casual', key: 'tone.casual' },
    { id: 'confident', key: 'tone.confident' },
    { id: 'friendly', key: 'tone.friendly' },
    { id: 'concise', key: 'tone.concise' },
  ];
</script>

<main>
  <h1>inkly</h1>
  {#if loaded}
    <label class="row">
      <span>{t(lang, 'popup.language')}</span>
      <select value={settings.uiLanguage} onchange={(e) => setLanguage((e.currentTarget as HTMLSelectElement).value as 'auto' | 'en' | 'pt-br')}>
        <option value="auto">{t(lang, 'lang.auto')}</option>
        <option value="en">{t(lang, 'lang.en')}</option>
        <option value="pt-br">{t(lang, 'lang.pt-br')}</option>
      </select>
    </label>
    <label class="row">
      <span>{t(lang, 'popup.defaultTone')}</span>
      <select value={settings.defaultTone} onchange={(e) => setDefaultTone((e.currentTarget as HTMLSelectElement).value)}>
        {#each TONE_OPTIONS as opt}
          <option value={opt.id}>{t(lang, opt.key)}</option>
        {/each}
      </select>
    </label>
    <label class="row">
      <span>{t(lang, 'popup.globalEnable')}</span>
      <input type="checkbox" checked={settings.globalEnabled} onchange={toggleGlobal} />
    </label>
    {#if host}
      <label class="row" class:disabled={!settings.globalEnabled}>
        <span>{t(lang, 'popup.siteEnable', { host })}</span>
        <input type="checkbox" checked={siteEnabled} onchange={toggleSite} />
      </label>
    {:else}
      <p class="muted">{t(lang, 'popup.noSite')}</p>
    {/if}
    <section>
      <h2>{t(lang, 'popup.categories')}</h2>
      <div class="cats">
        {#each LINT_CATEGORIES as cat}
          <label class="cat">
            <input
              type="checkbox"
              checked={isCategoryEnabled(settings, cat)}
              onchange={(e) => setCategory(cat, (e.currentTarget as HTMLInputElement).checked)}
            />
            <span>{categoryLabel(lang, cat)}</span>
          </label>
        {/each}
      </div>
    </section>
    <section>
      <h2>{t(lang, 'popup.dictionary')}</h2>
      {#if settings.dictionary.length === 0}
        <p class="muted">{t(lang, 'popup.noWords')}</p>
      {:else}
        <ul class="dict">
          {#each settings.dictionary as word}
            <li><span>{word}</span><button aria-label={t(lang, 'popup.remove')} onclick={() => deleteWord(word)}>×</button></li>
          {/each}
        </ul>
      {/if}
    </section>
    <button class="ai-settings-link" onclick={() => browser.runtime.openOptionsPage()}>{t(lang, 'popup.aiSettings')}</button>
  {:else}
    <p class="muted">{t(lang, 'popup.loading')}</p>
  {/if}
</main>

<style>
  :global(body) { background: var(--inkly-bg); color: var(--inkly-text); }
  main {
    width: 300px; padding: 16px 18px;
    font: 14px/1.45 var(--inkly-font);
    background: var(--inkly-bg); color: var(--inkly-text);
  }
  h1 { margin: 0 0 12px; font-size: 16px; font-weight: 700; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
  .row.disabled { opacity: 0.5; }
  .row span { flex: 1; }
  .muted { color: var(--inkly-muted); }
  section { margin-top: 16px; }
  h2 { margin: 0 0 6px; font-size: 13px; color: var(--inkly-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  select {
    font: inherit; padding: 4px 6px; border-radius: var(--inkly-radius-sm);
    border: 1px solid var(--inkly-border); background: var(--inkly-bg); color: var(--inkly-text);
  }
  input[type='checkbox'] { accent-color: var(--inkly-accent); }
  .cats { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; max-height: 180px; overflow: auto; }
  .cat { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .dict { list-style: none; margin: 0; padding: 0; }
  .dict li { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 13px; }
  .dict button { border: 0; background: none; cursor: pointer; color: var(--inkly-muted); font-size: 15px; }
  .dict button:hover { color: var(--inkly-text); }
  .ai-settings-link {
    display: block; margin-top: 16px; border: 0; background: none; padding: 0;
    color: var(--inkly-accent); cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
  }
  .ai-settings-link:hover { text-decoration: underline; }
</style>
