import { describe, it, expect } from 'vitest';
import { computeCardPosition, type Box } from '../src/ui/card-position';

const viewport = { width: 1000, height: 800 };
const card = { width: 260, height: 120 };

describe('computeCardPosition', () => {
  it('places the card just below the anchor, left-aligned', () => {
    const anchor: Box = { left: 100, top: 100, width: 40, height: 16 };
    const pos = computeCardPosition(anchor, card, viewport);
    expect(pos.left).toBe(100);
    expect(pos.top).toBe(116 + 6); // anchor bottom + gap
  });
  it('flips above the anchor when there is no room below', () => {
    const anchor: Box = { left: 100, top: 740, width: 40, height: 16 };
    const pos = computeCardPosition(anchor, card, viewport);
    expect(pos.top).toBe(740 - 120 - 6); // anchor top - card height - gap
  });
  it('clamps left so the card stays within the viewport', () => {
    const anchor: Box = { left: 900, top: 100, width: 40, height: 16 };
    const pos = computeCardPosition(anchor, card, viewport);
    expect(pos.left).toBe(1000 - 260 - 4); // viewport width - card width - margin
  });
  it('never returns a negative left', () => {
    const anchor: Box = { left: -50, top: 100, width: 10, height: 16 };
    const pos = computeCardPosition(anchor, card, viewport);
    expect(pos.left).toBeGreaterThanOrEqual(4);
  });
});
