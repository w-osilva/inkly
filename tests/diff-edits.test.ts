import { describe, it, expect } from 'vitest';
import { diffEdits, preservesContent, createsRepeat } from '../src/core/ai/diff-edits';

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
    expect(preservesContent(a, edits[0])).toBe(true);
  });
});

describe('preservesContent', () => {
  const a = 'I had been in Santos before I went to Greece';
  it('rejects an edit that deletes a proper noun', () => {
    expect(preservesContent(a, diffEdits(a, 'I had been in Santos before I went to')[0])).toBe(false);
  });
  it('rejects swapping a proper noun for another', () => {
    expect(preservesContent(a, diffEdits(a, 'I had been in Santos before I went to Italy')[0])).toBe(false);
  });
  it('rejects dropping a number', () => {
    const src = 'I paid 250 dollars';
    expect(preservesContent(src, diffEdits(src, 'I paid dollars')[0])).toBe(false);
  });
  it('rejects dropping a common content word', () => {
    const src = 'I would like as car';
    expect(preservesContent(src, diffEdits(src, 'I would like a')[0])).toBe(false); // drops "car"
  });
  it('allows deleting only function/auxiliary words', () => {
    const src = 'I was have been in Greece';
    expect(preservesContent(src, diffEdits(src, 'I was in Greece')[0])).toBe(true); // drops "have been"
  });
  it('allows a same-length substitution of a content word', () => {
    const src = 'He runned fast';
    expect(preservesContent(src, diffEdits(src, 'He ran fast')[0])).toBe(true); // runned → ran
  });
});

describe('createsRepeat', () => {
  it('rejects an edit that introduces a doubled word', () => {
    const src = 'I would like as car';
    const edit = diffEdits(src, 'I would like as car car')[0];
    expect(createsRepeat(src, edit)).toBe(true);
  });
  it('allows an edit with no new repetition', () => {
    const src = 'I teh cat';
    expect(createsRepeat(src, diffEdits(src, 'I the cat')[0])).toBe(false);
  });
});
