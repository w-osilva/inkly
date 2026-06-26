import { browser } from 'wxt/browser';
import { AIRequest, AIResponse } from './ai-types';

/** Run an AI request via the service worker → offscreen. Never throws; returns an AIResponse. */
export async function runAI(request: AIRequest): Promise<AIResponse> {
  try {
    const res = (await browser.runtime.sendMessage({ type: 'inkly:ai:run', request })) as AIResponse;
    return res ?? { ok: false, error: 'no response' };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}
