/** A 32-bit hash of a string seed (xfnv1a), to seed the PRNG below. */
function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

/** mulberry32: a tiny deterministic PRNG so every client shuffles identically. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A deterministic Fisher-Yates shuffle seeded by a string (room-stable order). */
export function seededShuffle(seed: string): <T>(items: T[]) => T[] {
  return <T>(items: T[]): T[] => shuffleWith(items, mulberry32(hashSeed(seed)))
}

/** Same Fisher-Yates algorithm with an injected random source. */
export function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
