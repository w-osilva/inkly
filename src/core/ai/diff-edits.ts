/**
 * Turn a "minimally corrected" version of a text into precise, targeted edits against the
 * original — so an LLM that rewrites the whole sentence (a task it does well) yields surgical
 * underlines instead of one giant span. Word/whitespace-level LCS keeps the unchanged parts
 * aligned and groups each changed run into a single {offset, length, replacement} edit.
 */
export interface Edit {
  offset: number;
  length: number;
  replacement: string;
}

interface Tok { text: string; start: number; }

function tokenize(s: string): Tok[] {
  const toks: Tok[] = [];
  const re = /\s+|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) toks.push({ text: m[0], start: m.index });
  return toks;
}

export function diffEdits(original: string, corrected: string): Edit[] {
  if (original === corrected) return [];
  const A = tokenize(original);
  const B = tokenize(corrected);
  const n = A.length, mlen = B.length;

  // LCS length table over token text (dp[i][j] = LCS of A[i..], B[j..]).
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(mlen + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = mlen - 1; j >= 0; j--) {
      dp[i][j] = A[i].text === B[j].text ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Standard LCS walk → a stream of match/delete/insert ops over tokens.
  type Op = { kind: 'match'; a: number } | { kind: 'del'; a: number } | { kind: 'ins'; b: number };
  const ops: Op[] = [];
  let i = 0, j = 0;
  while (i < n && j < mlen) {
    if (A[i].text === B[j].text) { ops.push({ kind: 'match', a: i }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ kind: 'del', a: i }); i++; }
    else { ops.push({ kind: 'ins', b: j }); j++; }
  }
  while (i < n) { ops.push({ kind: 'del', a: i }); i++; }
  while (j < mlen) { ops.push({ kind: 'ins', b: j }); j++; }

  // Coalesce each run of adjacent del/ins into one edit; a `replacement` paired with a deleted
  // span becomes a clean replace ("Greece" → "Greece."), not a delete + a stray insert.
  const edits: Edit[] = [];
  let pending: Edit | null = null;
  let aPos = 0; // char offset in `original` just past the last matched/deleted token
  const flush = () => {
    if (pending && (pending.length > 0 || pending.replacement.length > 0)) edits.push(pending);
    pending = null;
  };
  for (const op of ops) {
    if (op.kind === 'match') {
      flush();
      aPos = A[op.a].start + A[op.a].text.length;
    } else if (op.kind === 'del') {
      const tok = A[op.a];
      if (!pending) pending = { offset: tok.start, length: 0, replacement: '' };
      pending.length = tok.start + tok.text.length - pending.offset;
      aPos = tok.start + tok.text.length;
    } else {
      if (!pending) pending = { offset: aPos, length: 0, replacement: '' };
      pending.replacement += B[op.b].text;
    }
  }
  flush();
  return edits;
}

/**
 * Guard against a weak model destroying meaning: reject an edit that drops a proper noun or a
 * number the user wrote (e.g. "…went to Greece" → "…went to"). An entity is "kept" only if it
 * still appears in the replacement. Lowercase words and function words are fair game.
 */
export function preservesEntities(original: string, e: Edit): boolean {
  const removed = original.slice(e.offset, e.offset + e.length);
  const entities = removed.match(/\b[A-Z][\w']*|\d[\d.,]*/g) ?? [];
  return entities.every((t) => e.replacement.includes(t));
}
