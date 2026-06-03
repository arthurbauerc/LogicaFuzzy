// ══════════════════════════════════════════════════════════════════
//  Painel 5 — Regras fuzzy ativas (top 5 do controlador em foco)
// ══════════════════════════════════════════════════════════════════
export default function RulesTable({ snap, focus }) {
  const f = snap ? (focus === 'Y' ? snap.fY : snap.fX) : null

  let rules = f ? f.rules.filter((r) => r.strength > 0) : []
  rules = rules.sort((a, b) => b.strength - a.strength).slice(0, 5)

  // OBJETIVO: escolher a cor de fundo da linha conforme a regra — verde p/ ação
  // positiva, vermelho p/ negativa, cinza p/ neutra — com opacidade proporcional
  // à força de ativação, para "saltar aos olhos" qual regra está mandando agora.
  function rowBg(r) {
    const a = 0.12 + r.strength * 0.4
    if (r.out > 0.02) return `rgba(29,158,117,${a})`
    if (r.out < -0.02) return `rgba(226,75,74,${a})`
    return `rgba(255,255,255,${0.03 + r.strength * 0.06})`
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <b>📋 Regras ativas agora</b>
        <span>top 5 por força — {focus === 'Y' ? 'altitude' : 'horizontal'}</span>
      </div>
      <div className="panel-body">
        <table className="rules-table">
          <thead>
            <tr>
              <th style={{ width: '64px' }}>Força</th>
              <th>SE (antecedente)</th>
              <th>ENTÃO (ação)</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan="3" className="muted">
                  Aguardando ativação…
                </td>
              </tr>
            )}
            {rules.map((r, i) => (
              <tr key={i} style={{ background: rowBg(r) }}>
                <td>
                  <div className="force-cell">
                    <div className="force-bar" style={{ width: r.strength * 100 + '%' }} />
                    <span>{Math.round(r.strength * 100)}%</span>
                  </div>
                </td>
                <td>
                  erro = <b>{r.errName}</b> e taxa = <b>{r.rateName}</b>
                </td>
                <td>
                  {r.out > 0 ? '+' : ''}
                  {r.out.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rules-foot">
          Inferência Mamdani · Defuzzificação por centroide · 15 regras por controlador
        </div>
      </div>
    </div>
  )
}
