/**
 * Gerador determinístico (mulberry32). O estado é um número guardado em
 * `GameState`, então a partida inteira é reproduzível a partir da semente
 * e depurável passo a passo (decisão Q5).
 */
export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, state: t };
}

export function nextInt(state: number, exclusiveMax: number): { value: number; state: number } {
  const next = nextRandom(state);
  return { value: Math.floor(next.value * exclusiveMax), state: next.state };
}

/** Embaralhamento Fisher-Yates determinístico. */
export function shuffle<T>(items: readonly T[], state: number): { items: T[]; state: number } {
  const result = [...items];
  let current = state;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const draw = nextInt(current, i + 1);
    current = draw.state;
    const j = draw.value;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { items: result, state: current };
}
