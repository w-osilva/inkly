import { AIRequest } from './ai-types';

interface TranslatorLike {
  availability: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (opts: { sourceLanguage: string; targetLanguage: string }) => Promise<{
    translate: (text: string) => Promise<string>;
    destroy?: () => void;
  }>;
}
interface LanguageDetectorLike {
  create: () => Promise<{
    detect: (text: string) => Promise<Array<{ detectedLanguage: string; confidence: number }>>;
    destroy?: () => void;
  }>;
}

/** Map inkly's human target ("Portuguese"/"English") to a BCP-47 base code. */
function targetCode(targetLang: string | undefined): 'pt' | 'en' {
  return targetLang === 'Portuguese' ? 'pt' : 'en';
}

/**
 * Opportunistic on-device translation via Chrome's built-in Translator API
 * (free, local, no key). Returns the translated text when the API is present and a
 * model is available for the pair; otherwise null so the caller falls back to BYOK.
 * Source language is detected with the Language Detector API when present, else the
 * non-target language is assumed. Never throws. `g` is injectable for tests.
 */
export async function tryChromeTranslate(req: AIRequest, g: typeof globalThis = globalThis): Promise<string | null> {
  const Translator = (g as unknown as { Translator?: TranslatorLike }).Translator;
  if (!Translator?.availability) return null;
  try {
    const targetLanguage = targetCode(req.options?.targetLang);
    let sourceLanguage: string = targetLanguage === 'pt' ? 'en' : 'pt';
    const LD = (g as unknown as { LanguageDetector?: LanguageDetectorLike }).LanguageDetector;
    if (LD?.create) {
      try {
        const det = await LD.create();
        try {
          const results = await det.detect(req.text);
          const top = results?.[0]?.detectedLanguage;
          if (top && top !== 'und') sourceLanguage = top.split('-')[0];
        } finally {
          det.destroy?.();
        }
      } catch { /* detection optional */ }
    }
    if (sourceLanguage === targetLanguage) return null; // already in the target language
    const avail = await Translator.availability({ sourceLanguage, targetLanguage });
    // Only use a ready model — never trigger a download here (mirrors the Prompt API path);
    // anything but 'available' falls back to BYOK so we don't hang on a download.
    if (avail !== 'available') return null;
    const translator = await Translator.create({ sourceLanguage, targetLanguage });
    try {
      const out = await translator.translate(req.text);
      return typeof out === 'string' ? out : null;
    } finally {
      translator.destroy?.();
    }
  } catch {
    return null;
  }
}
