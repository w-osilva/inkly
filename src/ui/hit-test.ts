export interface HitRect {
  index: number; // index into the current suggestions array
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Index of the first rect containing (x,y) in viewport coords, or -1. */
export function findHitIndex(x: number, y: number, rects: HitRect[]): number {
  for (const r of rects) {
    if (x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height) {
      return r.index;
    }
  }
  return -1;
}
