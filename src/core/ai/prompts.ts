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
      "You are a thesaurus. For the user's word or phrase, group alternatives by sense/meaning." +
      ' Return ONLY a JSON array of objects {"sense","synonyms"}, where "sense" is a 2-4 word' +
      ' definition of that meaning and "synonyms" is an array of up to 4 alternatives.' +
      ' At most 4 groups, most common first. No prose, no code fences.';
    return [{ role: 'system', content: system }, { role: 'user', content: req.text }];
  }
  if (req.capability === 'improve') {
    const tone = req.options?.tone;
    const toneClause = tone ? ` Prefer phrasing that sounds ${tone}.` : '';
    const system =
      "You are a careful writing assistant. Read the user's text in context and find spans to fix or improve:" +
      ' grammar, subject/verb and article agreement, wrong word choice, awkward or unclear phrasing.' +
      toneClause +
      ' Return ONLY a JSON array of objects {"original","improved","reason"}, where "original" is an EXACT' +
      ' substring of the input and "improved" is the corrected replacement; "reason" is a short phrase' +
      ' (e.g. "article agreement"). Suggest at most 6, most important first. If nothing should change, return [].';
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
