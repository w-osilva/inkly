/** Split an accumulating SSE buffer into complete events (by blank line) + the trailing remainder. */
export function splitSSE(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  return { events: parts.map((p) => p.trim()).filter(Boolean), rest };
}

/** Extract the assistant content delta from one SSE event; null for [DONE]/comments/malformed/no-content. */
export function deltaFromEvent(event: string): string | null {
  const line = event.split('\n').find((l) => l.startsWith('data:'));
  if (!line) return null;
  const data = line.slice(5).trim();
  if (data === '[DONE]' || data === '') return null;
  try {
    const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> };
    const content = json.choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}
