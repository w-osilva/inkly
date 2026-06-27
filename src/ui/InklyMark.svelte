<script lang="ts">
  // The brand mark, traced from assets/brand/inkly.png (see scripts/build-brand.mjs).
  // Fill is currentColor, so it themes with the surrounding text color.
  import raw from './inkly-mark.svg?raw';
  let { size = 16 }: { size?: number } = $props();
</script>

<span class="inkly-mark" style="width:{size}px; height:{size}px;">{@html raw}</span>

<style>
  .inkly-mark { display: inline-flex; flex: none; line-height: 0; }
  .inkly-mark :global(svg) { width: 100%; height: 100%; display: block; }
</style>
