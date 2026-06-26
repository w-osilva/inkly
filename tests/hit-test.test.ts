import { describe, it, expect } from 'vitest';
import { findHitIndex, type HitRect } from '../src/ui/hit-test';

const items: HitRect[] = [
  { index: 0, left: 10, top: 10, width: 40, height: 16 }, // x:10..50 y:10..26
  { index: 1, left: 100, top: 40, width: 30, height: 16 }, // x:100..130 y:40..56
];

describe('findHitIndex', () => {
  it('returns the index whose rect contains the point', () => {
    expect(findHitIndex(20, 18, items)).toBe(0);
    expect(findHitIndex(110, 50, items)).toBe(1);
  });
  it('returns -1 when no rect contains the point', () => {
    expect(findHitIndex(70, 18, items)).toBe(-1);
    expect(findHitIndex(20, 100, items)).toBe(-1);
  });
  it('includes the rect edges (inclusive bounds)', () => {
    expect(findHitIndex(10, 10, items)).toBe(0);
    expect(findHitIndex(50, 26, items)).toBe(0);
  });
  it('returns the first match when rects overlap', () => {
    const overlap: HitRect[] = [
      { index: 5, left: 0, top: 0, width: 100, height: 100 },
      { index: 6, left: 10, top: 10, width: 10, height: 10 },
    ];
    expect(findHitIndex(15, 15, overlap)).toBe(5);
  });
});
