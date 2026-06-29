import type { Suggestion } from '../types';

/** Structured-cloneable projection of a Harper Lint (mapped inside the offscreen doc). */
export interface PlainLint {
  start: number;          // character index (inclusive)
  end: number;            // character index (exclusive)
  replacements: string[]; // suggestion replacement texts ('' == Harper Remove)
  message: string;
  kind: string;           // lint.lint_kind(), e.g. "Spelling", "Agreement"
  ruleName: string;       // organizedLints key — per-rule PascalCase name (SpellCheck, ToTwoToo, …)
}

/** Content script → service worker. */
export interface LintRequest { type: 'inkly:harper:lint'; text: string; }
/** Service worker → offscreen. */
export interface OffscreenLintRequest { target: 'offscreen'; type: 'harper:lint'; text: string; }
/** Offscreen/SW → caller. `extra` carries already-mapped suggestions from on-device
 * sources that run alongside Harper (e.g. the Proofreader API), merged by the client. */
export type LintResponse =
  | { ok: true; lints: PlainLint[]; extra?: Suggestion[] }
  | { ok: false; error: string };
