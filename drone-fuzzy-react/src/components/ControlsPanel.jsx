// ══════════════════════════════════════════════════════════════════
//  Painel 2 — Controles + cenários prontos + telemetria
// ══════════════════════════════════════════════════════════════════
export default function ControlsPanel({
  target,
  setTarget,
  wind,
  setWind,
  paused,
  setPaused,
  speed,
  setSpeed,
  onReset,
  snap,
}) {
  // ── Cenários didáticos prontos ──
  // OBJETIVO: botões de atalho que posicionam o alvo em situações típicas
  // (decolar, pousar, ir p/ os lados) para o usuário observar a resposta fuzzy
  // sem precisar mexer nos sliders.
  const scenarios = [
    { name: 'Decolar', x: 100, y: 80 },
    { name: 'Pousar', x: 100, y: 0 },
    { name: 'Ir p/ direita', x: 180, y: 50 },
    { name: 'Ir p/ esquerda', x: 20, y: 50 },
  ]

  const tilt = snap ? snap.thrustX * 30 : 0
  const errY = snap && snap.fY ? snap.fY.error : 0
  const errX = snap && snap.fX ? snap.fX.error : 0

  return (
    <div className="panel">
      <div className="panel-title">
        <b>🎛️ Controles</b>
        <span>cenários & ajustes</span>
      </div>
      <div className="panel-body scroll">
        {/* Cenários prontos */}
        <div className="scenario-grid">
          {scenarios.map((sc) => (
            <button key={sc.name} onClick={() => setTarget({ x: sc.x, y: sc.y })}>
              {sc.name}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="ctrl-row">
          <label>
            Alvo X (horizontal) <span>{target.x} m</span>
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={target.x}
            onChange={(e) => setTarget({ ...target, x: +e.target.value })}
          />
        </div>
        <div className="ctrl-row">
          <label>
            Alvo Y (altitude) <span>{target.y} m</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={target.y}
            onChange={(e) => setTarget({ ...target, y: +e.target.value })}
          />
        </div>
        <div className="ctrl-row">
          <label>
            Vento 🌬️ <span>{wind.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={wind}
            onChange={(e) => setWind(+e.target.value)}
          />
        </div>
        <div className="ctrl-row">
          <label>
            Velocidade da simulação <span>{speed.toFixed(1)}×</span>
          </label>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
          />
        </div>

        {/* Botões */}
        <div className="btn-row">
          <button className={paused ? '' : 'active'} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ Continuar' : '⏸ Pausar'}
          </button>
          <button onClick={onReset}>↺ Reiniciar</button>
        </div>

        {/* Telemetria */}
        <div className="telemetry">
          <Item k="Posição X" v={(snap ? snap.x : 0).toFixed(1) + ' m'} />
          <Item k="Altitude Y" v={(snap ? snap.y : 0).toFixed(1) + ' m'} />
          <Item k="Vel. Vx" v={(snap ? snap.vx : 0).toFixed(2)} />
          <Item k="Vel. Vy" v={(snap ? snap.vy : 0).toFixed(2)} />
          <Item k="Erro altitude" v={errY.toFixed(1) + ' m'} />
          <Item k="Erro horizontal" v={errX.toFixed(1) + ' m'} />
          <Item k="Inclinação" v={tilt.toFixed(1) + '°'} />
          <Item k="Saída fuzzy ↕" v={(snap ? snap.thrustY : 0).toFixed(2)} />
          <Item k="Saída fuzzy ↔" v={(snap ? snap.thrustX : 0).toFixed(2)} />
        </div>
      </div>
    </div>
  )
}

// OBJETIVO: linha "rótulo : valor" reutilizada na grade de telemetria.
function Item({ k, v }) {
  return (
    <div>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}
