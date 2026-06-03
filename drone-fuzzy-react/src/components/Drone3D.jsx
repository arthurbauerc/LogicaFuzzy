import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky, Grid, Trail, Float } from '@react-three/drei'
import { clamp } from '../fuzzy/membership.js'
import { MAX_TILT_DEG } from '../physics/simulation.js'

// ══════════════════════════════════════════════════════════════════
//  Painel 1 (3D) — Drone num mundo tridimensional
//  Mundo: X horizontal [0,200] m · Y altitude [0,100] m (plano z=0)
// ══════════════════════════════════════════════════════════════════
const SCALE = 0.12 // metros → unidades de cena
const MAX_TILT_RAD = (MAX_TILT_DEG * Math.PI) / 180

// Conversões mundo → cena: transformam metros (X 0..200, Y 0..100) em unidades
// 3D, centralizando o eixo X (x=100 vira o meio da cena).
const sceneX = (x) => (x - 100) * SCALE
const sceneY = (y) => y * SCALE

export default function Drone3D({ simRef, target, setTarget }) {
  return (
    <div className="panel panel-drone">
      <div className="panel-title">
        <b>🚁 Drone (3D)</b>
        <span>clique no plano p/ mover o alvo 🎯 · arraste p/ girar a câmera</span>
      </div>
      <div className="panel-body">
        <div className="chart-wrap canvas3d">
          <Canvas shadows camera={{ position: [16, 12, 24], fov: 45 }}>
            <Scene simRef={simRef} target={target} setTarget={setTarget} />
          </Canvas>
        </div>
      </div>
    </div>
  )
}

// ── Cena completa ──
// OBJETIVO: montar tudo que existe dentro do mundo 3D — luzes, céu, chão, alvo,
// o drone com rastro e o controle de câmera. É o "palco" da simulação.
function Scene({ simRef, target, setTarget }) {
  return (
    <>
      {/* Iluminação */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[12, 22, 10]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <hemisphereLight args={['#bcd8ff', '#243018', 0.5]} />

      {/* Céu e névoa (fundo bonito) */}
      <Sky sunPosition={[12, 22, 10]} turbidity={6} rayleigh={1.2} mieCoefficient={0.005} />
      <fog attach="fog" args={['#9fc0e8', 35, 80]} />

      {/* Chão + grades de referência */}
      <Ground />

      {/* Plano invisível (z=0) para captar cliques e posicionar o alvo */}
      <ClickPlane setTarget={setTarget} />

      {/* Alvo */}
      <TargetMarker target={target} />

      {/* Drone com rastro */}
      <Trail width={3} length={7} color={'#378ADD'} attenuation={(t) => t * t}>
        <DroneModel simRef={simRef} />
      </Trail>

      {/* Controle de órbita da câmera */}
      <OrbitControls
        target={[0, 6, 0]}
        enablePan={false}
        minDistance={10}
        maxDistance={45}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  )
}

// ── Chão (plano horizontal y=0) + grids ──
// OBJETIVO: desenhar o piso que recebe a sombra do drone e as grades de
// referência (no chão e no plano vertical X-Y onde o drone realmente voa).
function Ground() {
  return (
    <group>
      {/* Superfície que recebe sombra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#3a5a3f" roughness={1} />
      </mesh>
      {/* Grade no chão */}
      <Grid
        position={[0, 0.01, 0]}
        args={[60, 60]}
        cellSize={SCALE * 25}
        cellColor="#5a7a60"
        sectionSize={SCALE * 100}
        sectionColor="#84a98c"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
      {/* Grade vertical (plano X-Y onde o drone voa) */}
      <gridHelper
        args={[24, 8, '#9bb0c9', '#6b7a90']}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 6, -0.5]}
      />
    </group>
  )
}

// ── Plano invisível para clique (no plano X-Y, z=0) ──
// OBJETIVO: uma "tela" transparente que capta o clique do mouse no espaço 3D,
// converte o ponto atingido de volta para coordenadas do mundo (metros) e
// reposiciona o alvo. É o que permite "clicar para mandar o drone até ali".
function ClickPlane({ setTarget }) {
  function onClick(e) {
    e.stopPropagation()
    const wx = e.point.x / SCALE + 100
    const wy = e.point.y / SCALE
    setTarget({ x: Math.round(clamp(wx, 0, 200)), y: Math.round(clamp(wy, 0, 100)) })
  }
  return (
    <mesh position={[0, 6, 0]} onClick={onClick} visible={false}>
      <planeGeometry args={[26, 14]} />
      <meshBasicMaterial transparent opacity={0} side={2} />
    </mesh>
  )
}

// ── Marcador do alvo ──
// OBJETIVO: representar o destino desejado — esfera vermelha flutuante com anel
// e um feixe vertical até o chão — posicionado nas coordenadas do alvo.
function TargetMarker({ target }) {
  const x = sceneX(target.x)
  const y = sceneY(target.y)
  return (
    <group position={[x, y, 0]}>
      <Float speed={3} rotationIntensity={0} floatIntensity={0.4}>
        <mesh>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#E24B4A" emissive="#E24B4A" emissiveIntensity={0.6} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.55, 0.05, 12, 32]} />
          <meshStandardMaterial color="#E24B4A" emissive="#E24B4A" emissiveIntensity={0.4} />
        </mesh>
      </Float>
      {/* Feixe vertical até o chão */}
      <mesh position={[0, -y / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, y, 8]} />
        <meshStandardMaterial color="#E24B4A" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

// ── Modelo do drone (corpo + braços + 4 motores/hélices) ──
// OBJETIVO: construir o drone com primitivas 3D e ANIMÁ-LO a cada quadro: lê o
// estado vivo (simRef), move o drone para a posição calculada pela física,
// inclina-o conforme a saída de roll e gira as hélices proporcional ao empuxo.
function DroneModel({ simRef }) {
  const group = useRef()
  const p0 = useRef()
  const p1 = useRef()
  const p2 = useRef()
  const p3 = useRef()
  const props = [p0, p1, p2, p3]

  useFrame(() => {
    const s = simRef.current
    if (!group.current) return
    group.current.position.set(sceneX(s.x), sceneY(s.y) + 0.35, 0)
    group.current.rotation.z = -s.thrustX * MAX_TILT_RAD
    const spin = 0.5 + Math.abs(s.thrustY) * 1.1
    props.forEach((p, i) => {
      if (p.current) p.current.rotation.y += spin * (i % 2 ? 1 : -1)
    })
  })

  const motorPos = [
    [0.7, 0, 0.7],
    [-0.7, 0, -0.7],
    [0.7, 0, -0.7],
    [-0.7, 0, 0.7],
  ]

  return (
    <group ref={group} scale={0.85}>
      {/* Braços em X */}
      {[Math.PI / 4, -Math.PI / 4].map((rot, i) => (
        <mesh key={i} rotation={[0, rot, 0]} castShadow>
          <boxGeometry args={[2.0, 0.09, 0.14]} />
          <meshStandardMaterial color="#8a93a3" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {/* Corpo central */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[0.75, 0.3, 0.75]} />
        <meshStandardMaterial color="#378ADD" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cúpula superior */}
      <mesh castShadow position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2b6fb8" metalness={0.5} roughness={0.25} />
      </mesh>
      {/* "Câmera" frontal */}
      <mesh position={[0, -0.05, 0.4]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.1} />
      </mesh>

      {/* Motores + hélices */}
      {motorPos.map((m, i) => (
        <group key={i} position={[m[0], 0.05, m[2]]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.14, 0.16, 0.2, 16]} />
            <meshStandardMaterial color="#222630" metalness={0.6} roughness={0.4} />
          </mesh>
          <group ref={props[i]} position={[0, 0.14, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.95, 0.025, 0.12]} />
              <meshStandardMaterial color="#1D9E75" transparent opacity={0.85} />
            </mesh>
            <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[0.95, 0.025, 0.12]} />
              <meshStandardMaterial color="#1D9E75" transparent opacity={0.85} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
              <meshStandardMaterial color="#0c5c43" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
