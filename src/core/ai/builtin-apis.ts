import type { AIRequest } from './ai-types';

/**
 * Chromium's on-device "Writing Assistance" APIs (Gemini Nano): Rewriter, Writer,
 * Proofreader, Summarizer, plus the Prompt API (LanguageModel) and Translator. These are
 * web-platform globals — present only on browsers that ship them AND where the model is
 * downloaded. Everything here is best-effort + feature-detected: when an API or its model
 * is absent, callers fall back (Prompt API → BYOK). The deterministic grammar layer
 * (Harper) is never gated on any of this. `g` is injectable for tests.
 *
 * Origin-trial APIs (Rewriter/Writer/Proofreader) may change signature; calls are wrapped
 * so a mismatch degrades to a silent fallback rather than throwing.
 */
export type BuiltinStatus = 'available' | 'downloadable' | 'unavailable';

export type BuiltinCapability =
  | 'languageModel' | 'rewriter' | 'writer' | 'proofreader' | 'summarizer';

/** Global constructor name for each capability (the API surface, e.g. `self.Rewriter`). */
const GLOBAL_NAME: Record<BuiltinCapability, string> = {
  languageModel: 'LanguageModel',
  rewriter: 'Rewriter',
  writer: 'Writer',
  proofreader: 'Proofreader',
  summarizer: 'Summarizer',
};

interface AvailabilityLike { availability: (opts?: unknown) => Promise<string> }

/** Normalize the spec's availability strings (which have varied across versions). */
function normalize(a: string): BuiltinStatus {
  if (a === 'available' || a === 'readily') return 'available';
  if (a === 'downloadable' || a === 'downloading' || a === 'after-download') return 'downloadable';
  return 'unavailable';
}

/** Report a capability's status without triggering a model download. Never throws. */
export async function apiAvailability(
  cap: BuiltinCapability,
  g: typeof globalThis = globalThis,
): Promise<BuiltinStatus> {
  const Ctor = (g as unknown as Record<string, AvailabilityLike | undefined>)[GLOBAL_NAME[cap]];
  if (!Ctor?.availability) return 'unavailable';
  try {
    return normalize(await Ctor.availability());
  } catch {
    return 'unavailable';
  }
}

/** Detect every Writing Assistance capability at once (for the options status banner). */
export async function detectBuiltins(g: typeof globalThis = globalThis): Promise<Record<BuiltinCapability, BuiltinStatus>> {
  const caps = Object.keys(GLOBAL_NAME) as BuiltinCapability[];
  const entries = await Promise.all(caps.map(async (c) => [c, await apiAvailability(c, g)] as const));
  return Object.fromEntries(entries) as Record<BuiltinCapability, BuiltinStatus>;
}

// inkly's rich tone set maps onto the Rewriter API's three structured tones; the precise
// nuance (confident/technical/…) is carried in the context string so it isn't lost.
function mapTone(tone?: string): 'as-is' | 'more-formal' | 'more-casual' {
  if (tone === 'formal' || tone === 'professional' || tone === 'technical' || tone === 'confident') return 'more-formal';
  if (tone === 'casual' || tone === 'friendly') return 'more-casual';
  return 'as-is';
}
function mapLength(length?: string): 'as-is' | 'shorter' | 'longer' {
  return length === 'shorter' || length === 'longer' ? length : 'as-is';
}

interface RewriterLike {
  availability: () => Promise<string>;
  create: (opts?: unknown) => Promise<{ rewrite: (text: string, opts?: unknown) => Promise<string>; destroy?: () => void }>;
}

/**
 * On-device rewrite via the Rewriter API. Returns the rewritten text when the API is
 * present AND ready; otherwise null so the caller falls back (Prompt API → BYOK). The
 * shared context keeps it a faithful rewrite (preserve meaning; don't answer the text).
 */
export async function tryChromeRewrite(req: AIRequest, g: typeof globalThis = globalThis): Promise<string | null> {
  const R = (g as unknown as { Rewriter?: RewriterLike }).Rewriter;
  if (!R?.availability) return null;
  const context =
    'Rewrite the text while preserving its original meaning and intent. ' +
    'Do not answer, reply to, or add information — only rephrase.' +
    (req.options?.tone ? ` Target tone: ${req.options.tone}.` : '');
  try {
    if (normalize(await R.availability()) !== 'available') return null; // don't trigger downloads
    const rewriter = await R.create({
      tone: mapTone(req.options?.tone),
      length: mapLength(req.options?.length),
      format: 'plain-text',
      sharedContext: context,
    });
    try {
      const out = await rewriter.rewrite(req.text, { context });
      return typeof out === 'string' && out.trim() ? out.trim() : null;
    } finally {
      rewriter.destroy?.();
    }
  } catch {
    return null;
  }
}
