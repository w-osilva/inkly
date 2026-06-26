/** Structured-cloneable projection of a Harper Lint (mapped inside the offscreen doc). */
export interface PlainLint {
  start: number;          // character index (inclusive)
  end: number;            // character index (exclusive)
  replacements: string[]; // suggestion replacement texts ('' == Harper Remove)
  message: string;
  kind: string;           // lint.lint_kind(), e.g. "Spelling", "Agreement"
}

/** Content script → service worker. */
export interface LintRequest { type: 'inkly:harper:lint'; text: string; }
/** Service worker → offscreen. */
export interface OffscreenLintRequest { target: 'offscreen'; type: 'harper:lint'; text: string; }
/** Offscreen/SW → caller. */
export type LintResponse =
  | { ok: true; lints: PlainLint[] }
  | { ok: false; error: string };
