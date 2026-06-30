import { describe, it, expect } from 'vitest';
import { diffEdits } from '../src/core/ai/diff-edits';

const apply = (s: string, edits: ReturnType<typeof diffEdits>) => {
  // apply right-to-left so earlier offsets stay valid
  let out = s;
  for (const e of [...edits].sort((a, b) => b.offset - a.offset)) {
    out = out.slice(0, e.offset) + e.replacement + out.slice(e.offset + e.length);
  }
  return out;
};

describe('diffEdits', () => {
  it('returns no edits for identical text', () => {
    expect(diffEdits('hello world', 'hello world')).toEqual([]);
  });

  it('captures a single replaced word', () => {
    const edits = diffEdits('I teh cat', 'I the cat');
    expect(edits).toHaveLength(1);
    expect(edits[0].replacement).toBe('the');
    expect('I teh cat'.slice(edits[0].offset, edits[0].offset + edits[0].length)).toBe('teh');
  });

  it('collapses a multi-word correction into one span', () => {
    const a = 'I waz have been in Santos last week';
    const b = 'I was in Santos last week';
    const edits = diffEdits(a, b);
    expect(edits).toHaveLength(1);
    expect('I '.length).toBe(edits[0].offset); // change starts after "I "
    expect(apply(a, edits)).toBe(b);
  });

  it('captures two separate edits in one sentence', () => {
    const a = 'I has a apple';
    const b = 'I have an apple';
    const edits = diffEdits(a, b);
    expect(edits.length).toBe(2);
    expect(apply(a, edits)).toBe(b);
  });

  it('handles an insertion (missing word)', () => {
    const a = 'go to store';
    const b = 'go to the store';
    expect(apply(a, diffEdits(a, b))).toBe(b);
  });

  it('handles a deletion (extra word)', () => {
    const a = 'I was have been here';
    const b = 'I was here';
    expect(apply(a, diffEdits(a, b))).toBe(b);
  });

  it('handles a trailing insertion (missing end mark)', () => {
    const a = 'Hello there';
    const b = 'Hello there.';
    const edits = diffEdits(a, b);
    expect(apply(a, edits)).toBe(b);
  });
});
