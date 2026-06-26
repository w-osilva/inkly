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
  {:else}
    <p class="muted">{t(lang, 'popup.loading')}</p>
  {/if}
</main>

<style>
  main { width: 300px; padding: 14px 16px; font: 14px/1.4 -apple-system, system-ui, sans-serif; }
  h1 { margin: 0 0 12px; font-size: 16px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
  .row.disabled { opacity: 0.5; }
  .row span { flex: 1; }
  .muted { color: #888; }
  section { margin-top: 14px; }
  h2 { margin: 0 0 6px; font-size: 13px; color: #444; }
  .cats { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; max-height: 180px; overflow: auto; }
  .cat { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .dict { list-style: none; margin: 0; padding: 0; }
  .dict li { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-size: 13px; }
  .dict button { border: 0; background: none; cursor: pointer; color: #999; font-size: 15px; }
</style>
