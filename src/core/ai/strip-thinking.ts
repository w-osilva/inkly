/**
 * Remove a reasoning model's chain-of-thought from its output. Models like Qwen3 (thinking
 * mode on by default in Ollama) emit a `<think>…</think>` block before the real answer; left
 * in, it pollutes plain results and breaks JSON parsing (the payload no longer starts with
 * `[`/`{`). Strips complete blocks, and also handles a lone trailing `</think>` (when the
 * opening tag was suppressed but the reasoning still streamed before it).
 */
export function stripThinking(text: string): string {
  if (!text) return text;
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // A stray close tag means everything before it was reasoning — drop it.
  const close = out.toLowerCase().lastIndexOf('</think>');
  if (close !== -1) out = out.slice(close + '</think>'.length);
  return out.trim();
}
