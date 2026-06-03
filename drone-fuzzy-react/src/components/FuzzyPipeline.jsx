import { SET_INFO, actionLabel } from '../fuzzy/controllers.js'

// ══════════════════════════════════════════════════════════════════
//  Painel didático — explica o ciclo fuzzy em 4 passos, em texto claro
// ══════════════════════════════════════════════════════════════════
// OBJETIVO: pegar os dados que a inferência fuzzy gerou e narrá-los em
// português. Descobre (1) o conjunto de erro DOMINANTE — o de maior grau —
// e (2) a regra MAIS FORTE do ciclo, e monta os 4 cartões: medir o erro,
// fuzzificar, disparar a regra e defuzzificar até a ação final.
export default function FuzzyPipeline({ snap, focus, setFocus }) {
  const f = snap ? (focus === 'Y' ? snap.fY : snap.fX) : null

  // Conjunto de erro dominante (maior grau de pertinência)
  let domSet = null
  let domDeg = 0
  if (f) {
    for (const name of Object.keys(f.errDeg)) {
      if (f.errDeg[name] > domDeg) {
        domDeg = f.errDeg[name]
        domSet = name
      }
    }
  }

  // Regra mais forte do ciclo
  let topRule = null
  if (f) {
    topRule = f.rules.reduce((a, b) => (b.strength > (a ? a.strength : 0) ? b : a), null)
  }

  const out = f ? f.output : 0
  const axisName = focus === 'Y' ? 'ALTITUDE (subir/descer)' : 'HORIZONTAL (esquerda/direita)'

  return (
    <div className="panel">
      <div className="panel-title">
        <b>🧠 Como o controlador fuzzy está pensando</b>
        <div className="focus-switch">
          <button className={focus === 'Y' ? 'active' : ''} onClick={() => setFocus('Y')}>
            ↕ Altitude
          </button>
          <button className={focus === 'X' ? 'active' : ''} onClick={() => setFocus('X')}>
            ↔ Horizontal
          </button>
        </div>
      </div>
      <div className="panel-body pipeline">
        <div className="pipe-axis">Controlador em foco: <b>{axisName}</b></div>

        <Step n="1" title="Mede o erro">
          O drone está a{' '}
          <b>{f ? Math.abs(f.error).toFixed(1) : '0.0'} m</b>{' '}
          {f && f.error > 0
            ? focus === 'Y'
              ? 'ABAIXO do alvo'
              : 'à ESQUERDA do alvo'
            : focus === 'Y'
              ? 'ACIMA do alvo'
              : 'à DIREITA do alvo'}
          .
        </Step>

        <Step n="2" title="Fuzzifica (traduz em palavras)">
          O erro pertence principalmente ao conjunto{' '}
          <b style={{ color: domSet ? SET_INFO[domSet].color : '#888' }}>
            {domSet || '—'} ({Math.round(domDeg * 100)}%)
          </b>
          {domSet ? ` — “${SET_INFO[domSet].label}”.` : '.'}
        </Step>

        <Step n="3" title="Dispara a regra mais forte">
          {topRule && topRule.strength > 0 ? (
            <>
              SE erro = <b>{topRule.errName}</b> E taxa = <b>{topRule.rateName}</b> ENTÃO ação ={' '}
              <b>{topRule.out > 0 ? '+' : ''}{topRule.out.toFixed(1)}</b>{' '}
              <span className="muted">(força {Math.round(topRule.strength * 100)}%)</span>
            </>
          ) : (
            'Nenhuma regra ativa ainda…'
          )}
        </Step>

        <Step n="4" title="Defuzzifica → ação final">
          <span className="action-badge" data-sign={out > 0.1 ? 'pos' : out < -0.1 ? 'neg' : 'zero'}>
            {actionLabel(out, focus)}
          </span>{' '}
          <span className="muted">saída = {out.toFixed(2)}</span>
        </Step>
      </div>
    </div>
  )
}

// OBJETIVO: cartão numerado reutilizável (número + título + texto) usado em
// cada uma das 4 etapas da explicação.
function Step({ n, title, children }) {
  return (
    <div className="pipe-step">
      <div className="pipe-num">{n}</div>
      <div className="pipe-content">
        <div className="pipe-step-title">{title}</div>
        <div className="pipe-step-text">{children}</div>
      </div>
    </div>
  )
}
