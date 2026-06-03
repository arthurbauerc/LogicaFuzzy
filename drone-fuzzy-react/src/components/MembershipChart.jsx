import { useRef, useEffect } from 'react'
import { fitCanvas, hexA } from '../utils/canvas.js'
import { clamp01, clamp } from '../fuzzy/membership.js'
import { ERR_Y_MFS, ERR_X_MFS } from '../fuzzy/controllers.js'

// ══════════════════════════════════════════════════════════════════
//  Painel 3 — Funções de pertinência do erro (controlador em foco)
// ══════════════════════════════════════════════════════════════════
export default function MembershipChart({ simRef, focus }) {
  const cvRef = useRef(null)

  const mfs = focus === 'Y' ? ERR_Y_MFS : ERR_X_MFS
  const uMin = focus === 'Y' ? -60 : -100
  const uMax = focus === 'Y' ? 60 : 100

  useEffect(() => {
    let raf
    const loop = () => {
      const s = simRef.current
      const f = focus === 'Y' ? s.fY : s.fX
      draw(cvRef.current, mfs, uMin, uMax, f ? f.error : 0)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [focus, mfs, uMin, uMax, simRef])

  return (
    <div className="panel">
      <div className="panel-title">
        <b>📈 Conjuntos fuzzy do erro {focus === 'Y' ? '(altitude)' : '(horizontal)'}</b>
        <span>universo [{uMin}, {uMax}] m</span>
      </div>
      <div className="panel-body">
        <div className="chart-wrap">
          <canvas ref={cvRef} />
        </div>
        <div className="legend">
          {mfs.map((m) => (
            <span key={m.name} className="legend-item">
              <i style={{ background: m.color }} />
              {m.name}
            </span>
          ))}
        </div>
        <div className="note">A linha branca tracejada mostra o valor atual do erro. Os conjuntos preenchidos são os que estão "ativos" agora.</div>
      </div>
    </div>
  )
}

// ── Desenho do gráfico das MFs ──
// OBJETIVO: desenhar no canvas as 5 curvas de pertinência (NB..PB), pintar as
// que estão ativas e traçar a linha vertical do valor atual do erro — ou seja,
// mostrar VISUALMENTE a etapa de fuzzificação acontecendo.
function draw(canvas, mfs, uMin, uMax, current) {
  if (!canvas) return
  const { ctx, w, h } = fitCanvas(canvas)
  ctx.clearRect(0, 0, w, h)

  const padL = 30
  const padR = 8
  const padT = 8
  const padB = 22
  const X = (u) => padL + ((u - uMin) / (uMax - uMin)) * (w - padL - padR)
  const Y = (g) => h - padB - g * (h - padT - padB)

  // Eixos
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padL, padT)
  ctx.lineTo(padL, h - padB)
  ctx.lineTo(w - padR, h - padB)
  ctx.stroke()

  ctx.fillStyle = '#778'
  ctx.font = '10px sans-serif'
  ctx.fillText('grau 1', 2, Y(1) + 3)
  ctx.fillText('0', 2, Y(0) + 3)
  ctx.fillText(String(uMin), padL - 6, h - 6)
  ctx.fillText('0', X(0) - 3, h - 6)
  ctx.fillText('+' + uMax, w - padR - 24, h - 6)

  const N = 140
  // Preenchimento dos conjuntos ativos
  mfs.forEach((m) => {
    const active = m.fn(current) > 0.001
    if (!active) return
    ctx.beginPath()
    ctx.moveTo(X(uMin), Y(0))
    for (let i = 0; i <= N; i++) {
      const u = uMin + ((uMax - uMin) * i) / N
      ctx.lineTo(X(u), Y(clamp01(m.fn(u))))
    }
    ctx.lineTo(X(uMax), Y(0))
    ctx.closePath()
    ctx.fillStyle = hexA(m.color, 0.2)
    ctx.fill()
  })

  // Curvas
  mfs.forEach((m) => {
    const active = m.fn(current) > 0.001
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const u = uMin + ((uMax - uMin) * i) / N
      const px = X(u)
      const py = Y(clamp01(m.fn(u)))
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.strokeStyle = m.color
    ctx.lineWidth = active ? 2.4 : 1.2
    ctx.stroke()
  })

  // Linha vertical do valor atual
  const cv = clamp(current, uMin, uMax)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.4
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.moveTo(X(cv), padT)
  ctx.lineTo(X(cv), h - padB)
  ctx.stroke()
  ctx.setLineDash([])

  // Etiqueta do valor
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px sans-serif'
  const label = current.toFixed(1) + ' m'
  const lw = ctx.measureText(label).width
  let lx = X(cv) + 4
  if (lx + lw > w - padR) lx = X(cv) - lw - 4
  ctx.fillText(label, lx, padT + 10)
}
