import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LintResponse } from '../src/core/providers/harper-messages';
import { fakeBrowser } from 'wxt/testing';
import { HarperProvider } from '../src/core/providers/harper-provider';

// WxtVitest aliases `wxt/browser` → the virtual `mock-browser` module, which
// re-exports `fakeBrowser` from `@webext-core/fake-browser`.  The provider's
// `import { browser } from 'wxt/browser'` therefore resolves to the same
// `fakeBrowser` object, so spying on `fakeBrowser.runtime` directly controls
// what the provider sees.
//
// Mocking mechanism notes:
// - `vi.spyOn` is created fresh in `beforeEach` and restored in `afterEach`.
//   A module-level spy + `mockReset()` does NOT work: after mockReset the spy
//   falls through to fakeBrowser's original sendMessage, which Vitest 4 tracks
//   as a second rejection source — even when the provider catches it.
// - For the rejection test, `mockImplementation(async () => { throw … })` is
//   used instead of `mockRejectedValue(new Error(…))`.  Vitest 4 tracks all
//   `Promise.reject()` / `new Error()` creation sites and marks them as
//   "unhandled" if not consumed in the same microtask frame — `async throw`
//   creates the rejection lazily (when the function is called and awaited),
//   so it is consumed immediately and no false-positive fires.
// fakeBrowser.runtime's typed key union doesn't admit 'sendMessage' as a spy
// target, so cast the target — the spy still controls the real method at runtime.
let sendMessage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sendMessage = vi.spyOn(fakeBrowser.runtime as never, 'sendMessage');
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('HarperProvider (remote client)', () => {
  it('sends the correct message shape', async () => {
    sendMessage.mockResolvedValue({ ok: true, lints: [] } satisfies LintResponse);
    await new HarperProvider().check('hello', { fieldType: 'textarea', language: 'en' });
    expect(sendMessage).toHaveBeenCalledWith({ type: 'inkly:harper:lint', text: 'hello' });
  });

  it('maps returned PlainLints to Suggestions', async () => {
    sendMessage.mockResolvedValue({
      ok: true,
      lints: [{ start: 0, end: 3, replacements: ['the'], message: 'Spelling', kind: 'Spelling', ruleName: 'SpellCheck' }],
    } satisfies LintResponse);
    const out = await new HarperProvider().check('teh cat', { fieldType: 'textarea', language: 'en' });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ offset: 0, length: 3, source: 'harper', severity: 'correctness' });
  });

  it('returns [] when the backend reports an error (never throws)', async () => {
    sendMessage.mockResolvedValue({ ok: false, error: 'boom' } satisfies LintResponse);
    const out = await new HarperProvider().check('x', { fieldType: 'input', language: 'en' });
    expect(out).toEqual([]);
  });

  it('returns [] if the message round-trip rejects', async () => {
    sendMessage.mockImplementation(async () => { throw new Error('disconnected'); });
    const out = await new HarperProvider().check('x', { fieldType: 'input', language: 'en' });
    expect(out).toEqual([]);
  });
});
