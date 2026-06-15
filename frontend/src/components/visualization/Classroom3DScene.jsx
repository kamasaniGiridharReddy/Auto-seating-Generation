import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Center } from '@react-three/drei'
import * as THREE from 'three'
import { skillToColor } from '../../utils/skillColors'
import { getFirstName, getSkillShortCode, formatSeatLabel } from '../../utils/skillLabels'
import { rowColFromBenchNumber } from '../../utils/classroomLayout'
import CameraViewButtons from './CameraViewButtons'

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

function FloatingLabel({ position, children, fontSize = 0.24, color = '#f5ebe0', visible = true }) {
  if (!visible) return null
  return (
    <Text
      position={position}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="bottom"
      outlineWidth={0.015}
      outlineColor="#1a0f0a"
      maxWidth={2.4}
    >
      {children}
    </Text>
  )
}

function SeatMarker({ assignment, offsetX, zoomLevel = 1, performanceMode = false }) {
  const isEmpty = assignment.status === 'Empty'
  const color = isEmpty ? '#3d281c' : skillToColor(assignment.skillCode || assignment.skill)
  const firstName = getFirstName(assignment.studentName)
  const skillCode = getSkillShortCode(assignment.skillCode || assignment.skill)
  const seatLabel = formatSeatLabel(assignment.seatNo || assignment.seatingNo)
  const bookingId = assignment.bookingId || ''

  // Diagnostic logging for undefined values
  if (!isEmpty && !performanceMode) {
    if (!assignment.studentName || !assignment.skillCode || !assignment.skill) {
      console.warn('[3D SEAT MARKER] Undefined student data:', {
        seatNo: assignment.seatNo || assignment.seatingNo,
        studentName: assignment.studentName,
        skillCode: assignment.skillCode,
        skill: assignment.skill,
        bookingId: assignment.bookingId,
        status: assignment.status,
        room: assignment.room || assignment.roomName,
        fullAssignment: assignment
      })
    }
  }

  // Performance mode: hide all text labels and disable shadows
  if (performanceMode) {
    return (
      <group position={[offsetX, 0, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.75, 0.58, 0.7]} />
          <meshStandardMaterial color={color} metalness={0.12} roughness={0.5} />
        </mesh>
      </group>
    )
  }

  // Zoom-based visibility: show less detail when zoomed out
  const showFullDetails = zoomLevel > 0.6
  const showSkill = zoomLevel > 0.4
  const showSeat = zoomLevel > 0.3
  const showBookingId = zoomLevel > 0.7 && bookingId

  return (
    <group position={[offsetX, 0, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.75, 0.58, 0.7]} />
        <meshStandardMaterial color={color} metalness={0.12} roughness={0.5} />
      </mesh>
      {!isEmpty && (
        <group position={[0, LABEL_Y, 0]}>
          <FloatingLabel position={[0, 0.35, 0]} fontSize={0.18} color="#f5ebe0" visible={showFullDetails}>
            {firstName}
          </FloatingLabel>
          <FloatingLabel position={[0, 0.15, 0]} fontSize={0.14} color="#c9a227" visible={showSkill}>
            {skillCode}
          </FloatingLabel>
          <FloatingLabel position={[0, 0, 0]} fontSize={0.16} color="#f5ebe0" visible={showSeat}>
            {seatLabel}
          </FloatingLabel>
          <FloatingLabel position={[0, -0.15, 0]} fontSize={0.12} color="#c9a227" visible={showBookingId}>
            {bookingId}
          </FloatingLabel>
        </group>
      )}
    </group>
  )
}

function Bench3D({ benchNumber, assignments, position, zoomLevel = 1, studentsPerBench = 2, performanceMode = false }) {
  const spb = Number(studentsPerBench) || 2
  const startX = -((spb - 1) * SEAT_SPACING) / 2

  // Create a map of seatIndex to assignment
  const assignmentMap = {}
  assignments.forEach(a => {
    assignmentMap[a.seatIndex || 0] = a
  })

  // Render ALL seats based on studentsPerBench (not just occupied)
  const seatAssignments = []
  for (let i = 0; i < spb; i++) {
    seatAssignments.push(assignmentMap[i] || {
      status: 'Empty',
      seatIndex: i,
      seatNo: null,
      studentName: '',
      skillCode: '',
      skill: '',
    })
  }

  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[BENCH_W, 0.22, BENCH_D]} />
        <meshStandardMaterial color="#3d281c" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[BENCH_W - 0.25, 0.05, BENCH_D - 0.2]} />
        <meshStandardMaterial color="#5c3a2e" roughness={0.72} />
      </mesh>
      {!performanceMode && (
        <Text
          position={[0, 0.04, -BENCH_D / 2 - 0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.18}
          color="#c9a227"
          anchorX="center"
          outlineWidth={0.012}
          outlineColor="#1a0f0a"
        >
          {`B${benchNumber}`}
        </Text>
      )}
      {seatAssignments.map((a) => (
        <SeatMarker
          key={`${benchNumber}-${a.seatIndex}`}
          assignment={a}
          offsetX={startX + (a.seatIndex || 0) * SEAT_SPACING}
          zoomLevel={zoomLevel}
          performanceMode={performanceMode}
        />
      ))}
    </group>
  )
}

function ClassroomFloor({ width, depth }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#2c1810" roughness={0.92} />
    </mesh>
  )
}

function RoomTitle({ roomNumber, z }) {
  return (
    <Center position={[0, 6, z]}>
      <Text
        fontSize={0.6}
        color="#c9a227"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.035}
        outlineColor="#1a0f0a"
      >
        {roomNumber}
      </Text>
    </Center>
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

function SceneContent({ roomNumber, assignments, roomConfig, cameraPreset, controlsRef, performanceMode = false }) {
  const { camera } = useThree()
  const [zoomLevel, setZoomLevel] = useState(1)
  
  const layout = useMemo(() => {
    const rows = Number(roomConfig?.rows) || 1
    const columns = Number(roomConfig?.columns) || 1
    const orientation = roomConfig?.orientation || 'horizontal'
    const studentsPerBench = Number(roomConfig?.studentsPerBench) || 2

    if (!performanceMode) {
      console.log('[3D ROOM]', {
        roomName: roomConfig?.roomName || roomNumber,
        rows,
        columns,
        studentsPerBench,
        orientation,
        expectedBenches: rows * columns
      })
    }

    // Group assignments by bench number
    const byBench = {}
    assignments.forEach((a) => {
      if (!byBench[a.benchNo]) byBench[a.benchNo] = []
      byBench[a.benchNo].push(a)
    })
    Object.values(byBench).forEach((seats) =>
      seats.sort((a, b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    )

    const floorW = columns * (BENCH_W + BENCH_GAP_X) + 8
    const floorD = rows * (BENCH_D + BENCH_GAP_Z) + 8

    // Generate ALL bench positions from room config (rows × columns)
    // This ensures the full grid is rendered even if some benches are empty
    const positioned = []
    for (let benchNumber = 1; benchNumber <= rows * columns; benchNumber++) {
      const { row, col } = rowColFromBenchNumber(benchNumber, columns, rows, orientation)
      const x = (col - (columns - 1) / 2) * (BENCH_W + BENCH_GAP_X)
      const z = (row - (rows - 1) / 2) * (BENCH_D + BENCH_GAP_Z)
      
      // Get assignments for this bench (if any)
      const benchAssignments = byBench[benchNumber] || []
      
      positioned.push({
        benchNumber,
        assignments: benchAssignments,
        position: [x, 0, z]
      })
    }

    if (!performanceMode) {
      console.log('[3D RENDERED BENCHES]', {
        renderedBenchCount: positioned.length,
        expectedBenchCount: rows * columns,
        occupiedBenchCount: Object.keys(byBench).length,
        emptyBenchCount: positioned.length - Object.keys(byBench).length
      })
    }

    return { positioned, floorW, floorD, rows, columns }
  }, [assignments, roomConfig, roomNumber])

  const dist = Math.max(layout.floorW, layout.floorD)
  
  // Track zoom level for label visibility
  useFrame(() => {
    if (controlsRef.current) {
      const distance = camera.position.distanceTo(controlsRef.current.target)
      const normalizedZoom = Math.max(0, Math.min(1, 1 - (distance - dist * 0.25) / (dist * 2.55)))
      setZoomLevel(normalizedZoom)
    }
  })

  return (
    <>
      <color attach="background" args={['#1f120c']} />
      <fog attach="fog" args={['#1f120c', dist * 1.2, dist * 3.5]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.4} groundColor="#2c1810" color="#f5ebe0" />
      <directionalLight
        position={[14, 22, 12]}
        intensity={1.3}
        castShadow
        shadow-mapSize={performanceMode ? [1024, 1024] : [2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <pointLight position={[-10, 12, -8]} intensity={0.45} color="#c9a227" />

      {!performanceMode && <RoomTitle roomNumber={roomNumber} z={-layout.floorD / 2 - 2} />}
      <ClassroomFloor width={layout.floorW} depth={layout.floorD} />

      {layout.positioned.map(({ benchNumber, assignments: seats, position }) => (
        <Bench3D
          key={benchNumber}
          benchNumber={benchNumber}
          assignments={seats}
          position={position}
          zoomLevel={zoomLevel}
          studentsPerBench={Number(roomConfig?.studentsPerBench) || 2}
          performanceMode={performanceMode}
        />
      ))}

      <CameraAnimator
        preset={cameraPreset}
        floorW={layout.floorW}
        floorD={layout.floorD}
        controlsRef={controlsRef}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate
        enablePan
        enableZoom
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.85}
        zoomSpeed={1.1}
        panSpeed={0.9}
        minDistance={dist * 0.25}
        maxDistance={dist * 2.8}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI / 2 - 0.08}
        target={[0, 0.8, 0]}
      />
    </>
  )
}

export default function Classroom3DScene({ roomNumber, assignments, roomConfig, performanceMode = false }) {
  const controlsRef = useRef()
  const [cameraPreset, setCameraPreset] = useState('reset')

  const occupiedAssignments = assignments?.filter(a => a.status !== 'Empty') || []

  if (!occupiedAssignments?.length && !assignments?.length) {
    return (
      <div className="flex h-[640px] items-center justify-center rounded-2xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)]">
        <p className="text-sm text-[var(--grit-cream)]/45">No seating data for this room.</p>
      </div>
    )
  }

  const rows = Number(roomConfig?.rows) || 1
  const cols = Number(roomConfig?.columns) || 1
  const dist = Math.max(
    cols * (BENCH_W + BENCH_GAP_X) + 8,
    rows * (BENCH_D + BENCH_GAP_Z) + 8,
  )

  return (
    <div className="space-y-3">
      <CameraViewButtons activeView={cameraPreset} onSelect={setCameraPreset} />
      <p className="text-xs text-[var(--grit-cream)]/40">
        Drag to rotate · scroll to zoom · right-drag to pan · 360° classroom view
      </p>
      <div className="h-[640px] overflow-hidden rounded-2xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)]">
        <Canvas
          shadows
          dpr={performanceMode ? [1, 1] : [1, 2]}
          camera={{
            position: [0, 14, 20],
            fov: 40,
            near: 0.1,
            far: Math.max(120, dist * 4),
          }}
          gl={{ antialias: !performanceMode }}
          style={{ touchAction: 'none' }}
        >
          <SceneContent
            roomNumber={roomNumber}
            assignments={assignments}
            roomConfig={roomConfig}
            cameraPreset={cameraPreset}
            controlsRef={controlsRef}
            performanceMode={performanceMode}
          />
        </Canvas>
      </div>
    </div>
  )
}
