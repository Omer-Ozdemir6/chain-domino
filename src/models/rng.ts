/** Deterministic pseudo-random generator (mulberry32) seeded from a string — used to make a
 *  run's stone shuffle reproducible from its seed instead of depending on Math.random(), so the
 *  exact same seed always deals the exact same stones in the exact same order. */
export function createSeededRandom(seed: string): () => number {
  let a = hashStringToInt(seed);
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToInt(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** A short, human-shareable run seed (e.g. "K3F9-QX2M") — no ambiguous 0/O or 1/I characters. */
export function generateRunSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) out += '-';
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
