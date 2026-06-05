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
  const config = useMemo(() => loadClassroomConfig(), [])

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

  const roomAssignments = useMemo(() => {
    if (!results?.finalSeating || !activeRoom) return []
    const roomName = activeRoom.roomName ?? activeRoom.roomNumber ?? ''
    return results.finalSeating.filter(
      (a) => a.room === roomName || a.roomName === roomName,
    )
  }, [results, activeRoom])

  const skills = useMemo(
    () => [...new Set(roomAssignments.map((a) => a.skillCode).filter(Boolean))],
    [roomAssignments],
  )

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

        <Classroom3DScene
          roomNumber={activeRoom?.roomName ?? activeRoom?.roomNumber}
          assignments={roomAssignments}
          roomConfig={activeRoom}
        />

        <p className="mt-3 text-center text-xs text-[var(--grit-cream)]/40">
          {roomAssignments.filter((a) => a.status === 'Occupied').length} student(s) · {roomAssignments.filter((a) => a.status === 'Empty').length} empty seat(s)
        </p>
      </div>
    </AppLayout>
  )
}
