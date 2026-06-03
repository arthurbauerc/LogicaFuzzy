import { useRef, useEffect } from 'react'
import { fitCanvas } from '../utils/canvas.js'
import { HIST_LEN } from '../physics/simulation.js'

// ══════════════════════════════════════════════════════════════════
//  Painel 6 — Histórico: valor real (sólido) vs alvo (tracejado)
// ══════════════════════════════════════════════════════════════════
export default function HistoryChart({ simRef, focus }) {
  const cvRef = useRef(null)

  const cfg =
    focus === 'Y'
      ? { real: 'histY', target: 'histYt', min: 0, max: 100, color: '#1D9E75', title: 'Altitude Y (m)' }
      : { real: 'histX', target: 'histXt', min: 0, max: 200, color: '#378ADD', title: 'Posição X (m)' }

  useEffect(() => {
    let raf
    const loop = () => {
      const s = simRef.current
      draw(cvRef.current, s[cfg.real], s[cfg.target], cfg.min, cfg.max, cfg.color)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [focus, cfg.real, cfg.target, cfg.min, cfg.max, cfg.color, simRef])

  return (
    <div className="panel">
      <div className="panel-title">
        <b>📉 Histórico</b>
        <span>
          <i className="leg-solid" style={{ background: cfg.color }} /> real&nbsp;&nbsp;
          <i className="leg-dash" /> alvo
        </span>
      </div>
      <div className="panel-body">
        <div className="chart-sub" style={{ color: cfg.color }}>
          {cfg.title}
        </div>
        <div className="chart-wrap">
          <canvas ref={cvRef} />
        </div>
      </div>
    </div>
  )
}

// ── Desenho do gráfico de linha ──
// OBJETIVO: traçar duas curvas no tempo — o valor REAL (linha sólida) e o ALVO
// (linha tracejada) — para o estudante ver o controlador convergindo: quanto
// mais a linha sólida "cola" na tracejada, melhor o controle fuzzy está agindo.
function draw(canvas, real, target, vMin, vMax, color) {
  if (!canvas) return
  const { ctx, w, h } = fitCanvas(canvas)
  ctx.clearRect(0, 0, w, h)

  const padL = 30
  const padR = 6
  const padT = 6
  const padB = 6
  const Y = (v) => h - padB - ((v - vMin) / (vMax - vMin)) * (h - padT - padB)
  const X = (i) => padL + (i / (HIST_LEN - 1)) * (w - padL - padR)

  // Grade
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.fillStyle = '#778'
  ctx.font = '10px sans-serif'
  ctx.lineWidth = 1
  ;[vMin, (vMin + vMax) / 2, vMax].forEach((v) => {
    ctx.beginPath()
    ctx.moveTo(padL, Y(v))
    ctx.lineTo(w - padR, Y(v))
    ctx.stroke()
    ctx.fillText(String(Math.round(v)), 2, Y(v) + 3)
  })

  const line = (arr, dash, col, width) => {
    if (!arr || arr.length < 2) return
    ctx.strokeStyle = col
    ctx.lineWidth = width
    ctx.setLineDash(dash)
    ctx.beginPath()
    const off = HIST_LEN - arr.length
    arr.forEach((v, i) => {
      const px = X(i + off)
      const py = Y(v)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.stroke()
    ctx.setLineDash([])
  }

  line(target, [5, 4], 'rgba(255,255,255,0.5)', 1.4) // alvo (tracejado)
  line(real, [], color, 2) // real (sólido)

  // Valor atual em destaque
  if (real && real.length) {
    const last = real[real.length - 1]
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(X(HIST_LEN - 1), Y(last), 3, 0, Math.PI * 2)
    ctx.fill()
  }
}
