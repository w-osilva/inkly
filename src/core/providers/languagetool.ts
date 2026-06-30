import { type Suggestion, makeSuggestion } from '../types';
import { normalizeCategory } from '../lint-categories';

/**
 * LanguageTool provider (open-source grammar/style/punctuation engine). Opt-in: the user
 * enables it and the text is sent to a LanguageTool server — the free public API
 * (api.languagetool.org) by default, or a self-hosted instance for full privacy. Fetched
 * from the service worker (host_permissions for the public API; a self-hosted server must
 * allow the extension origin via CORS). Degrades to [] on any error — never breaks a check.
 *
 * Maps LanguageTool's `issueType` onto inkly categories so severityFor() colours objective
 * fixes (spelling/punctuation/grammar) as correctness. Source 'languagetool' (priority 3)
 * sits below Harper, so Harper wins overlaps and LanguageTool fills the gaps.
 */
interface LTMatch {
  offset: number;
  length: number;
  message?: string;
  shortMessage?: string;
  replacements?: Array<{ value?: string }>;
  rule?: { id?: string; issueType?: string; category?: { name?: string } };
}

// Normalise LanguageTool's `issueType` (ITS standard) into inkly's canonical taxonomy,
// falling back to the rule's category name, then Grammar.
function categoryFor(issueType?: string, fallback?: string): string {
  if (issueType) return normalizeCategory(issueType);
  return normalizeCategory(fallback);
}

/** Run a LanguageTool check. `endpoint` is the API base (…/v2); we POST to {endpoint}/check. */
export async function checkLanguageTool(
  text: string,
  endpoint: string,
  language = 'auto',
  fetchFn: typeof fetch = fetch,
  level: 'default' | 'picky' = 'default',
): Promise<Suggestion[]> {
  if (!text.trim() || !endpoint) return [];
  const url = `${endpoint.replace(/\/+$/, '')}/check`;
  const body = new URLSearchParams({ text, language, level });
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { matches?: LTMatch[] };
    // LanguageTool is the strong base: it covers grammar, spelling, punctuation AND
    // style/word-choice. The AI "improve" layer is a fallback/on-demand complement, so we
    // surface all of LanguageTool's match types here.
    return (data.matches ?? []).map((m) =>
      makeSuggestion({
        offset: m.offset,
        length: m.length,
        replacements: (m.replacements ?? []).map((r) => r.value ?? '').filter((v) => v !== undefined).slice(0, 6),
        message: m.shortMessage || m.message || 'LanguageTool suggestion.',
        ruleId: m.rule?.id || 'LanguageTool',
        category: categoryFor(m.rule?.issueType, m.rule?.category?.name),
        source: 'languagetool',
      }),
    );
  } catch {
    return [];
  }
}
