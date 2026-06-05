import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import SkillSourcePanel from '../components/manual-seating/SkillSourcePanel'
import SkillMappingTable from '../components/manual-seating/SkillMappingTable'
import ManualSeating2DEditor from '../components/manual-seating/ManualSeating2DEditor'
import ManualSeating3DEditor from '../components/manual-seating/ManualSeating3DEditor'
import SeatEditPanel from '../components/manual-seating/SeatEditPanel'
import ValidationWarnings from '../components/manual-seating/ValidationWarnings'
import { loadClassroomConfig } from '../utils/classroomStorage'
import { loadStudentData } from '../utils/studentStorage'
import {
  saveSkillMapping,
  loadSkillMapping,
  saveManualSeatingLayout,
  loadManualSeatingLayout,
  saveManualSeatingResult,
} from '../utils/manualSeatingStorage'
import {
  buildSkillMapping,
  mappingArrayToRecord,
  mappingRecordToArray,
  extractUniqueSkillsFromRows,
  extractUniqueSkillsFromText,
  getAllShortCodes,
} from '../utils/skillMapping'
import {
  buildEmptyLayout,
  mergeSeatsForGroup,
  updateSeatSkillCode,
  updateGroupSeat,
  clearLayoutSkillCodes,
  resetAllStudents,
  autoFillStudents,
  swapStudents,
  moveStudent,
  validateAllRooms,
  buildManualResultsPayload,
  extractSlotGroups,
} from '../services/manualSeatingService'
import { downloadManualSeatingExcelFromState } from '../utils/exportManualExcel'
import { useCsvUpload } from '../hooks/useCsvUpload'

export default function ManualSeatingPage() {
  const navigate = useNavigate()
  const csvInputRef = useRef(null)
  const config = useMemo(() => loadClassroomConfig(), [])
  const classrooms = config.classrooms ?? []

  const csvHook = useCsvUpload()
  const storedCsv = useMemo(() => loadStudentData(), [])
  const csvRows = csvHook.rows?.length ? csvHook.rows : (storedCsv?.rows ?? [])

  const [skillText, setSkillText] = useState('')
  const [mapping, setMapping] = useState(() => mappingRecordToArray(loadSkillMapping()))
  const [studioState, setStudioState] = useState(() => {
    const saved = loadManualSeatingLayout()
    if (saved?.layoutSeats?.length) return saved
    return buildEmptyLayout(classrooms)
  })
  const [activeRoomId, setActiveRoomId] = useState(classrooms[0]?.id ?? '')
  const [activeGroupKey, setActiveGroupKey] = useState(studioState.activeGroupKey ?? '')
  const [viewMode, setViewMode] = useState('2d')
  const [selectedSeatId, setSelectedSeatId] = useState(null)
  const [editSeatId, setEditSeatId] = useState(null)
  const [warningsDismissed, setWarningsDismissed] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  const mappingRecord = useMemo(() => mappingArrayToRecord(mapping), [mapping])
  const skillCodes = useMemo(() => getAllShortCodes(mappingRecord), [mappingRecord])
  const slotGroups = useMemo(() => extractSlotGroups(csvRows), [csvRows])

  useEffect(() => {
    if (slotGroups.length && !activeGroupKey) {
      setActiveGroupKey(slotGroups[0].groupKey)
    }
  }, [slotGroups, activeGroupKey])

  const effectiveGroupKey = activeGroupKey || slotGroups[0]?.groupKey || 'manual-default'

  const mergedSeats = useMemo(
    () => mergeSeatsForGroup({ ...studioState, activeGroupKey: effectiveGroupKey }, effectiveGroupKey),
    [studioState, effectiveGroupKey],
  )

  const activeRoom = classrooms.find((r) => r.id === activeRoomId) ?? classrooms[0]
  const roomSeats = useMemo(
    () => mergedSeats.filter((s) => s.classroomId === activeRoom?.id),
    [mergedSeats, activeRoom],
  )

  const warnings = useMemo(
    () => validateAllRooms(studioState, classrooms),
    [studioState, classrooms],
  )

  const selectedSeat = mergedSeats.find((s) => s.id === editSeatId) ?? null

  const persistMapping = useCallback((entries) => {
    setMapping(entries)
    saveSkillMapping(mappingArrayToRecord(entries))
  }, [])

  const persistState = useCallback((next) => {
    setStudioState(next)
    saveManualSeatingLayout({ ...next, activeGroupKey: effectiveGroupKey })
  }, [effectiveGroupKey])

  function handleExtractFromCsv() {
    const skills = extractUniqueSkillsFromRows(csvRows)
    if (!skills.length) {
      setStatusMsg('No skills found in CSV. Upload a student CSV first.')
      return
    }
    const entries = buildSkillMapping(skills, mappingArrayToRecord(mapping))
    persistMapping(entries)
    setStatusMsg(`Extracted ${skills.length} skill(s) from CSV.`)
  }

  function handleApplyManualSkills() {
    const skills = extractUniqueSkillsFromText(skillText)
    if (!skills.length) {
      setStatusMsg('Enter at least one skill per line.')
      return
    }
    const entries = buildSkillMapping(skills, mappingArrayToRecord(mapping))
    persistMapping(entries)
    setStatusMsg(`Applied ${skills.length} manual skill(s).`)
  }

  function handleMappingChange(idx, shortCode) {
    const next = mapping.map((e, i) => (i === idx ? { ...e, shortCode } : e))
    persistMapping(next)
  }

  function handleSeatChange(seatIdKey, skillCode) {
    persistState(updateSeatSkillCode(studioState, seatIdKey, skillCode))
  }

  function handlePaletteSelect(code) {
    if (selectedSeatId) {
      handleSeatChange(selectedSeatId, code)
    }
  }

  function handleUpdateStudent(seatIdKey, patch) {
    persistState(updateGroupSeat(studioState, effectiveGroupKey, seatIdKey, patch))
  }

  function handleClearStudent(seatIdKey) {
    handleUpdateStudent(seatIdKey, {
      studentName: '',
      studentUid: '',
      niatId: '',
      bookingId: '',
      skill: '',
    })
  }

  function handleAutoFill() {
    if (!csvRows.length) {
      setStatusMsg('Import CSV first (Upload CSV page or Import CSV here).')
      return
    }
    if (!skillCodes.length) {
      setStatusMsg('Configure skill mapping before auto-fill.')
      return
    }
    const hasSkills = studioState.layoutSeats.some((s) => s.skillCode)
    if (!hasSkills) {
      setStatusMsg('Design seat skill pattern in 2D/3D before auto-fill.')
      return
    }
    const next = autoFillStudents(studioState, csvRows, mappingRecord, null)
    persistState(next)
    setStatusMsg('Students auto-filled by skill (FIFO).')
  }

  function handleSaveManualSeating() {
    const payload = buildManualResultsPayload(studioState, classrooms, mappingRecord, csvRows)
    saveManualSeatingResult(payload)
    persistState(studioState)
    setStatusMsg('Manual seating saved. Results page will show this layout.')
  }

  function handleDownloadExcel() {
    const ok = downloadManualSeatingExcelFromState(
      studioState,
      mappingRecord,
      classrooms,
      csvRows,
    )
    setStatusMsg(ok ? 'Excel downloaded.' : 'Nothing to export — design seats first.')
  }

  function handleClearLayout() {
    if (!window.confirm('Clear all skill codes from the layout?')) return
    persistState(clearLayoutSkillCodes(studioState))
    setStatusMsg('Layout skill codes cleared.')
  }

  function handleResetStudents() {
    if (!window.confirm('Remove all assigned student names?')) return
    persistState(resetAllStudents(studioState))
    setStatusMsg('Student assignments reset.')
  }

  if (!classrooms.length) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[var(--grit-gold)]">Manual Seating Studio</h1>
          <p className="mt-4 text-sm text-[var(--grit-cream)]/55">
            Configure classrooms on the Dashboard first.
          </p>
          <Button type="button" className="mt-6" onClick={() => navigate('/dashboard')}>
            Open Dashboard
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
              Admin control
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--grit-cream)] sm:text-3xl">
              Manual Seating Studio
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--grit-cream)]/50">
              Design seat skill patterns manually, then auto-fill student names from CSV. Manual
              seating becomes the source of truth for Results and Excel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => csvInputRef.current?.click()}>
              Import CSV
            </Button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) csvHook.parseFile(file)
                e.target.value = ''
              }}
            />
            <Button type="button" onClick={handleAutoFill}>
              Auto Fill Students
            </Button>
            <Button type="button" variant="secondary" onClick={handleClearLayout}>
              Clear Layout
            </Button>
            <Button type="button" variant="secondary" onClick={handleResetStudents}>
              Reset Students
            </Button>
            <Button type="button" variant="secondary" onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}>
              {viewMode === '3d' ? '2D Editor' : 'Open 3D View'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleDownloadExcel}>
              Download Excel
            </Button>
            <Button type="button" onClick={handleSaveManualSeating}>
              Save Manual Seating
            </Button>
          </div>
        </div>

        {statusMsg && (
          <p className="mb-4 text-sm text-[var(--grit-gold)]" role="status">
            {statusMsg}
          </p>
        )}

        <ValidationWarnings
          warnings={warnings}
          dismissed={warningsDismissed}
          onDismiss={() => setWarningsDismissed((v) => !v)}
          onProceed={() => setWarningsDismissed(true)}
        />

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <SkillSourcePanel
            skillText={skillText}
            onSkillTextChange={setSkillText}
            onExtractFromCsv={handleExtractFromCsv}
            onApplyManualSkills={handleApplyManualSkills}
            csvAvailable={csvRows.length > 0}
            skillCount={mapping.length}
          />
          <SkillMappingTable mapping={mapping} onChange={handleMappingChange} />
        </div>

        <Card className="mb-4 !p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-[var(--grit-cream)]/50">Room</span>
            {classrooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeRoomId === room.id
                    ? 'bg-[var(--grit-red-600)]/25 text-[var(--grit-gold)] ring-1 ring-[var(--grit-red-500)]/30'
                    : 'bg-[var(--grit-brown-900)] text-[var(--grit-cream)]/60 hover:bg-[var(--grit-brown-700)]'
                }`}
              >
                {room.roomNumber}
              </button>
            ))}
            {slotGroups.length > 1 && (
              <>
                <span className="ml-2 text-xs font-medium text-[var(--grit-cream)]/50">Slot</span>
                <select
                  value={effectiveGroupKey}
                  onChange={(e) => setActiveGroupKey(e.target.value)}
                  className="rounded-lg border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)] px-3 py-1.5 text-xs text-[var(--grit-cream)]"
                >
                  {slotGroups.map((g) => (
                    <option key={g.groupKey} value={g.groupKey}>
                      {g.contestDate} · {g.timeSlot}
                    </option>
                  ))}
                </select>
              </>
            )}
            <span className="ml-auto text-[10px] text-[var(--grit-cream)]/35">
              {studioState.layoutSeats?.length ?? 0} seats · {csvRows.length} CSV rows
            </span>
          </div>
        </Card>

        <Card className="!p-4 sm:!p-6">
          {viewMode === '2d' ? (
            <ManualSeating2DEditor
              room={activeRoom}
              seats={roomSeats}
              skillCodes={skillCodes}
              onSeatChange={handleSeatChange}
              onSelectSeat={(id) => {
                setSelectedSeatId(id)
                setEditSeatId(id)
              }}
              selectedSeatId={selectedSeatId}
              onPaletteSelect={handlePaletteSelect}
            />
          ) : (
            <ManualSeating3DEditor
              roomNumber={activeRoom?.roomNumber}
              seats={roomSeats}
              roomConfig={activeRoom}
              selectedSeatId={selectedSeatId}
              onSelectSeat={(id) => {
                setSelectedSeatId(id)
                setEditSeatId(id)
              }}
            />
          )}
        </Card>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--grit-brown-600)]/50 pt-6">
          <Button type="button" variant="secondary" onClick={() => navigate('/seating')}>
            View Results
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/upload')}>
            Upload CSV
          </Button>
        </div>
      </div>

      {editSeatId && selectedSeat && (
        <SeatEditPanel
          seat={selectedSeat}
          allSeats={mergedSeats}
          skillCodes={skillCodes}
          onClose={() => setEditSeatId(null)}
          onUpdateSkill={handleSeatChange}
          onUpdateStudent={handleUpdateStudent}
          onClearStudent={handleClearStudent}
          onMoveTo={(from, to) => {
            persistState(moveStudent(studioState, effectiveGroupKey, from, to))
            setEditSeatId(to)
          }}
          onSwapWith={(a, b) => {
            persistState(swapStudents(studioState, effectiveGroupKey, a, b))
            setEditSeatId(b)
          }}
        />
      )}
    </AppLayout>
  )
}
