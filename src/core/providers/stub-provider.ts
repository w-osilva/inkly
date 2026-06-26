import { Provider, ProviderContext, Suggestion, makeSuggestion } from '../types';

/**
 * Temporary provider so the pipeline is end-to-end testable before Harper (M2).
 * Flags the misspelling "teh" → "the". Replaced by HarperProvider in M2.
 */
export class StubProvider implements Provider {
  readonly source = 'stub' as const;

  async check(text: string, _ctx: ProviderContext): Promise<Suggestion[]> {
    const out: Suggestion[] = [];
    const re = /\bteh\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push(
        makeSuggestion({
          offset: m.index,
          length: 3,
          replacements: ['the'],
          message: 'Possible spelling mistake: "teh" → "the".',
          ruleId: 'STUB_TEH',
          category: 'Typo',
          source: 'stub',
        }),
      );
    }
    return out;
  }
}
