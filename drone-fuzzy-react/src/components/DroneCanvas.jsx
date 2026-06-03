import { useRef, useEffect } from 'react'
import { fitCanvas } from '../utils/canvas.js'
import { clamp } from '../fuzzy/membership.js'
import { MAX_TILT_DEG } from '../physics/simulation.js'

// ══════════════════════════════════════════════════════════════════
//  Painel 1 — Visualização do drone no mundo 2D
// ══════════════════════════════════════════════════════════════════
export default function DroneCanvas({ simRef, target, setTarget }) {
  const cvRef = useRef(null)
  const draggingRef = useRef(false)

  // ── Desenho contínuo via requestAnimationFrame ──
  useEffect(() => {
    let raf
    const loop = () => {
      draw(cvRef.current, simRef.current, target)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [target, simRef])

  // ── Converter coordenada de tela → mundo e mover o alvo ──
  function moveTarget(e) {
    const cv = cvRef.current
    const r = cv.getBoundingClientRect()
    const pt = e.touches ? e.touches[0] : e
    const px = pt.clientX - r.left
    const py = pt.clientY - r.top
    const W = r.width
    const H = r.height
    const groundY = H - 26
    const topY = 14
    const gx = clamp(((px - 24) / (W - 48)) * 200, 0, 200)
    const gy = clamp(((groundY - py) / (groundY - topY)) * 100, 0, 100)
    setTarget({ x: Math.round(gx), y: Math.round(gy) })
  }

  useEffect(() => {
    const onMove = (e) => draggingRef.current && moveTarget(e)
    const onUp = () => (draggingRef.current = false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  return (
    <div className="panel panel-drone">
      <div className="panel-title">
        <b>🚁 Drone no mundo 2D</b>
        <span>arraste o alvo 🎯 com o mouse</span>
      </div>
      <div className="panel-body">
        <canvas
          ref={cvRef}
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={(e) => {
            draggingRef.current = true
            moveTarget(e)
          }}
          onTouchStart={(e) => {
            draggingRef.current = true
            moveTarget(e)
          }}
        />
      </div>
    </div>
  )
}

// ── Rotina de desenho ──
function draw(canvas, s, target) {
  if (!canvas) return
  const { ctx, w, h } = fitCanvas(canvas)
  ctx.clearRect(0, 0, w, h)

  const groundY = h - 26
  const topY = 14
  const sx = (v) => 24 + (v / 200) * (w - 48)
  const sy = (v) => groundY - (v / 100) * (groundY - topY)

  // Grid + rótulos
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.fillStyle = '#667'
  ctx.font = '11px sans-serif'
  ctx.lineWidth = 1
  for (let mx = 0; mx <= 200; mx += 25) {
    const X = sx(mx)
    ctx.beginPath()
    ctx.moveTo(X, topY)
    ctx.lineTo(X, groundY)
    ctx.stroke()
    ctx.fillText(mx + ' m', X + 2, groundY + 14)
  }
  for (let my = 0; my <= 100; my += 20) {
    const Y = sy(my)
    ctx.beginPath()
    ctx.moveTo(24, Y)
    ctx.lineTo(w - 12, Y)
    ctx.stroke()
    ctx.fillText(my + ' m', 2, Y - 2)
  }

  // Chão
  ctx.fillStyle = 'rgba(29,158,117,0.10)'
  ctx.fillRect(24, groundY, w - 36, h - groundY)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath()
  ctx.moveTo(24, groundY)
  ctx.lineTo(w - 12, groundY)
  ctx.stroke()

  // Sombra
  const shAlpha = clamp(0.35 * (1 - s.y / 100), 0.04, 0.35)
  ctx.fillStyle = `rgba(0,0,0,${shAlpha})`
  ctx.beginPath()
  ctx.ellipse(sx(s.x), groundY, 28 * (1 - s.y / 220), 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // Trilha
  s.trail.forEach((pt, i) => {
    const a = (i / s.trail.length) * 0.5
    ctx.fillStyle = `rgba(55,138,221,${a})`
    ctx.beginPath()
    ctx.arc(sx(pt.x), sy(pt.y), 2, 0, Math.PI * 2)
    ctx.fill()
  })

  // Linhas-guia até o alvo
  const tx = sx(target.x)
  const ty = sy(target.y)
  ctx.strokeStyle = 'rgba(226,75,74,0.25)'
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(sx(s.x), sy(s.y))
  ctx.lineTo(tx, ty)
  ctx.stroke()
  ctx.setLineDash([])

  // Alvo
  ctx.strokeStyle = '#E24B4A'
  ctx.fillStyle = '#E24B4A'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(tx, ty, 11, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(tx - 15, ty)
  ctx.lineTo(tx + 15, ty)
  ctx.moveTo(tx, ty - 15)
  ctx.lineTo(tx, ty + 15)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(tx, ty, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // Drone
  s.propPhase += 0.3 + Math.abs(s.thrustY) * 0.8
  const dx = sx(s.x)
  const dy = sy(s.y)
  const tilt = s.thrustX * (MAX_TILT_DEG * Math.PI) / 180
  ctx.save()
  ctx.translate(dx, dy)
  ctx.rotate(tilt)

  const arm = 20
  ctx.strokeStyle = '#9aa4b2'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-arm, -arm * 0.5)
  ctx.lineTo(arm, arm * 0.5)
  ctx.moveTo(-arm, arm * 0.5)
  ctx.lineTo(arm, -arm * 0.5)
  ctx.stroke()

  ctx.fillStyle = '#378ADD'
  if (ctx.roundRect) {
    ctx.beginPath()
    ctx.roundRect(-10, -7, 20, 14, 3)
    ctx.fill()
  } else {
    ctx.fillRect(-10, -7, 20, 14)
  }

  const motors = [
    [-arm, -arm * 0.5],
    [arm, arm * 0.5],
    [-arm, arm * 0.5],
    [arm, -arm * 0.5],
  ]
  motors.forEach((m, mi) => {
    ctx.save()
    ctx.translate(m[0], m[1])
    ctx.rotate(s.propPhase * (mi % 2 ? 1 : -1))
    ctx.strokeStyle = 'rgba(29,158,117,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(10, 0)
    ctx.moveTo(0, -10)
    ctx.lineTo(0, 10)
    ctx.stroke()
    ctx.fillStyle = '#1D9E75'
    ctx.beginPath()
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
  ctx.restore()
}
