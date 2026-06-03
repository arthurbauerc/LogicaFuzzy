import { useRef, useState, useEffect, useCallback } from 'react'
import { freshState, stepSimulation } from '../physics/simulation.js'

// ══════════════════════════════════════════════════════════════════
//  Hook que gerencia o loop de física e expõe um snapshot reativo
// ══════════════════════════════════════════════════════════════════
// OBJETIVO: separar a parte que muda MUITO rápido (física, 20×/s) da parte que
// o React redesenha. Para isso usa duas estratégias:
//   - simRef: um "ref" mutável com o estado vivo — NÃO dispara re-render, por
//     isso é lido diretamente pelos canvas/3D a cada quadro (rAF), sem travar.
//   - snap:   uma CÓPIA tirada só a cada 100 ms (throttling) que vira "state" e
//     alimenta os painéis de texto/barras, mantendo a tela leve.
export function useSimulation(params) {
  const simRef = useRef(freshState())
  const paramsRef = useRef(params)
  paramsRef.current = params

  const [snap, setSnap] = useState(null)

  // ── Loop de física (50 ms, escalado pela velocidade) ──
  useEffect(() => {
    let acc = 0
    const id = setInterval(() => {
      const p = paramsRef.current
      if (p.paused) return
      // "speed" controla quantos ciclos rodamos por tick (0.5x, 1x, 2x)
      acc += p.speed
      while (acc >= 1) {
        stepSimulation(simRef.current, p)
        acc -= 1
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  // ── Snapshot throttled para re-render dos painéis ──
  useEffect(() => {
    const id = setInterval(() => {
      const s = simRef.current
      setSnap({
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        thrustY: s.thrustY,
        thrustX: s.thrustX,
        fY: s.fY,
        fX: s.fX,
      })
    }, 100)
    return () => clearInterval(id)
  }, [])

  // OBJETIVO: zerar a simulação (botão "Reiniciar") devolvendo o estado inicial.
  const reset = useCallback(() => {
    simRef.current = freshState()
    setSnap(null)
  }, [])

  return { simRef, snap, reset }
}
