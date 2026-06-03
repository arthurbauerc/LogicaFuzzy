import { useState } from 'react'
import { useSimulation } from './hooks/useSimulation.js'
import Drone3D from './components/Drone3D.jsx'
import ControlsPanel from './components/ControlsPanel.jsx'
import FuzzyPipeline from './components/FuzzyPipeline.jsx'
import MembershipChart from './components/MembershipChart.jsx'
import DegreeBars from './components/DegreeBars.jsx'
import RulesTable from './components/RulesTable.jsx'
import HistoryChart from './components/HistoryChart.jsx'
import './App.css'

// ══════════════════════════════════════════════════════════════════
//  Aplicação — orquestra estado dos controles e monta os painéis
// ══════════════════════════════════════════════════════════════════
// OBJETIVO: é o "maestro". Guarda o estado dos controles do usuário (alvo,
// vento, pausa, velocidade e qual eixo está em foco), liga o motor de simulação
// pelo hook useSimulation e distribui esses dados para os 6 painéis da tela.
export default function App() {
  // Controles do usuário
  const [target, setTarget] = useState({ x: 100, y: 50 })
  const [wind, setWind] = useState(1)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)

  // Controlador em foco nos painéis didáticos ('Y' = altitude, 'X' = horizontal)
  const [focus, setFocus] = useState('Y')

  // Loop de física
  const { simRef, snap, reset } = useSimulation({
    targetX: target.x,
    targetY: target.y,
    wind,
    paused,
    speed,
  })

  return (
    <div className="app">
      <header className="app-header">
        <h1>Controle Fuzzy de Drone</h1>
        <span className="subtitle">
          Demonstração interativa · Lógica Fuzzy (Mamdani) em React — escolha um eixo e veja o drone "pensar"
        </span>
      </header>

      <main className="grid">
        <div className="area-drone">
          <Drone3D simRef={simRef} target={target} setTarget={setTarget} />
        </div>
        <div className="area-controls">
          <ControlsPanel
            target={target}
            setTarget={setTarget}
            wind={wind}
            setWind={setWind}
            paused={paused}
            setPaused={setPaused}
            speed={speed}
            setSpeed={setSpeed}
            onReset={reset}
            snap={snap}
          />
        </div>
        <div className="area-pipeline">
          <FuzzyPipeline snap={snap} focus={focus} setFocus={setFocus} />
        </div>
        <div className="area-mfs">
          <MembershipChart simRef={simRef} focus={focus} />
        </div>
        <div className="area-bars">
          <DegreeBars snap={snap} focus={focus} />
        </div>
        <div className="area-rules">
          <RulesTable snap={snap} focus={focus} />
        </div>
        <div className="area-history">
          <HistoryChart simRef={simRef} focus={focus} />
        </div>
      </main>
    </div>
  )
}
