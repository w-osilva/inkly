import { describe, it, expect } from 'vitest';
import { diffEdits, preservesEntities } from '../src/core/ai/diff-edits';

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

  it('adds a final period after a proper noun without duplicating it', () => {
    const a = 'I went to Greece';
    const b = 'I went to Greece.';
    const edits = diffEdits(a, b);
    expect(edits).toHaveLength(1);
    expect(apply(a, edits)).toBe(b); // "Greece." — never "GreeceGreece."
    // the edit replaces "Greece" with "Greece.", so the entity is preserved
    expect(preservesEntities(a, edits[0])).toBe(true);
  });
});

describe('preservesEntities', () => {
  const a = 'I had been in Santos before I went to Greece';
  it('rejects an edit that deletes a proper noun', () => {
    // model "correction" drops "Greece"
    const edit = diffEdits(a, 'I had been in Santos before I went to')[0];
    expect(preservesEntities(a, edit)).toBe(false);
  });
  it('rejects an edit that swaps a proper noun for another', () => {
    const edit = diffEdits(a, 'I had been in Santos before I went to Italy')[0];
    expect(preservesEntities(a, edit)).toBe(false);
  });
  it('rejects dropping a number', () => {
    const src = 'I paid 250 dollars';
    const edit = diffEdits(src, 'I paid dollars')[0];
    expect(preservesEntities(src, edit)).toBe(false);
  });
  it('allows fixes that touch only lowercase/function words', () => {
    const src = 'I was have been in Greece';
    const edit = diffEdits(src, 'I was in Greece')[0]; // drops "have been" (no entities)
    expect(preservesEntities(src, edit)).toBe(true);
  });
});
