// ══════════════════════════════════════════════════════════════════
//  Funções de pertinência (JavaScript puro — sem bibliotecas)
// ══════════════════════════════════════════════════════════════════

// ── Triangular (trimf) ──
// OBJETIVO: dado um valor "x", responde "o quanto ele pertence" a um
// conjunto fuzzy em forma de triângulo, retornando um grau entre 0 e 1.
// A pertinência vale 0 fora do intervalo (a..c), sobe linearmente de a→b,
// atinge o pico 1 em "b" e desce linearmente de b→c.
// Ex.: usada para os conjuntos "pouco abaixo" (NS), "no alvo" (ZE), "pouco acima" (PS).
export function trimf(x, a, b, c) {
  if (x <= a || x >= c) return 0 // totalmente fora do conjunto
  if (x === b) return 1 // exatamente no pico
  return x < b ? (x - a) / (b - a) : (c - x) / (c - b) // rampa de subida / descida
}

// ── Trapezoidal (trapmf) ──
// OBJETIVO: mede a pertinência a um conjunto em forma de trapézio. Igual ao
// triângulo, mas com um "platô" de pertinência 1 entre b e c. Usado para os
// conjuntos extremos NB/PB ("muito abaixo"/"muito acima"): colocando b ou c
// no infinito, vira um "ombro" que SATURA em 1 e nunca volta a zero.
export function trapmf(x, a, b, c, d) {
  if (x <= a || x >= d) return 0 // fora do trapézio
  if (x >= b && x <= c) return 1 // dentro do platô (pertinência total)
  return x < b ? (x - a) / (b - a) : (d - x) / (d - c) // rampas laterais
}

// ── Utilitários de saturação ──
// clamp01: prende um número no intervalo [0, 1] (graus de pertinência).
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
// clamp: prende um número genérico no intervalo [a, b] (limites do mundo, etc.).
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
