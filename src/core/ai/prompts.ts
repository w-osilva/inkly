import { AIRequest } from './ai-types';

export interface ChatMessage { role: 'system' | 'user'; content: string; }

/** Build chat messages for an AI request. M3a-1 covers 'rewrite'; others land in M3c. */
export function buildMessages(req: AIRequest): ChatMessage[] {
  if (req.capability === 'rewrite') {
    const tone = req.options?.tone;
    const toneClause = tone ? ` Use a ${tone} tone.` : '';
    const length = req.options?.length;
    const lengthClause =
      length === 'shorter' ? ' Make it shorter and more concise.'
      : length === 'longer' ? ' Make it longer and more detailed.'
      : '';
    const system =
      "You are a writing assistant. Rewrite the user's text to be clear and correct," +
      ' preserving its meaning and language.' +
      toneClause +
      lengthClause +
      ' Return ONLY the rewritten text, with no quotes, preamble, or explanation.';
    return [
      { role: 'system', content: system },
      { role: 'user', content: req.text },
    ];
  }
  if (req.capability === 'translate') {
    const target = req.options?.targetLang || "the user's language";
    const system =
      `You are a translator. Translate the user's text into ${target}.` +
      ' Preserve meaning, tone, and formatting.' +
      ' Return ONLY the translation, with no quotes, preamble, or explanation.';
    return [
      { role: 'system', content: system },
      { role: 'user', content: req.text },
    ];
  }
  if (req.capability === 'synonyms') {
    const system =
      "You are a thesaurus. Provide synonyms for the user's word or phrase." +
      ' Return ONLY a comma-separated list of up to 6 alternatives, no numbering, no explanation.';
    return [{ role: 'system', content: system }, { role: 'user', content: req.text }];
  }
  if (req.capability === 'analyze') {
    const system =
      "You are a writing coach. Analyze the user's text and give brief, concrete feedback" +
      ' on clarity, tone, and any issues, in 1-3 short sentences. Do not rewrite it.';
    return [{ role: 'system', content: system }, { role: 'user', content: req.text }];
  }
  // Other capabilities are added in M3c. Fall back to a generic instruction.
  return [
    { role: 'system', content: 'You are a writing assistant. Return only the result text.' },
    { role: 'user', content: req.text },
  ];
}
