import { SET_INFO } from '../fuzzy/controllers.js'
import { ERR_Y_MFS, ERR_X_MFS } from '../fuzzy/controllers.js'
import { clamp } from '../fuzzy/membership.js'

// ══════════════════════════════════════════════════════════════════
//  Painel 4 — Graus de pertinência + ponteiro de defuzzificação
// ══════════════════════════════════════════════════════════════════
// OBJETIVO: mostrar, em barras horizontais, "quanto" o erro atual pertence a
// cada conjunto (resultado da fuzzificação em %) e, abaixo, um ponteiro de -1 a
// +1 indicando a saída defuzzificada (a decisão final) entre os dois extremos.
export default function DegreeBars({ snap, focus }) {
  const f = snap ? (focus === 'Y' ? snap.fY : snap.fX) : null
  const mfs = focus === 'Y' ? ERR_Y_MFS : ERR_X_MFS
  const out = f ? f.output : 0

  const labels =
    focus === 'Y'
      ? { left: 'Descer', mid: 'Hover', right: 'Subir' }
      : { left: 'Esquerda', mid: 'Centro', right: 'Direita' }

  const ptr = ((clamp(out, -1, 1) + 1) / 2) * 100

  return (
    <div className="panel">
      <div className="panel-title">
        <b>📊 Graus de ativação</b>
        <span>{focus === 'Y' ? 'altitude' : 'horizontal'}</span>
      </div>
      <div className="panel-body scroll">
        {mfs.map((m) => {
          const v = f ? f.errDeg[m.name] : 0
          return (
            <div className="bar-row" key={m.name}>
              <span className="bar-name" style={{ color: m.color }}>
                {m.name}
              </span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: v * 100 + '%', background: m.color }}
                />
              </div>
              <span className="bar-pct">{Math.round(v * 100)}%</span>
            </div>
          )
        })}

        {/* Ponteiro de defuzzificação */}
        <div className="defuzz">
          <div className="defuzz-lab">
            <span>{labels.left}</span>
            <span>{labels.mid}</span>
            <span>{labels.right}</span>
          </div>
          <div className="defuzz-track">
            <div className="defuzz-center" />
            <div className="defuzz-ptr" style={{ left: ptr + '%' }} />
          </div>
          <div className="defuzz-lab">
            <span>−1</span>
            <span className="defuzz-val">{out.toFixed(2)}</span>
            <span>+1</span>
          </div>
        </div>
      </div>
    </div>
  )
}
