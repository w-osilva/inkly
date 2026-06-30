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

  // Merge edits separated only by whitespace WHEN one side is a pure insertion/deletion —
  // otherwise a single logical change like "bought" → "will buy" splits into "bought"→"will"
  // + insert "buy" (the space between them matched), surfacing as two incoherent suggestions.
  // Two independent word substitutions ("has"→"have", "a"→"an") stay separate.
  const isPure = (x: Edit) => x.length === 0 || x.replacement.length === 0;
  const merged: Edit[] = [];
  for (const e of edits) {
    const last = merged[merged.length - 1];
    const gap = last ? original.slice(last.offset + last.length, e.offset) : null;
    if (last && gap !== null && /^\s*$/.test(gap) && (isPure(last) || isPure(e))) {
      last.replacement += gap + e.replacement;
      last.length = e.offset + e.length - last.offset;
    } else {
      merged.push({ ...e });
    }
  }
  return merged;
}

// Function/auxiliary words a correction may legitimately delete (e.g. "I was have been" →
// "I was", "very nice" → "nice"). Anything else of 3+ letters is treated as content.
const DROPPABLE = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'and', 'or', 'but', 'as', 'so',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'that', 'this', 'very', 'really', 'just', 'quite', 'rather', 'then', 'also',
]);

const words = (s: string): string[] => s.match(/[\p{L}\d][\p{L}\d'’-]*/gu) ?? [];
const isEntity = (w: string): boolean => /^\p{Lu}/u.test(w) || /\d/.test(w); // proper noun or number

// Bounded Levenshtein (we only care about ≤ 2).
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
// A removed word was *corrected* (not dropped) if some added word is close to it ("waz"→"was").
function similar(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase();
  if (x === y) return true;
  const d = lev(x, y);
  return d <= 1 || (d <= 2 && Math.min(x.length, y.length) >= 4);
}

/**
 * Guard against a weak model destroying meaning. Substitutions and insertions are safe; a net
 * DELETION is only allowed when every dropped word is a function/auxiliary word. This rejects
 * "…went to Greece" → "…went to" (drops a name) and "I would like as car" → "I would like a"
 * (drops the noun "car"), while allowing "I was have been" → "I was" and "very nice" → "nice".
 */
export function preservesContent(original: string, e: Edit): boolean {
  const removed = words(original.slice(e.offset, e.offset + e.length));
  const added = words(e.replacement);
  if (added.length >= removed.length) {
    // No net loss → only block swapping a proper noun / number for something else.
    return removed.every((w) => !isEntity(w) || added.includes(w));
  }
  const addedSet = new Set(added.map((w) => w.toLowerCase()));
  for (const w of removed) {
    if (addedSet.has(w.toLowerCase())) continue;                // word survives verbatim
    if (isEntity(w)) return false;                              // names/numbers must be kept exactly
    if (added.some((x) => similar(x, w))) continue;             // corrected ("waz"→"was"), not dropped
    if (w.length >= 3 && !DROPPABLE.has(w.toLowerCase())) return false; // a content word was dropped
  }
  return true;
}

const REPEAT = /\b([\p{L}\d][\p{L}\d'’-]*)\s+\1\b/giu;
const repeatedWords = (s: string): Set<string> =>
  new Set([...s.matchAll(REPEAT)].map((m) => m[1].toLowerCase()));

/**
 * Reject an edit that introduces a doubled word the original didn't have ("…as car" → "…as
 * car car") — another way a weak model mangles text that the diff would faithfully render.
 */
export function createsRepeat(original: string, e: Edit): boolean {
  const result = original.slice(0, e.offset) + e.replacement + original.slice(e.offset + e.length);
  const before = repeatedWords(original);
  for (const w of repeatedWords(result)) if (!before.has(w)) return true;
  return false;
}
