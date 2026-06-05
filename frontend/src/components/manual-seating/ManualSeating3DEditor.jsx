import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Center } from '@react-three/drei'
import * as THREE from 'three'
import { skillToColor } from '../../utils/skillColors'
import { rowColFromBenchNumber } from '../../utils/classroomLayout'
import CameraViewButtons from '../visualization/CameraViewButtons'

const BENCH_W = 4.8
const BENCH_D = 1.6
const BENCH_GAP_X = 3.2
const BENCH_GAP_Z = 3.4
const SEAT_SPACING = 1.15
const LABEL_Y = 1.45

const CAMERA_PRESETS = {
  top: { position: [0, 32, 0.01], target: [0, 0, 0] },
  front: { position: [0, 12, 28], target: [0, 0, 0] },
  side: { position: [28, 12, 0], target: [0, 0, 0] },
  iso: { position: [18, 16, 18], target: [0, 0, 0] },
  reset: { position: [0, 14, 20], target: [0, 0.5, 0] },
}

function EditableSeatMarker({ seat, offsetX, selected, onSelect }) {
  const code = seat.skillCode || '—'
  const color = seat.skillCode ? skillToColor(seat.skillCode) : '#5c3a2e'

  return (
    <group position={[offsetX, 0, 0]}>
      <mesh
        position={[0, 0.45, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          onSelect(seat.id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <boxGeometry args={[0.75, 0.58, 0.7]} />
        <meshStandardMaterial
          color={color}
          metalness={0.12}
          roughness={0.5}
          emissive={selected ? '#c9a227' : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      <group position={[0, LABEL_Y, 0]}>
        <Text
          position={[0, 0.55, 0]}
          fontSize={0.22}
          color="#f5ebe0"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#1a0f0a"
        >
          {`B${seat.benchNumber}`}
        </Text>
        <Text
          position={[0, 0.28, 0]}
          fontSize={0.24}
          color="#c9a227"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#1a0f0a"
        >
          {`Seat ${seat.seatingNo}`}
        </Text>
        <Text
          position={[0, 0, 0]}
          fontSize={0.26}
          color="#f5ebe0"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.025}
          outlineColor="#1a0f0a"
          maxWidth={2.2}
        >
          {code}
        </Text>
      </group>
    </group>
  )
}

function Bench3DEditable({ benchNumber, seats, position, selectedSeatId, onSelectSeat }) {
  const spb = Math.max(seats.length, 1)
  const startX = -((spb - 1) * SEAT_SPACING) / 2

  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[BENCH_W, 0.22, BENCH_D]} />
        <meshStandardMaterial color="#3d281c" roughness={0.78} />
      </mesh>
      {seats.map((seat) => (
        <EditableSeatMarker
          key={seat.id}
          seat={seat}
          offsetX={startX + seat.seatIndex * SEAT_SPACING}
          selected={selectedSeatId === seat.id}
          onSelect={onSelectSeat}
        />
      ))}
    </group>
  )
}

function CameraAnimator({ preset, floorW, floorD, controlsRef }) {
  const { camera } = useThree()
  const animRef = useRef(null)

  useEffect(() => {
    const p = CAMERA_PRESETS[preset] ?? CAMERA_PRESETS.reset
    const dist = Math.max(floorW, floorD)
    const scaled = p.position.map((v, i) => {
      if (i === 0 && Math.abs(v) > 10) return (v / 28) * (dist * 0.9 + 8)
      if (i === 1 && v > 5) return (v / 32) * (dist * 0.55 + 10)
      if (i === 2 && Math.abs(v) > 10) return (v / 28) * (dist * 0.9 + 8)
      return v
    })
    animRef.current = {
      startPos: camera.position.clone(),
      endPos: new THREE.Vector3(...scaled),
      startTarget: controlsRef.current?.target?.clone() ?? new THREE.Vector3(0, 0.5, 0),
      endTarget: new THREE.Vector3(...(p.target ?? [0, 0.5, 0])),
      t: 0,
      duration: 0.85,
    }
  }, [preset, floorW, floorD, camera, controlsRef])

  useFrame((_, delta) => {
    const anim = animRef.current
    if (!anim || anim.t >= anim.duration) return
    anim.t += delta
    const k = Math.min(1, anim.t / anim.duration)
    const ease = 1 - (1 - k) ** 3
    camera.position.lerpVectors(anim.startPos, anim.endPos, ease)
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(anim.startTarget, anim.endTarget, ease)
      controlsRef.current.update()
    }
  })

  return null
}

function SceneContent({ roomNumber, seats, roomConfig, cameraPreset, controlsRef, selectedSeatId, onSelectSeat }) {
  const layout = useMemo(() => {
    const rows = Number(roomConfig?.rows) || 1
    const columns = Number(roomConfig?.columns) || 1
    const byBench = {}
    seats.forEach((s) => {
      if (!byBench[s.benchNumber]) byBench[s.benchNumber] = []
      byBench[s.benchNumber].push(s)
    })
    Object.values(byBench).forEach((list) => list.sort((a, b) => a.seatIndex - b.seatIndex))

    const floorW = columns * (BENCH_W + BENCH_GAP_X) + 8
    const floorD = rows * (BENCH_D + BENCH_GAP_Z) + 8

    const positioned = Object.entries(byBench).map(([num, benchSeats]) => {
      const benchNumber = Number(num)
      const { row, col } = rowColFromBenchNumber(benchNumber, columns)
      const x = (col - (columns - 1) / 2) * (BENCH_W + BENCH_GAP_X)
      const z = (row - (rows - 1) / 2) * (BENCH_D + BENCH_GAP_Z)
      return { benchNumber, seats: benchSeats, position: [x, 0, z] }
    })

    return { positioned, floorW, floorD, rows, columns }
  }, [seats, roomConfig])

  const dist = Math.max(layout.floorW, layout.floorD)

  return (
    <>
      <color attach="background" args={['#1f120c']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[14, 22, 12]} intensity={1.3} castShadow />
      <Center position={[0, 6, -layout.floorD / 2 - 2]}>
        <Text fontSize={0.6} color="#c9a227" anchorX="center" outlineWidth={0.035} outlineColor="#1a0f0a">
          {roomNumber}
        </Text>
      </Center>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[layout.floorW, layout.floorD]} />
        <meshStandardMaterial color="#2c1810" roughness={0.92} />
      </mesh>
      {layout.positioned.map(({ benchNumber, seats: benchSeats, position }) => (
        <Bench3DEditable
          key={benchNumber}
          benchNumber={benchNumber}
          seats={benchSeats}
          position={position}
          selectedSeatId={selectedSeatId}
          onSelectSeat={onSelectSeat}
        />
      ))}
      <CameraAnimator preset={cameraPreset} floorW={layout.floorW} floorD={layout.floorD} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={dist * 0.25}
        maxDistance={dist * 2.8}
        target={[0, 0.8, 0]}
      />
    </>
  )
}

export default function ManualSeating3DEditor({
  roomNumber,
  seats,
  roomConfig,
  selectedSeatId,
  onSelectSeat,
}) {
  const controlsRef = useRef()
  const [cameraPreset, setCameraPreset] = useState('reset')

  const rows = Number(roomConfig?.rows) || 1
  const cols = Number(roomConfig?.columns) || 1
  const dist = Math.max(cols * (BENCH_W + BENCH_GAP_X) + 8, rows * (BENCH_D + BENCH_GAP_Z) + 8)

  return (
    <div className="space-y-3">
      <CameraViewButtons activeView={cameraPreset} onSelect={setCameraPreset} />
      <p className="text-xs text-[var(--grit-cream)]/40">Click a seat to edit · synced with 2D</p>
      <div className="h-[520px] overflow-hidden rounded-2xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)]">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 14, 20], fov: 40, near: 0.1, far: Math.max(120, dist * 4) }}
          gl={{ antialias: true }}
          style={{ touchAction: 'none' }}
        >
          <SceneContent
            roomNumber={roomNumber}
            seats={seats}
            roomConfig={roomConfig}
            cameraPreset={cameraPreset}
            controlsRef={controlsRef}
            selectedSeatId={selectedSeatId}
            onSelectSeat={onSelectSeat}
          />
        </Canvas>
      </div>
    </div>
  )
}
