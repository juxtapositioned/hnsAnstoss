// mulberry32 — tiny seeded PRNG. State is a plain number so the match state stays a value.

export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, state: t };
}

export function shuffle<T>(items: T[], state: number): { items: T[]; state: number } {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRandom(state);
    state = r.state;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return { items: out, state };
}

/** Weighted pick. Returns the index. Weights must sum to > 0. */
export function pickWeighted(weights: number[], state: number): { index: number; state: number } {
  const total = weights.reduce((a, b) => a + b, 0);
  const r = nextRandom(state);
  let x = r.value * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i] ?? 0;
    if (x < 0) return { index: i, state: r.state };
  }
  return { index: weights.length - 1, state: r.state };
}
