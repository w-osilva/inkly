import { AIRequest } from './ai-types';
import { buildMessages } from './prompts';

interface LanguageModelLike {
  availability: () => Promise<string>;
  create: (opts?: unknown) => Promise<{ prompt: (text: string) => Promise<string>; destroy?: () => void }>;
}

export type BuiltinStatus = 'available' | 'downloadable' | 'unavailable';

/**
 * Report the Chrome built-in AI (Prompt API) status for the options UI, without
 * triggering a model download. 'available' = ready on-device now; 'downloadable' =
 * supported but the model would download on first use; 'unavailable' = no built-in AI
 * in this browser. Never throws. `g` is injectable for tests.
 */
export async function builtinAvailability(g: typeof globalThis = globalThis): Promise<BuiltinStatus> {
  const LM = (g as unknown as { LanguageModel?: LanguageModelLike }).LanguageModel;
  if (!LM?.availability) return 'unavailable';
  try {
    const a = await LM.availability();
    if (a === 'available' || a === 'readily') return 'available';
    if (a === 'downloadable' || a === 'downloading' || a === 'after-download') return 'downloadable';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Opportunistic Chrome built-in AI (Prompt API). Returns the model's text when
 * the API is present AND ready on `g` (the offscreen doc's global); otherwise
 * null so the caller falls back to BYOK. Never throws. `g` is injectable for tests.
 */
export async function tryChromeAI(req: AIRequest, g: typeof globalThis = globalThis): Promise<string | null> {
  const LM = (g as unknown as { LanguageModel?: LanguageModelLike }).LanguageModel;
  if (!LM?.availability) return null;
  try {
    const avail = await LM.availability();
    if (avail !== 'available' && avail !== 'readily') return null; // don't trigger downloads
    const messages = buildMessages(req);
    const system = messages.find((m) => m.role === 'system')?.content;
    const user = messages.find((m) => m.role === 'user')?.content ?? req.text;
    const session = await LM.create(system ? { initialPrompts: [{ role: 'system', content: system }] } : {});
    try {
      const out = await session.prompt(user);
      return typeof out === 'string' ? out.trim() : null;
    } finally {
      session.destroy?.();
    }
  } catch {
    return null;
  }
}
