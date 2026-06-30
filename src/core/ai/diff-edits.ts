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

  const edits: Edit[] = [];
  let i = 0, j = 0;
  const pushEdit = (ai0: number, ai1: number, bj0: number, bj1: number) => {
    const offset = ai0 < n ? A[ai0].start : original.length;
    const end = ai1 > ai0 ? A[ai1 - 1].start + A[ai1 - 1].text.length : offset;
    const replacement = B.slice(bj0, bj1).map((t) => t.text).join('');
    if (end - offset > 0 || replacement.length > 0) edits.push({ offset, length: end - offset, replacement });
  };

  while (i < n && j < mlen) {
    if (A[i].text === B[j].text) { i++; j++; continue; }
    // Walk the changed run until the sequences realign (greedy along the LCS).
    const ai0 = i, bj0 = j;
    while (i < n && j < mlen && A[i].text !== B[j].text) {
      if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    pushEdit(ai0, i, bj0, j);
  }
  // Tail: deletion (A left over) or insertion (B left over).
  if (i < n || j < mlen) pushEdit(i, n, j, mlen);
  return edits;
}
