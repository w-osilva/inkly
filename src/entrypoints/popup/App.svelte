<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from 'wxt/browser';
  import { getSettings, setSettings, hostOf, isEnabledForHost, isCategoryEnabled, toggleCategory, removeWord, DEFAULT_SETTINGS, effectiveLang, type Settings, type ThemePref } from '../../core/settings';
  import { LINT_CATEGORIES } from '../../core/lint-categories';
  import { t, categoryLabel } from '../../core/i18n';
  import { detectBuiltins, type BuiltinStatus, type BuiltinCapability } from '../../core/ai/builtin-apis';

  // Which engines back each category beyond Harper's always-on baseline: `builtin` = our
  // deterministic rules (always on); `proofread` = the on-device Proofreader API (only when
  // available). Drives the per-category badges.
  const CATEGORY_ENGINES: Record<string, { builtin?: boolean; proofread?: boolean }> = {
    Punctuation: { builtin: true, proofread: true },
    Spelling: { proofread: true },
    Capitalization: { proofread: true },
    Grammar: { proofread: true },
  };

  let settings = $state<Settings>({ ...DEFAULT_SETTINGS });
  let host = $state('');
  let loaded = $state(false);
  let builtins = $state<Record<BuiltinCapability, BuiltinStatus> | null>(null);

  const siteEnabled = $derived(isEnabledForHost(settings, host));
  const lang = $derived(effectiveLang(settings, navigator.language));
  const proofreadOn = $derived(builtins?.proofreader === 'available');
  const onDevice = $derived<BuiltinStatus>(
    !builtins ? 'unavailable'
    : Object.values(builtins).includes('available') ? 'available'
    : Object.values(builtins).includes('downloadable') ? 'downloadable'
    : 'unavailable',
  );

  onMount(async () => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    host = hostOf(tabs[0]?.url ?? '');
    settings = await getSettings();
    builtins = await detectBuiltins();
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

  async function setTheme(value: ThemePref) {
    const cur = await getSettings();
    const next = { ...cur, theme: value };
    settings = next;
    await setSettings(next);
  }

  async function toggleDefaultStyle(id: string) {
    const cur = await getSettings();
    const has = cur.defaultStyles.includes(id);
    const next = { ...cur, defaultStyles: has ? cur.defaultStyles.filter((s) => s !== id) : [...cur.defaultStyles, id] };
    settings = next;
    await setSettings(next);
  }

  async function setDefaultLength(value: string) {
    const cur = await getSettings();
    const next = { ...cur, defaultLength: value };
    settings = next;
    await setSettings(next);
  }

  // Default rewrite style: register (casual↔formal) + modifiers + length.
  const TONE_OPTIONS = [
    { id: 'casual', key: 'tone.casual' },
    { id: 'friendly', key: 'tone.friendly' },
    { id: '', key: 'tone.neutral' },
    { id: 'professional', key: 'tone.professional' },
    { id: 'formal', key: 'tone.formal' },
  ];
  const STYLE_OPTIONS = [
    { id: 'confident', key: 'tone.confident' },
    { id: 'technical', key: 'tone.technical' },
    { id: 'persuasive', key: 'tone.persuasive' },
    { id: 'simple', key: 'tone.simple' },
  ];
  const LENGTH_OPTIONS = [
    { id: 'shorter', key: 'length.shorter' },
    { id: 'asis', key: 'length.same' },
    { id: 'longer', key: 'length.longer' },
  ];
</script>

<main>
  <h1>inkly</h1>
  {#if loaded}
    <div class="ondevice" class:on={onDevice === 'available'} class:soon={onDevice === 'downloadable'}>
      {#if onDevice === 'available'}{t(lang, 'popup.onDeviceOn')}
      {:else if onDevice === 'downloadable'}{t(lang, 'popup.onDeviceSoon')}
      {:else}{t(lang, 'popup.onDeviceOff')}{/if}
    </div>
    <label class="row">
      <span>{t(lang, 'popup.language')}</span>
      <select value={settings.uiLanguage} onchange={(e) => setLanguage((e.currentTarget as HTMLSelectElement).value as 'auto' | 'en' | 'pt-br')}>
        <option value="auto">{t(lang, 'lang.auto')}</option>
        <option value="en">{t(lang, 'lang.en')}</option>
        <option value="pt-br">{t(lang, 'lang.pt-br')}</option>
      </select>
    </label>
    <label class="row">
      <span>{t(lang, 'options.theme')}</span>
      <select value={settings.theme} onchange={(e) => setTheme((e.currentTarget as HTMLSelectElement).value as ThemePref)}>
        <option value="auto">{t(lang, 'theme.auto')}</option>
        <option value="light">{t(lang, 'theme.light')}</option>
        <option value="dark">{t(lang, 'theme.dark')}</option>
      </select>
    </label>
    <section>
      <h2>{t(lang, 'popup.defaultStyle')}</h2>
      <label class="row">
        <span>{t(lang, 'popup.defaultTone')}</span>
        <select value={settings.defaultTone} onchange={(e) => setDefaultTone((e.currentTarget as HTMLSelectElement).value)}>
          {#each TONE_OPTIONS as opt}
            <option value={opt.id}>{t(lang, opt.key)}</option>
          {/each}
        </select>
      </label>
      <label class="row">
        <span>{t(lang, 'popup.defaultLength')}</span>
        <select value={settings.defaultLength} onchange={(e) => setDefaultLength((e.currentTarget as HTMLSelectElement).value)}>
          {#each LENGTH_OPTIONS as opt}
            <option value={opt.id}>{t(lang, opt.key)}</option>
          {/each}
        </select>
      </label>
      <div class="mods">
        {#each STYLE_OPTIONS as opt}
          <label class="mod" class:on={settings.defaultStyles.includes(opt.id)}>
            <input type="checkbox" checked={settings.defaultStyles.includes(opt.id)} onchange={() => toggleDefaultStyle(opt.id)} />
            <span>{t(lang, opt.key)}</span>
          </label>
        {/each}
      </div>
    </section>
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
            {#if CATEGORY_ENGINES[cat]?.builtin}
              <span class="cat-tag cat-tag--builtin" title={t(lang, 'popup.engineBuiltin')}>⊕</span>
            {/if}
            {#if CATEGORY_ENGINES[cat]?.proofread && proofreadOn}
              <span class="cat-tag cat-tag--ai" title={t(lang, 'popup.engineAI')}>✨</span>
            {/if}
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
  .ondevice {
    margin: 0 0 10px; padding: 6px 9px; font-size: 12px; line-height: 1.35;
    border-radius: var(--inkly-radius-sm); border: 1px solid var(--inkly-border);
    background: var(--inkly-bg-subtle, rgba(127,127,127,0.08)); color: var(--inkly-muted);
  }
  .ondevice.on, .ondevice.soon { border-color: var(--inkly-accent); }
  .ondevice.on { color: var(--inkly-text); }
  .mods { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .mod { display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 3px 8px; border: 1px solid var(--inkly-border); border-radius: 999px; cursor: pointer; }
  .mod.on { border-color: var(--inkly-accent); color: var(--inkly-accent); }
  .mod input { accent-color: var(--inkly-accent); }
  .cats { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; max-height: 180px; overflow: auto; }
  .cat { display: flex; align-items: center; gap: 5px; font-size: 12px; }
  .cat-tag { font-size: 10px; line-height: 1; cursor: help; flex: none; }
  .cat-tag--builtin { color: var(--inkly-muted); }
  .cat-tag--ai { color: var(--inkly-accent); }
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
