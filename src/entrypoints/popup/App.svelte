<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from 'wxt/browser';
  import { getSettings, setSettings, hostOf, isEnabledForHost, DEFAULT_SETTINGS, type Settings } from '../../core/settings';

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
  {:else}
    <p class="muted">Loading…</p>
  {/if}
</main>

<style>
  main { width: 260px; padding: 14px 16px; font: 14px/1.4 -apple-system, system-ui, sans-serif; }
  h1 { margin: 0 0 12px; font-size: 16px; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; }
  .row.disabled { opacity: 0.5; }
  .row span { flex: 1; }
  .muted { color: #888; }
</style>
