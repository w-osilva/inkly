import { browser } from 'wxt/browser';
import { Provider, ProviderContext, Suggestion } from '../types';
import { LintRequest, LintResponse } from './harper-messages';
import { plainLintToSuggestion } from './harper-mapping';

/**
 * Remote HarperProvider: the real engine runs in the offscreen document
 * (src/entrypoints/offscreen/main.ts). This client messages the service worker
 * and maps the result. Always-active, local, English.
 *
 * Degrades gracefully: any messaging/engine failure resolves to [] (no
 * suggestions) rather than throwing — the pipeline must never break the page.
 */
export class HarperProvider implements Provider {
  readonly source = 'harper' as const;

  async check(text: string, _ctx: ProviderContext): Promise<Suggestion[]> {
    const req: LintRequest = { type: 'inkly:harper:lint', text };
    let res: LintResponse | undefined;
    try {
      res = (await browser.runtime.sendMessage(req)) as LintResponse;
    } catch {
      return [];
    }
    if (!res || res.ok !== true) return [];
    return res.lints.map(plainLintToSuggestion);
  }
}
