/** Build the redacted hint mask: e.g. "Peppa Pig" → "_ _ _ _ _ _ _ _ _" with spaces preserved. */
export function buildWordMask(word: string, revealed: Set<number> = new Set()): string {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]!;
    if (ch === ' ') out.push('  ');
    else if (revealed.has(i)) out.push(ch);
    else out.push('_');
  }
  return out.join(' ');
}

/** Normalise a guess for matching: lowercase, strip non-alphanum but keep spaces. */
export function normaliseGuess(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance, capped at maxDist for early exit. */
export function levenshtein(a: string, b: string, maxDist = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i, ...new Array(b.length).fill(0)];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
      if (curr[j]! < rowMin) rowMin = curr[j]!;
    }
    if (rowMin > maxDist) return maxDist + 1;
    prev = curr;
  }
  return prev[b.length]!;
}

/** Score a guess: 'correct' | 'close' | 'wrong'. */
export function classifyGuess(guess: string, target: string): 'correct' | 'close' | 'wrong' {
  const g = normaliseGuess(guess);
  const t = normaliseGuess(target);
  if (g === t) return 'correct';
  const tol = Math.max(2, Math.floor(t.length / 4));
  const dist = levenshtein(g, t, tol);
  if (dist <= tol) return 'close';
  return 'wrong';
}

/** Generate a 6-character room code from an unambiguous alphabet. */
export function generateRoomCode(rng: () => number = Math.random, length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return code;
}

/** Compute drawer-side and guesser-side score deltas for a guess. */
export function scoreForGuess({
  remainingMs,
  totalMs,
  difficulty,
  positionAmongGuessers,
}: {
  remainingMs: number;
  totalMs: number;
  difficulty: 'easy' | 'medium' | 'hard';
  positionAmongGuessers: number;
}): { guesser: number; drawer: number } {
  const diffMul = difficulty === 'hard' ? 1.4 : difficulty === 'medium' ? 1.15 : 1.0;
  const timeRatio = Math.max(0, Math.min(1, remainingMs / totalMs));
  const baseGuesser = Math.round((300 + 600 * timeRatio) * diffMul);
  const positionBonus = positionAmongGuessers === 0 ? 100 : positionAmongGuessers === 1 ? 50 : 0;
  const drawerShare = Math.round(baseGuesser * 0.45);
  return { guesser: baseGuesser + positionBonus, drawer: drawerShare };
}

/** Fisher–Yates shuffle. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

/** Sanitise free-form text: strip control chars, collapse whitespace, trim, cap length. */
export function sanitiseText(s: string, maxLen: number): string {
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c < 0x20 || c === 0x7f) continue;
    out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/** Detect if a chat message is the drawer leaking the answer. */
export function leaksWord(text: string, word: string): boolean {
  const t = normaliseGuess(text);
  const w = normaliseGuess(word);
  if (!w) return false;
  if (t.includes(w)) return true;
  for (const token of t.split(' ')) {
    if (token.length >= 3 && (w.includes(token) || token.includes(w))) return true;
  }
  return false;
}
