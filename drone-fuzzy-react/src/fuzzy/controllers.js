import { trimf, trapmf, clamp01 } from './membership.js'

// ══════════════════════════════════════════════════════════════════
//  Definição dos controladores fuzzy (Mamdani)
//  NB e PB são SEMPRE trapezoidais; NS, ZE, PS são SEMPRE triangulares.
// ══════════════════════════════════════════════════════════════════

// ── Cores e rótulos linguísticos de cada conjunto de erro ──
// OBJETIVO: traduzir as siglas técnicas (NB, NS, ZE, PS, PB) em texto que o
// estudante entende ("Muito abaixo", "No alvo", ...) e em uma cor fixa usada
// nos gráficos. NB = Negative Big, NS = Negative Small, ZE = Zero,
// PS = Positive Small, PB = Positive Big.
export const SET_INFO = {
  NB: { color: '#E24B4A', label: 'Muito abaixo / à esquerda' },
  NS: { color: '#E2A04B', label: 'Pouco abaixo / à esquerda' },
  ZE: { color: '#1D9E75', label: 'No alvo' },
  PS: { color: '#378ADD', label: 'Pouco acima / à direita' },
  PB: { color: '#9B59B6', label: 'Muito acima / à direita' },
}

// Borda externa "infinita" para os ombros (NB/PB e N/P): garante que
// valores além do universo SATUREM em 1 em vez de cair para 0.
const INF = 1e4

// ── Conjuntos do erro de altitude (entrada Y) — universo [-60, +60] m ──
// NB e PB são ombros (saturam em 1 nos extremos); NS/ZE/PS triangulares.
export const ERR_Y_MFS = [
  { name: 'NB', color: SET_INFO.NB.color, fn: (x) => trapmf(x, -INF, -INF, -40, -20) },
  { name: 'NS', color: SET_INFO.NS.color, fn: (x) => trimf(x, -40, -20, 0) },
  { name: 'ZE', color: SET_INFO.ZE.color, fn: (x) => trimf(x, -20, 0, 20) },
  { name: 'PS', color: SET_INFO.PS.color, fn: (x) => trimf(x, 0, 20, 40) },
  { name: 'PB', color: SET_INFO.PB.color, fn: (x) => trapmf(x, 20, 40, INF, INF) },
]

// ── Conjuntos do erro horizontal (entrada X) — universo [-100, +100] m ──
export const ERR_X_MFS = [
  { name: 'NB', color: SET_INFO.NB.color, fn: (x) => trapmf(x, -INF, -INF, -66, -33) },
  { name: 'NS', color: SET_INFO.NS.color, fn: (x) => trimf(x, -66, -33, 0) },
  { name: 'ZE', color: SET_INFO.ZE.color, fn: (x) => trimf(x, -33, 0, 33) },
  { name: 'PS', color: SET_INFO.PS.color, fn: (x) => trimf(x, 0, 33, 66) },
  { name: 'PB', color: SET_INFO.PB.color, fn: (x) => trapmf(x, 33, 66, INF, INF) },
]

// ── Conjuntos da taxa vertical — universo [-8, +8] m/s ──
export const RATE_Y_MFS = [
  { name: 'N', fn: (x) => trapmf(x, -INF, -INF, -4, 0) },
  { name: 'Z', fn: (x) => trimf(x, -4, 0, 4) },
  { name: 'P', fn: (x) => trapmf(x, 0, 4, INF, INF) },
]

// ── Conjuntos da taxa horizontal — universo [-12, +12] m/s ──
export const RATE_X_MFS = [
  { name: 'N', fn: (x) => trapmf(x, -INF, -INF, -6, 0) },
  { name: 'Z', fn: (x) => trimf(x, -6, 0, 6) },
  { name: 'P', fn: (x) => trapmf(x, 0, 6, INF, INF) },
]

// ── Base de regras (15 por controlador): singleton de saída por (Erro × Taxa) ──
// OBJETIVO: é o "cérebro" do controlador, a tabela SE-ENTÃO em forma de objeto.
// Lê-se: SE o erro é <linha> E a taxa é <coluna> ENTÃO a ação vale <número>.
// Ex.: RULE_OUT.NB.N = -1.0  →  "SE muito abaixo E afastando rápido ENTÃO desça com força total".
// O número (singleton) varia de -1 (ação máxima negativa) a +1 (máxima positiva).
export const RULE_OUT = {
  NB: { N: -1.0, Z: -0.9, P: -0.5 },
  NS: { N: -0.7, Z: -0.5, P: -0.1 },
  ZE: { N: -0.2, Z: 0.0, P: 0.2 },
  PS: { N: 0.1, Z: 0.5, P: 0.7 },
  PB: { N: 0.5, Z: 0.9, P: 1.0 },
}
export const RATE_NAMES = ['N', 'Z', 'P']

// ── Texto da ação para fins didáticos ──
// OBJETIVO: converter o número final defuzzificado (-1 a +1) na frase que
// aparece na tela ("SUBIR forte", "inclinar p/ direita", ...), para o usuário
// entender o que aquela saída fuzzy significa fisicamente.
export function actionLabel(out, axis) {
  const v = out
  if (axis === 'Y') {
    if (v > 0.55) return 'SUBIR forte'
    if (v > 0.1) return 'subir'
    if (v < -0.55) return 'DESCER forte'
    if (v < -0.1) return 'descer'
    return 'manter (hover)'
  } else {
    if (v > 0.55) return 'DIREITA forte'
    if (v > 0.1) return 'inclinar p/ direita'
    if (v < -0.55) return 'ESQUERDA forte'
    if (v < -0.1) return 'inclinar p/ esquerda'
    return 'manter centrado'
  }
}

// ══════════════════════════════════════════════════════════════════
//  Inferência Mamdani (t-norma mínima) + defuzzificação por centroide
// ══════════════════════════════════════════════════════════════════
// OBJETIVO: é o coração da lógica fuzzy. Recebe dois números crus (o erro e a
// taxa de variação) e devolve uma única decisão suave (-1 a +1) percorrendo as
// 4 etapas clássicas de um controlador Mamdani:
//   1) Fuzzificação  → quanto cada número pertence a cada conjunto;
//   2) Avaliação     → força de cada regra = MÍNIMO entre as pertinências (E lógico);
//   3) Agregação     → soma ponderada das saídas das regras;
//   4) Defuzzificação→ centroide (média ponderada) → o número final de controle.
// Também devolve TODOS os dados intermediários para os painéis didáticos.
export function inferController(error, rate, errMFs, rateMFs) {
  // 1) Fuzzificação — traduz os valores crus em graus de pertinência (0..1)
  const errDeg = {}
  const rateDeg = {}
  errMFs.forEach((m) => (errDeg[m.name] = clamp01(m.fn(error))))
  rateMFs.forEach((m) => (rateDeg[m.name] = clamp01(m.fn(rate))))

  // 2) Avaliação das regras (min) + 3) agregação para o centroide
  const rules = []
  let num = 0
  let den = 0
  errMFs.forEach((em) => {
    RATE_NAMES.forEach((rn) => {
      const strength = Math.min(errDeg[em.name], rateDeg[rn]) // t-norma mínima
      const out = RULE_OUT[em.name][rn]
      rules.push({ errName: em.name, rateName: rn, strength, out })
      num += strength * out
      den += strength
    })
  })

  // 4) Defuzzificação — centroide ponderado dos singletons
  const output = den > 0 ? num / den : 0
  return { errDeg, rateDeg, rules, output, error, rate }
}
