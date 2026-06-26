/**
 * Map a character range [start, end) over `root`'s textContent to a DOM Range,
 * walking descendant text nodes in document order. Returns null if out of bounds.
 * (textContent === concatenation of SHOW_TEXT nodes in order, so offsets align.)
 */
export function offsetToRange(root: HTMLElement, start: number, end: number): Range | null {
  if (start < 0 || end < start) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (startNode === null && start <= pos + len) {
      startNode = node;
      startOffset = start - pos;
    }
    if (endNode === null && end <= pos + len) {
      endNode = node;
      endOffset = end - pos;
      break;
    }
    pos += len;
    node = walker.nextNode() as Text | null;
  }
  if (startNode === null || endNode === null) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}
