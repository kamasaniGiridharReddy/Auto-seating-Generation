import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Classroom3DScene from '../components/visualization/Classroom3DScene'
import SkillLegend from '../components/visualization/SkillLegend'
import Button from '../components/ui/Button'
import { loadClassroomConfig } from '../utils/classroomStorage'
import GeneratingOverlay from '../components/ui/GeneratingOverlay'
import {
  ensureFreshSeating,
  ensureFreshSeatingAsync,
  needsSeatingRegeneration,
} from '../utils/regenerateSeating'

export default function VisualizationPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState(() => ensureFreshSeating())
  const [loading, setLoading] = useState(() => needsSeatingRegeneration())
  const [loadProgress, setLoadProgress] = useState(null)
  // Use current Dashboard config from localStorage (NOT stale config from seating results)
  // This ensures 3D view uses the latest classroom configuration
  const config = useMemo(() => loadClassroomConfig(), [])

  // Debug: Log data source and configuration
  useEffect(() => {
    console.log('[3D VIEWER] Data Source Verification:')
    console.log('[3D VIEWER] Classroom config source: localStorage (current Dashboard config)')
    console.log('[3D VIEWER] Seating data source: localStorage (grit-auto-seating-result)')
    console.log('[3D VIEWER] Classroom count:', config?.classrooms?.length || 0)
    console.log('[3D VIEWER] Room configurations:', config?.classrooms?.map(r => ({
      roomName: r.roomName,
      rows: r.rows,
      columns: r.columns,
      studentsPerBench: r.studentsPerBench,
      orientation: r.orientation,
      capacity: r.rows * r.columns * r.studentsPerBench
    })))
    console.log('[3D VIEWER] Total seats in seating data:', results?.finalSeating?.length || 0)
  }, [config, results])

  useEffect(() => {
    if (!needsSeatingRegeneration()) return undefined

    let cancelled = false
    setLoading(true)

    ensureFreshSeatingAsync(setLoadProgress).then((fresh) => {
      if (!cancelled && fresh) setResults(fresh)
      if (!cancelled) {
        setLoading(false)
        setLoadProgress(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const classrooms = config.classrooms ?? []

  const [roomId, setRoomId] = useState(classrooms[0]?.id ?? '')

  useEffect(() => {
    if (classrooms.length && !classrooms.find((r) => r.id === roomId)) {
      setRoomId(classrooms[0].id)
    }
  }, [classrooms, roomId])

  const activeRoom = classrooms.find((r) => r.id === roomId) ?? classrooms[0]

  // Normalize room name for safe comparison
  const normalizeRoomName = (room) => {
    return String(room || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
  }

  // Universal room name extractor - checks all possible field names
  const getRoomName = (seat) => {
    return (
      seat.roomName ||
      seat.room ||
      seat.Room ||
      seat.ROOM ||
      seat.room_name ||
      seat.classroom ||
      seat.roomNumber ||
      ''
    )
  }

  const roomAssignments = useMemo(() => {
    if (!results?.assignments || !activeRoom) return []
    const roomName = activeRoom.roomName ?? activeRoom.roomNumber ?? ''
    
    // DIAGNOSTICS: Check room field mapping
    console.log('[3D ROOM FILTERING] Active Room:', roomName)
    console.log('[3D ROOM FILTERING] Total assignments:', results.assignments.length)
    
    // Filter assignments for this room (directly from assignments array)
    const filtered = results.assignments.filter(
      (a) => normalizeRoomName(a.roomName) === normalizeRoomName(roomName),
    )
    
    console.log('[3D ROOM FILTERING] Matched assignments:', filtered.length)
    
    // Sort by bench number, then seat index to ensure physical ordering
    const sorted = filtered.sort((a, b) => {
      if (a.benchNo !== b.benchNo) {
        return a.benchNo - b.benchNo
      }
      return a.seatIndex - b.seatIndex
    })
    
    // Validation: occupiedSeats === records found in assignments for this room
    const occupiedSeats = sorted.filter(a => a.status === 'Occupied').length
    const emptySeats = sorted.filter(a => a.status === 'Empty').length
    console.log('[3D ROOM FILTERING] Occupied seats:', occupiedSeats)
    console.log('[3D ROOM FILTERING] Empty seats:', emptySeats)
    
    // Return assignments in physical order
    return sorted
  }, [results, activeRoom])

  const skills = useMemo(
    () => [...new Set(roomAssignments.map((a) => a.skillCode).filter(Boolean))],
    [roomAssignments],
  )

  const occupiedCount = roomAssignments.filter((a) => a.status === 'Occupied').length
  const performanceMode = occupiedCount > 1000

  if (!results?.finalSeating?.length) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[var(--grit-gold)]">3D Classroom</h1>
          <p className="mt-4 text-sm text-[var(--grit-cream)]/55">
            Generate seating first to view the 3D layout.
          </p>
          <Button type="button" className="mt-8" onClick={() => navigate('/upload')}>
            Upload & Generate
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {loading && <GeneratingOverlay progress={loadProgress} />}
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
              3D View
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--grit-cream)]">Classroom visualization</h1>
            <p className="mt-2 text-sm text-[var(--grit-cream)]/55">
              Scroll to zoom · drag to rotate · right-drag to pan
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => navigate('/seating')}>
            Back to Results
          </Button>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--grit-cream)]/55">
            Room
          </label>
          <select
            value={activeRoom?.id ?? ''}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full rounded-xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-800)] px-4 py-2.5 text-sm text-[var(--grit-cream)]"
          >
            {classrooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomName ?? r.roomNumber}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <SkillLegend skills={skills} />
        </div>

        {performanceMode && (
          <div className="mb-4 rounded-xl border border-[var(--grit-amber-600)] bg-[var(--grit-amber-900)]/30 px-4 py-3">
            <p className="text-sm font-medium text-[var(--grit-amber-200)]">
              ⚠️ Large dataset detected. Performance Mode enabled.
            </p>
            <p className="mt-1 text-xs text-[var(--grit-amber-200)]/70">
              Student names, skills, and booking IDs hidden for better performance.
            </p>
          </div>
        )}

        <Classroom3DScene
          roomNumber={activeRoom?.roomName ?? activeRoom?.roomNumber}
          assignments={roomAssignments}
          roomConfig={activeRoom}
          performanceMode={performanceMode}
        />

        <p className="mt-3 text-center text-xs text-[var(--grit-cream)]/40">
          {roomAssignments.filter((a) => a.status === 'Occupied').length} student(s) · {roomAssignments.filter((a) => a.status === 'Empty').length} empty seat(s)
        </p>
      </div>
    </AppLayout>
  )
}
