export interface Box { left: number; top: number; width: number; height: number; }
export interface Size { width: number; height: number; }
export interface Point { left: number; top: number; }

const GAP = 6;
const MARGIN = 4;

/** Position a card below the anchor, flipping above if needed, clamped to the viewport. */
export function computeCardPosition(anchor: Box, card: Size, viewport: Size): Point {
  const belowTop = anchor.top + anchor.height + GAP;
  const fitsBelow = belowTop + card.height <= viewport.height;
  const top = fitsBelow ? belowTop : anchor.top - card.height - GAP;

  let left = anchor.left;
  const maxLeft = viewport.width - card.width - MARGIN;
  if (left > maxLeft) left = maxLeft;
  if (left < MARGIN) left = MARGIN;

  return { left, top: Math.max(MARGIN, top) };
}
