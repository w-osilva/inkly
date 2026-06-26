<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from 'wxt/browser';
  import { getSettings, setSettings, hostOf, isEnabledForHost, isCategoryEnabled, toggleCategory, removeWord, DEFAULT_SETTINGS, type Settings } from '../../core/settings';
  import { LINT_CATEGORIES } from '../../core/lint-categories';

  let settings = $state<Settings>({ ...DEFAULT_SETTINGS });
  let host = $state('');
  let loaded = $state(false);

  const siteEnabled = $derived(isEnabledForHost(settings, host));

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
</script>

<main>
  <h1>inkly</h1>
  {#if loaded}
    <label class="row">
      <span>Enable inkly everywhere</span>
      <input type="checkbox" checked={settings.globalEnabled} onchange={toggleGlobal} />
    </label>
    {#if host}
      <label class="row" class:disabled={!settings.globalEnabled}>
        <span>Enable on <strong>{host}</strong></span>
        <input type="checkbox" checked={siteEnabled} onchange={toggleSite} />
      </label>
    {:else}
      <p class="muted">No site detected for this tab.</p>
    {/if}
    <section>
      <h2>Categories</h2>
      <div class="cats">
        {#each LINT_CATEGORIES as cat}
          <label class="cat">
            <input
              type="checkbox"
              checked={isCategoryEnabled(settings, cat)}
              onchange={(e) => setCategory(cat, (e.currentTarget as HTMLInputElement).checked)}
            />
            <span>{cat}</span>
          </label>
        {/each}
      </div>
    </section>
    <section>
      <h2>Dictionary</h2>
      {#if settings.dictionary.length === 0}
        <p class="muted">No words yet. Add words from a suggestion card.</p>
      {:else}
        <ul class="dict">
          {#each settings.dictionary as word}
            <li><span>{word}</span><button aria-label="Remove" onclick={() => deleteWord(word)}>×</button></li>
          {/each}
        </ul>
      {/if}
    </section>
  {:else}
    <p class="muted">Loading…</p>
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
