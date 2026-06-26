import { AIRequest } from './ai-types';

export interface ChatMessage { role: 'system' | 'user'; content: string; }

/** Build chat messages for an AI request. M3a-1 covers 'rewrite'; others land in M3c. */
export function buildMessages(req: AIRequest): ChatMessage[] {
  if (req.capability === 'rewrite') {
    const tone = req.options?.tone;
    const toneClause = tone ? ` Use a ${tone} tone.` : '';
    const system =
      "You are a writing assistant. Rewrite the user's text to be clear and correct," +
      ' preserving its meaning and language.' +
      toneClause +
      ' Return ONLY the rewritten text, with no quotes, preamble, or explanation.';
    return [
      { role: 'system', content: system },
      { role: 'user', content: req.text },
    ];
  }
  // Other capabilities are added in M3c. Fall back to a generic instruction.
  return [
    { role: 'system', content: 'You are a writing assistant. Return only the result text.' },
    { role: 'user', content: req.text },
  ];
}
