import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import SeatingSummaryBar from '../components/seating/SeatingSummaryBar'
import SeatingGroupResult from '../components/seating/SeatingGroupResult'
import Button from '../components/ui/Button'
import { generateSeatingArrangementsAsync } from '../services/seatingService'
import GeneratingOverlay from '../components/ui/GeneratingOverlay'
import { loadClassroomConfig } from '../utils/classroomStorage'
import { loadStudentData } from '../utils/studentStorage'
import { downloadSeatingExcel } from '../utils/exportExcel'
import {
  ensureFreshSeating,
  ensureFreshSeatingAsync,
  needsSeatingRegeneration,
} from '../utils/regenerateSeating'

export default function SeatingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [results, setResults] = useState(() => {
    if (location.state?.results) return location.state.results
    return ensureFreshSeating()
  })
  const [regenerating, setRegenerating] = useState(() => needsSeatingRegeneration())
  const [regenerateProgress, setRegenerateProgress] = useState(null)
  const [exportMsg, setExportMsg] = useState(null)

  const studentData = useMemo(() => loadStudentData(), [])
  // Use current Dashboard config from localStorage (NOT stale config from seating results)
  // This ensures Results view uses the latest classroom configuration
  const config = useMemo(() => loadClassroomConfig(), [])

  // Debug: Log data source and configuration
  useEffect(() => {
    console.log('[RESULTS PAGE] Data Source Verification:')
    console.log('[RESULTS PAGE] Classroom config source: localStorage (current Dashboard config)')
    console.log('[RESULTS PAGE] Seating data source: localStorage (grit-auto-seating-result)')
    console.log('[RESULTS PAGE] Classroom count:', config?.classrooms?.length || 0)
    console.log('[RESULTS PAGE] Room configurations:', config?.classrooms?.map(r => ({
      roomName: r.roomName,
      rows: r.rows,
      columns: r.columns,
      studentsPerBench: r.studentsPerBench,
      orientation: r.orientation,
      capacity: r.rows * r.columns * r.studentsPerBench
    })))
    console.log('[RESULTS PAGE] Total students:', studentData?.rows?.length || 0)
    console.log('[RESULTS PAGE] Seating results:', {
      totalSeats: results?.finalSeating?.length || 0,
      totalOccupied: results?.finalSeating?.filter(s => s.status === 'Occupied').length || 0,
      totalEmpty: results?.finalSeating?.filter(s => s.status === 'Empty').length || 0,
      roomResults: results?.roomResults?.map(r => ({
        roomName: r.room?.roomName || r.room?.roomNumber,
        capacity: r.capacity,
        occupied: r.occupied,
        empty: r.empty
      }))
    })
    
    // Debug: Log room-specific data for each room
    if (results?.roomResults) {
      results.roomResults.forEach((roomResult, index) => {
        const roomName = roomResult.room?.roomName || roomResult.room?.roomNumber || `Room ${index + 1}`
        const occupiedSeats = roomResult.assignments?.filter(a => a.status === 'Occupied').length || 0
        console.log(`[RESULTS PAGE] Room ${roomName}:`, {
          roomId: roomResult.room?.id,
          roomConfig: {
            roomName: roomResult.room?.roomName,
            rows: roomResult.room?.rows,
            columns: roomResult.room?.columns,
            studentsPerBench: roomResult.room?.studentsPerBench,
            orientation: roomResult.room?.orientation
          },
          occupiedSeats,
          studentCount: occupiedSeats,
          orientation: roomResult.room?.orientation
        })
      })
    }
  }, [config, results, studentData])

  useEffect(() => {
    if (!needsSeatingRegeneration()) return undefined

    let cancelled = false
    setRegenerating(true)

    ensureFreshSeatingAsync(setRegenerateProgress).then((fresh) => {
      if (!cancelled && fresh) {
        setResults(fresh)
        // Debug: Log generated seating data
        console.log('[RESULTS DATA]', {
          success: fresh.success,
          totalSeats: fresh.finalSeating?.length || 0,
          totalOccupied: fresh.finalSeating?.filter(s => s.status === 'Occupied').length || 0,
          roomResults: fresh.roomResults?.map(r => ({
            roomName: r.room?.roomName || r.room?.roomNumber,
            capacity: r.capacity,
            occupied: r.occupied,
            config: {
              rows: r.room?.rows,
              columns: r.room?.columns,
              studentsPerBench: r.room?.studentsPerBench,
              orientation: r.room?.orientation
            }
          })),
          configSource: fresh.config ? 'results.config' : 'none',
          configClassrooms: fresh.config?.classrooms?.map(r => ({
            roomName: r.roomName,
            rows: r.rows,
            columns: r.columns,
            studentsPerBench: r.studentsPerBench,
            orientation: r.orientation
          }))
        })
      }
      if (!cancelled) {
        setRegenerating(false)
        setRegenerateProgress(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // If we navigated here with in-memory results, persist them for refreshes.
    if (location.state?.results) {
      try {
        localStorage.setItem('grit-auto-seating-result', JSON.stringify(location.state.results))
      } catch (err) {
        console.error('[GRIT] Failed to persist seating results from navigation state', err)
      }
    }
  }, [location.state])

  async function handleRegenerate() {
    if (!studentData?.rows?.length) {
      navigate('/upload')
      return
    }
    setRegenerating(true)
    setRegenerateProgress({ phase: 'starting', current: 0, total: 0 })
    try {
      const generated = await generateSeatingArrangementsAsync(
        studentData.rows,
        config,
        setRegenerateProgress,
      )
      localStorage.setItem('grit-auto-seating-result', JSON.stringify(generated))
      setResults(generated)
    } finally {
      setRegenerating(false)
      setRegenerateProgress(null)
    }
  }

  function handleDownloadExcel() {
    setExportMsg(null)
    const data = results ?? JSON.parse(localStorage.getItem('grit-auto-seating-result'))
    const ok = downloadSeatingExcel(data)
    if (ok) setExportMsg('Excel file downloaded.')
    else setExportMsg('No seating data to export.')
  }

  if (!results) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[var(--grit-gold)]">Seating arrangement</h1>
          <p className="mt-4 text-sm text-[var(--grit-cream)]/55">
            No seating generated yet. Upload a CSV and click Generate Seating.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" onClick={() => navigate('/upload')}>
              Go to Upload
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (results.configErrors?.length) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-bold text-[var(--grit-red-400)]">Configuration required</h1>
          <ul className="mt-4 list-inside list-disc text-sm text-[var(--grit-cream)]/70">
            {results.configErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <Button type="button" className="mt-6" onClick={() => navigate('/dashboard')}>
            Open Dashboard
          </Button>
        </div>
      </AppLayout>
    )
  }

  // Handle new seating result structure
  const isNewStructure = results.assignments && !results.groups

  return (
    <AppLayout>
      {regenerating && <GeneratingOverlay progress={regenerateProgress} />}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
              Results
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--grit-cream)] sm:text-3xl">
              Seating arrangement
            </h1>
            <p className="mt-1 text-xs text-[var(--grit-cream)]/45">
              {isNewStructure
                ? 'Single source of truth · capacity-based numbering'
                : 'Grouped by date & time slot · sections may mix across rooms'}
            </p>
            {results.generatedAt && (
              <p className="mt-2 text-xs text-[var(--grit-cream)]/40">
                Generated {new Date(results.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => navigate('/seating-editor-2d')}>
              Edit Seating (2D)
            </Button>
            <Button type="button" onClick={() => navigate('/visualization')}>
              View 3D Classroom
            </Button>
            <Button type="button" variant="secondary" onClick={handleDownloadExcel}>
              Download Excel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerate}
              disabled={regenerating}
            >
              {regenerating ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </div>
        </div>

        {exportMsg && (
          <p className="mb-4 text-sm text-[var(--grit-gold)]" role="status">
            {exportMsg}
          </p>
        )}

        {!results.success && (
          <div
            className="mb-6 rounded-xl border border-[var(--grit-red-400)]/40 bg-[var(--grit-red-600)]/10 px-4 py-3 text-sm text-[var(--grit-red-400)]"
            role="alert"
          >
            Some students could not be seated. Review unassigned lists below or add benches/rooms on
            the Dashboard.
          </div>
        )}

        {results.success && results.message && results.summary?.totalUnassigned === 0 && (
          <div
            className="mb-6 rounded-xl border border-[var(--grit-gold)]/30 bg-[var(--grit-gold)]/8 px-4 py-3 text-sm text-[var(--grit-cream)]/70"
            role="status"
          >
            {results.message}
          </div>
        )}

        {isNewStructure ? (
          <div className="space-y-6">
            <SeatingSummaryBar summary={results.summary} config={results.config} />
            
            <div className="rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--grit-cream)]">Room Results</h2>
              <div className="space-y-4">
                {(() => {
                  console.log('[ROOM RESULTS]', {
                    configuredRooms: config?.classrooms?.map(r => r.roomName || r.roomNumber),
                    roomResults: results.roomResults?.map(r => r.room?.roomName || r.room?.roomNumber),
                    generatedRooms: Object.keys(results.roomResults || {})
                  })
                  
                  // Render room cards based on config.classrooms (all configured rooms)
                  // instead of results.roomResults (which might not have all rooms)
                  const roomsToRender = config?.classrooms || []
                  
                  return roomsToRender.map((classroom, i) => {
                    // Find corresponding room result
                    const roomResult = results.roomResults?.find(
                      rr => rr.room?.id === classroom.id || 
                            rr.room?.roomName === classroom.roomName ||
                            rr.room?.roomNumber === classroom.roomNumber
                    )
                    
                    return (
                      <div key={classroom.id || i} className="rounded-lg border border-[var(--grit-brown-600)]/30 bg-[var(--grit-brown-900)]/30 p-4">
                        <h3 className="mb-2 font-medium text-[var(--grit-cream)]">
                          {classroom.roomName || classroom.roomNumber || 'Room'}
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-[var(--grit-cream)]/55">Capacity</p>
                            <p className="font-medium text-[var(--grit-gold)]">
                              {roomResult?.capacity ?? (classroom.rows * classroom.columns * classroom.studentsPerBench)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[var(--grit-cream)]/55">Occupied</p>
                            <p className="font-medium text-[var(--grit-cream)]">
                              {roomResult?.occupiedCount ?? roomResult?.occupied ?? 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-[var(--grit-cream)]/55">Empty</p>
                            <p className="font-medium text-[var(--grit-cream)]">
                              {roomResult?.emptyCount ?? roomResult?.empty ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--grit-cream)]">All Seats ({results.finalSeating?.length || results.assignments?.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--grit-brown-600)]/50">
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Seat No</th>
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Bench No</th>
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Room</th>
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Student</th>
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">NIAT ID</th>
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Skill</th>
                      <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.finalSeating || results.assignments).map((assignment, i) => (
                      <tr key={i} className="border-b border-[var(--grit-brown-600)]/30">
                        <td className="px-4 py-2 text-[var(--grit-cream)]">{assignment.seatingNo ?? assignment.seatNo}</td>
                        <td className="px-4 py-2 text-[var(--grit-cream)]">{assignment.benchNo}</td>
                        <td className="px-4 py-2 text-[var(--grit-cream)]">{assignment.room ?? assignment.roomName ?? assignment.roomNumber}</td>
                        <td className="px-4 py-2 text-[var(--grit-cream)]">{assignment.studentName ?? assignment.student}</td>
                        <td className="px-4 py-2 text-[var(--grit-cream)]">{assignment.niatId ?? assignment.studentId}</td>
                        <td className="px-4 py-2 text-[var(--grit-cream)]">{assignment.skillName ?? assignment.skill ?? assignment.skillCode}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block rounded px-2 py-1 text-xs ${
                            assignment.status === 'Occupied'
                              ? 'bg-[var(--grit-gold)]/20 text-[var(--grit-gold)]'
                              : 'bg-[var(--grit-brown-600)]/30 text-[var(--grit-cream)]/55'
                          }`}>
                            {assignment.status ?? 'Occupied'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <>
            <SeatingSummaryBar summary={results.summary} config={results.config} />

            <div className="mt-8 space-y-4">
              {results.groups?.map((group, i) => (
                <SeatingGroupResult key={group.groupKey} group={group} defaultOpen={i === 0} />
              ))}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--grit-brown-600)]/50 pt-8 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button type="button" onClick={() => navigate('/seating-editor-2d')}>
            Edit Seating (2D)
          </Button>
          <Button type="button" onClick={() => navigate('/visualization')}>
            View 3D Classroom
          </Button>
          <Button type="button" variant="secondary" onClick={handleDownloadExcel}>
            Download Excel
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
