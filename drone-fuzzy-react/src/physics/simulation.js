import { clamp } from '../fuzzy/membership.js'
import {
  inferController,
  ERR_Y_MFS,
  ERR_X_MFS,
  RATE_Y_MFS,
  RATE_X_MFS,
} from '../fuzzy/controllers.js'

// ══════════════════════════════════════════════════════════════════
//  Constantes da simulação física
// ══════════════════════════════════════════════════════════════════
export const DT = 0.05 // passo de integração (s)
export const SUBSTEPS = 2 // passos de Euler por ciclo
export const MAX_ACCEL_Y = 14 // aceleração vertical máxima (m/s²)
export const MAX_ACCEL_X = 9 // aceleração horizontal máxima (m/s²)
export const MAX_TILT_DEG = 30 // inclinação visual máxima
export const HIST_LEN = 120

// ── Estado inicial da simulação ──
// OBJETIVO: devolver um objeto "zerado" com tudo que descreve o drone num
// instante: posição (x,y), velocidades (vx,vy), tempo, saídas fuzzy atuais,
// fase das hélices, a trilha e os vetores de histórico dos gráficos.
// É chamado no início e toda vez que o usuário clica em "Reiniciar".
export function freshState() {
  return {
    x: 100,
    y: 0,
    vx: 0,
    vy: 0,
    simTime: 0,
    thrustY: 0,
    thrustX: 0,
    propPhase: 0,
    trail: [],
    fY: null,
    fX: null,
    histY: [],
    histYt: [],
    histX: [],
    histXt: [],
  }
}

// OBJETIVO: empurrar um novo valor no fim do vetor de histórico e descartar o
// mais antigo quando passa de HIST_LEN pontos (janela deslizante p/ os gráficos).
function pushHist(arr, v) {
  arr.push(v)
  if (arr.length > HIST_LEN) arr.shift()
}

// ══════════════════════════════════════════════════════════════════
//  Um ciclo de simulação (executa SUBSTEPS integrações de Euler)
// ══════════════════════════════════════════════════════════════════
// OBJETIVO: avançar a física do drone um "tique" no tempo. A cada subpasso ele:
//   (1) calcula os erros (alvo − posição) e as taxas (velocidade);
//   (2) pergunta aos DOIS controladores fuzzy qual o empuxo/inclinação;
//   (3) integra pela regra de Euler para obter novas velocidades e posições;
//   (4) aplica vento, atrito (damping) e os limites do mundo.
// No fim, grava a trilha e os históricos. É o elo entre o "cérebro" fuzzy e o
// "corpo" físico do drone.
export function stepSimulation(s, params) {
  const { targetX, targetY, wind } = params

  for (let k = 0; k < SUBSTEPS; k++) {
    s.simTime += DT

    // Erros = o quanto falta para o alvo · Taxas = velocidade atual (com sinal trocado)
    const errY = targetY - s.y
    const errX = targetX - s.x
    const rateY = -s.vy
    const rateX = -s.vx

    // Dois controladores fuzzy independentes (altitude e horizontal)
    const fY = inferController(errY, rateY, ERR_Y_MFS, RATE_Y_MFS)
    const fX = inferController(errX, rateX, ERR_X_MFS, RATE_X_MFS)
    s.thrustY = fY.output
    s.thrustX = fX.output
    s.fY = fY
    s.fX = fX

    // Vento (perturbação senoidal)
    const windForce = wind * Math.sin(s.simTime * 0.9) * 1.6

    // Integração de Euler — vertical
    s.vy += s.thrustY * MAX_ACCEL_Y * DT
    s.y += s.vy * DT
    s.vy *= 0.995
    if (s.y < 0) { s.y = 0; s.vy = 0 }
    if (s.y > 100) { s.y = 100; s.vy = 0 }

    // Integração de Euler — horizontal
    s.vx += (s.thrustX * MAX_ACCEL_X + windForce) * DT
    s.x += s.vx * DT
    s.vx *= 0.985
    if (s.x < 0) { s.x = 0; s.vx = 0 }
    if (s.x > 200) { s.x = 200; s.vx = 0 }
  }

  // Trilha
  s.trail.push({ x: s.x, y: s.y })
  if (s.trail.length > HIST_LEN) s.trail.shift()

  // Históricos (shift do array)
  pushHist(s.histY, s.y)
  pushHist(s.histYt, targetY)
  pushHist(s.histX, s.x)
  pushHist(s.histXt, targetX)
}

export { clamp }
