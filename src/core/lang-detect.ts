/**
 * Lightweight language signal for a field, from the page's own declared language
 * (`lang` attribute). Used to gate English-only engines (Harper, the Chrome Proofreader)
 * so they don't pollute non-English text with bogus spelling/grammar flags — LanguageTool
 * (which auto-detects) handles those languages instead.
 */

/** True when a BCP-47 tag is English — or empty/unknown, in which case we assume English. */
export function isEnglishLang(tag: string | null | undefined): boolean {
  const t = (tag || '').trim().toLowerCase();
  return t === '' || t === 'en' || t.startsWith('en-') || t.startsWith('en_');
}

/** The declared language for an element: nearest [lang] ancestor, else the document's <html lang>. */
export function fieldLangTag(el: Element): string {
  const node = el.closest('[lang]');
  const fromAttr = node?.getAttribute('lang');
  return (fromAttr || el.ownerDocument?.documentElement.getAttribute('lang') || '').trim();
}
