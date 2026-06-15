import { useEffect, useMemo, useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Button from '../components/ui/Button'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { loadClassroomConfig } from '../utils/classroomStorage'
import { skillToColor } from '../utils/skillColors'
import { getSkillShortCode } from '../utils/skillLabels'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as XLSX from 'xlsx'

const SortableSeat = memo(function SortableSeat({ seat, isConflict, onDragStart, benchNumber, seatIndex, studentsPerBench }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: seat.seatNo || seat.seatingNo || `seat-${benchNumber}-${seatIndex}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Defensive rendering with defaults
  const isEmpty = seat.status === 'Empty' || !seat.studentName || !seat.student
  const fullSkillName = seat.skillName || seat.skill || seat.skillCode || ''
  const skillShortCode = getSkillShortCode(fullSkillName)
  const skillColor = skillToColor(fullSkillName)
  
  // Calculate display seat number based on bench position (not global seatNo)
  const actualSeatNo = seat.seatNo || seat.seatingNo || ((benchNumber - 1) * studentsPerBench) + seatIndex + 1
  const displayedSeatNo = ((benchNumber - 1) * studentsPerBench) + seatIndex + 1

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDragStart={onDragStart}
      className={`
        relative rounded-lg border-2 p-2 text-center transition-all
        ${isEmpty 
          ? 'border-dashed border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-900)]/20' 
          : isConflict
            ? 'border-red-500 bg-red-500/10'
            : 'border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/40'
        }
        ${!isEmpty ? 'cursor-grab active:cursor-grabbing hover:border-[var(--grit-gold)]/50' : ''}
        ${isDragging ? 'shadow-lg scale-105' : ''}
      `}
      title={!isEmpty ? fullSkillName : ''}
    >
      {isEmpty ? (
        <div className="text-xs text-[var(--grit-cream)]/30">Empty</div>
      ) : (
        <div className="space-y-1">
          <div className="text-xs font-bold text-[var(--grit-cream)] truncate">
            {seat.studentName || seat.student || 'Unknown'}
          </div>
          <div 
            className="text-[10px] px-1.5 py-0.5 rounded inline-block"
            style={{ backgroundColor: `${skillColor}20`, color: skillColor }}
            title={fullSkillName}
          >
            {skillShortCode || '?'}
          </div>
          <div className="text-[10px] text-[var(--grit-cream)]/50">
            #{displayedSeatNo}
          </div>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  const prevSeatNo = prevProps.seat?.seatNo || prevProps.seat?.seatingNo
  const nextSeatNo = nextProps.seat?.seatNo || nextProps.seat?.seatingNo
  return prevSeatNo === nextSeatNo &&
         prevProps.isConflict === nextProps.isConflict &&
         (prevProps.seat?.studentName || prevProps.seat?.student) === (nextProps.seat?.studentName || nextProps.seat?.student) &&
         (prevProps.seat?.skill || prevProps.seat?.skillCode) === (nextProps.seat?.skill || nextProps.seat?.skillCode)
})

// Normalize room name for safe comparison
function normalizeRoomName(room) {
  return String(room || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

// Normalize skill name for comparison
function normalizeSkill(skill) {
  if (!skill) return ''
  return String(skill).toUpperCase().trim()
}

// Calculate total skill counts from students data
function calculateTotalSkillCounts(students) {
  const skillCounts = new Map()
  for (const student of students) {
    const skill = normalizeSkill(student.Skill || student.skill || student.skillCode || '')
    if (skill) {
      skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1)
    }
  }
  return skillCounts
}

// Calculate room-wise skill distribution from assignments
function calculateRoomSkillDistribution(assignments) {
  const roomSkills = new Map()
  for (const assignment of assignments) {
    if (assignment.status !== 'Occupied') continue
    const roomName = normalizeRoomName(assignment.roomName || assignment.room || assignment.roomNumber || '')
    const skill = normalizeSkill(assignment.skill || assignment.skillCode || assignment.skillName || '')
    if (!roomName || !skill) continue
    
    if (!roomSkills.has(roomName)) {
      roomSkills.set(roomName, new Map())
    }
    const roomMap = roomSkills.get(roomName)
    roomMap.set(skill, (roomMap.get(skill) || 0) + 1)
  }
  return roomSkills
}

// Export to Excel with 3 sheets
function exportToExcel(seatingData, roomSkillDistribution, totalSkillCounts) {
  const workbook = XLSX.utils.book_new()
  
  // Sheet 1: FINAL SEATING ARRANGEMENT
  const seatingDataForExcel = seatingData.assignments
    .filter(a => a.status === 'Occupied')
    .map(a => ({
      'Student Name': a.studentName || '',
      'Skill': a.skillName || a.skill || a.skillCode || '',
      'Room Number': a.roomName || a.room || '',
      'Bench Number': a.benchNo || '',
      'Seat Number': a.seatNo || ''
    }))
  const seatingWorksheet = XLSX.utils.json_to_sheet(seatingDataForExcel)
  XLSX.utils.book_append_sheet(workbook, seatingWorksheet, 'FINAL SEATING')
  
  // Sheet 2: SKILL SUMMARY
  const skillSummaryData = Array.from(totalSkillCounts.entries()).map(([skill, count]) => ({
    'Skill': skill,
    'Count': count
  }))
  const skillSummaryWorksheet = XLSX.utils.json_to_sheet(skillSummaryData)
  XLSX.utils.book_append_sheet(workbook, skillSummaryWorksheet, 'SKILL SUMMARY')
  
  // Sheet 3: ROOM WISE SKILL DISTRIBUTION
  const roomDistributionData = []
  for (const [roomName, skillMap] of roomSkillDistribution.entries()) {
    for (const [skill, count] of skillMap.entries()) {
      roomDistributionData.push({
        'Room': roomName,
        'Skill': skill,
        'Count': count
      })
    }
  }
  const roomDistributionWorksheet = XLSX.utils.json_to_sheet(roomDistributionData)
  XLSX.utils.book_append_sheet(workbook, roomDistributionWorksheet, 'ROOM DISTRIBUTION')
  
  // Generate and download
  XLSX.writeFile(workbook, 'seating_arrangement.xlsx')
}

// Universal room name extractor - checks all possible field names
function getRoomName(seat) {
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

function SeatingEditor2DPageContent() {
  const navigate = useNavigate()
  const [seatingData, setSeatingData] = useState(null)
  const [originalSeating, setOriginalSeating] = useState(null)
  const [config, setConfig] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [conflicts, setConflicts] = useState(new Set())
  const [saveMessage, setSaveMessage] = useState(null)
  const [loadingError, setLoadingError] = useState(null)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [totalSkillCounts, setTotalSkillCounts] = useState(new Map())
  const [roomSkillDistribution, setRoomSkillDistribution] = useState(new Map())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    console.log('[2D EDITOR] ============================================')
    console.log('[2D EDITOR] DATA LOADING DIAGNOSTICS')
    console.log('[2D EDITOR] ============================================')

    // Timeout protection: if loading takes > 5 seconds, show error
    const timeoutId = setTimeout(() => {
      console.error('[2D EDITOR] TIMEOUT: Data loading exceeded 5 seconds')
      setLoadingTimeout(true)
      
      // Print current state
      console.error('[2D EDITOR] Current state at timeout:')
      console.error('[2D EDITOR] seatingData:', seatingData)
      console.error('[2D EDITOR] config:', config)
      console.error('[2D EDITOR] selectedRoom:', selectedRoom)
      
      // Try to load and inspect localStorage
      try {
        const storedSeating = localStorage.getItem('grit-auto-seating-result')
        console.error('[2D EDITOR] localStorage grit-auto-seating-result exists:', !!storedSeating)
        if (storedSeating) {
          const parsed = JSON.parse(storedSeating)
          console.error('[2D EDITOR] Parsed seating data schema:', {
            hasFinalSeating: !!parsed?.finalSeating,
            finalSeatingLength: parsed?.finalSeating?.length,
            hasRoomResults: !!parsed?.roomResults,
            roomResultsLength: parsed?.roomResults?.length,
            hasValidation: !!parsed?.validation,
            hasIntegrityAudit: !!parsed?.integrityAudit,
            keys: Object.keys(parsed || {}),
          })
          
          if (parsed?.finalSeating && parsed.finalSeating.length > 0) {
            console.error('[2D EDITOR] First seat sample:', parsed.finalSeating[0])
            console.error('[2D EDITOR] Expected seat properties:', ['roomName', 'room', 'studentName', 'skill', 'status', 'seatNo', 'seatingNo', 'benchNo', 'seatIndex', 'row', 'col'])
            console.error('[2D EDITOR] Actual seat properties:', Object.keys(parsed.finalSeating[0]))
          }
        }
      } catch (err) {
        console.error('[2D EDITOR] Error inspecting localStorage:', err)
      }
    }, 5000)

    const storedSeating = localStorage.getItem('grit-auto-seating-result')
    console.log('[2D EDITOR] localStorage grit-auto-seating-result exists:', !!storedSeating)
    
    if (storedSeating) {
      try {
        const parsed = JSON.parse(storedSeating)
        console.log('[2D EDITOR] Parsed seating data keys:', Object.keys(parsed))
        console.log('[2D EDITOR] Has finalSeating:', !!parsed?.finalSeating)
        console.log('[2D EDITOR] finalSeating length:', parsed?.finalSeating?.length)
        
        if (parsed?.finalSeating && parsed.finalSeating.length > 0) {
          console.log('[2D EDITOR] First seat sample:', parsed.finalSeating[0])
          console.log('[2D EDITOR] First seat properties:', Object.keys(parsed.finalSeating[0]))
          
          // Check for required properties
          const requiredProps = ['roomName', 'room', 'studentName', 'skill', 'status', 'seatNo', 'seatingNo', 'benchNo', 'seatIndex', 'row', 'col']
          const missingProps = requiredProps.filter(prop => !(prop in parsed.finalSeating[0]))
          if (missingProps.length > 0) {
            console.error('[2D EDITOR] MISSING PROPERTIES in seat data:', missingProps)
          }
        }
        
        setSeatingData(parsed)
        setOriginalSeating(JSON.parse(JSON.stringify(parsed)))
        
        // Calculate total skill counts from students data
        if (parsed?.students) {
          const skillCounts = calculateTotalSkillCounts(parsed.students)
          setTotalSkillCounts(skillCounts)
        }
        
        // Calculate room-wise skill distribution from assignments
        if (parsed?.assignments) {
          const roomDistribution = calculateRoomSkillDistribution(parsed.assignments)
          setRoomSkillDistribution(roomDistribution)
        }
      } catch (err) {
        console.error('[2D EDITOR] Error parsing seating data:', err)
        setLoadingError(`Failed to parse seating data: ${err.message}`)
      }
    } else {
      console.error('[2D EDITOR] No seating data found in localStorage')
      setLoadingError('No seating data found. Please generate seating first.')
    }
    
    // Use current Dashboard config from localStorage (NOT stale config from seating results)
    // This ensures 2D Editor uses the latest classroom configuration
    const classroomConfig = loadClassroomConfig()
    console.log('[2D EDITOR] Classroom config loaded:', !!classroomConfig)
    console.log('[2D EDITOR] Classroom config has classrooms:', !!classroomConfig?.classrooms)
    console.log('[2D EDITOR] Classroom count:', classroomConfig?.classrooms?.length)
    
    if (classroomConfig?.classrooms) {
      console.log('[2D EDITOR] First classroom sample:', classroomConfig.classrooms[0])
    }
    
    setConfig(classroomConfig)
    
    // Clear timeout if loading completes
    return () => clearTimeout(timeoutId)
  }, [])

  // Dynamically populate available rooms from seating data
  const availableRooms = useMemo(() => {
    if (!seatingData?.rooms) return []
    return seatingData.rooms.map(room => room.name).sort()
  }, [seatingData])

  // Set initial selected room from available rooms
  useEffect(() => {
    if (availableRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(availableRooms[0])
    }
  }, [availableRooms, selectedRoom])

  // Get room config for selected room (for grid layout)
  const activeRoom = useMemo(() => {
    if (!config?.classrooms || !selectedRoom) return null
    // Try to find room by name first, then by id
    const roomByName = config.classrooms.find(
      r => normalizeRoomName(r.roomName || r.roomNumber) === normalizeRoomName(selectedRoom)
    )
    if (roomByName) return roomByName
    
    // Return null instead of hardcoded fallback - this prevents using wrong room config
    return null
  }, [config, selectedRoom])

  const classroomGrid = useMemo(() => {
    if (!activeRoom) return null
    const grid = {
      rows: Number(activeRoom.rows),
      columns: Number(activeRoom.columns),
      studentsPerBench: Number(activeRoom.studentsPerBench),
      totalBenches: Number(activeRoom.rows) * Number(activeRoom.columns),
      orientation: activeRoom.orientation || 'horizontal'
    }
    return grid
  }, [activeRoom, selectedRoom])

  const roomSeating = useMemo(() => {
    if (!seatingData?.assignments || !selectedRoom || !classroomGrid) return []
    
    // DIAGNOSTICS: Check room field mapping
    console.log('[2D EDITOR] Selected Room:', selectedRoom)
    console.log('[2D EDITOR] Total assignments:', seatingData.assignments.length)
    
    // Filter assignments for this room (directly from assignments array)
    const filtered = seatingData.assignments.filter(
      a => normalizeRoomName(a.roomName) === normalizeRoomName(selectedRoom)
    )
    
    console.log('[2D EDITOR] Matched assignments:', filtered.length)
    
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
    console.log('[2D EDITOR] Occupied seats:', occupiedSeats)
    console.log('[2D EDITOR] Empty seats:', emptySeats)
    
    // Return assignments in physical order
    return sorted
  }, [seatingData, selectedRoom, classroomGrid])

  // Validation: check for same skill adjacent
  const validateSeating = (seating) => {
    const newConflicts = new Set()
    if (!classroomGrid) return newConflicts

    const { rows, columns, studentsPerBench } = classroomGrid
    const seatMap = new Map()
    seating.forEach(s => {
      seatMap.set(s.seatNo, s)
    })

    seating.forEach(seat => {
      const seatNo = seat.seatNo
      if (!seat.studentName || seat.status === 'Empty') return

      const skill = seat.skillName || seat.skill || seat.skillCode
      if (!skill) return

      // Calculate position
      const seatIndex = seatNo - 1
      const benchIndex = Math.floor(seatIndex / studentsPerBench)
      const positionInBench = seatIndex % studentsPerBench

      const benchRow = Math.floor(benchIndex / columns)
      const benchCol = benchIndex % columns

      // Check same bench (left/right)
      if (positionInBench > 0) {
        const leftSeatNo = seatNo - 1
        const leftSeat = seatMap.get(leftSeatNo)
        if (leftSeat?.studentName && (leftSeat.skillName || leftSeat.skill || leftSeat.skillCode) === skill) {
          newConflicts.add(seatNo)
          newConflicts.add(leftSeatNo)
        }
      }
      if (positionInBench < studentsPerBench - 1) {
        const rightSeatNo = seatNo + 1
        const rightSeat = seatMap.get(rightSeatNo)
        if (rightSeat?.studentName && (rightSeat.skillName || rightSeat.skill || rightSeat.skillCode) === skill) {
          newConflicts.add(seatNo)
          newConflicts.add(rightSeatNo)
        }
      }

      // Check front (same column, previous row)
      if (benchRow > 0) {
        const frontBenchIndex = (benchRow - 1) * columns + benchCol
        const frontSeatIndex = frontBenchIndex * studentsPerBench + positionInBench
        const frontSeatNo = frontSeatIndex + 1
        const frontSeat = seatMap.get(frontSeatNo)
        if (frontSeat?.studentName && (frontSeat.skillName || frontSeat.skill || frontSeat.skillCode) === skill) {
          newConflicts.add(seatNo)
          newConflicts.add(frontSeatNo)
        }
      }

      // Check back (same column, next row)
      if (benchRow < rows - 1) {
        const backBenchIndex = (benchRow + 1) * columns + benchCol
        const backSeatIndex = backBenchIndex * studentsPerBench + positionInBench
        const backSeatNo = backSeatIndex + 1
        const backSeat = seatMap.get(backSeatNo)
        if (backSeat?.studentName && (backSeat.skillName || backSeat.skill || backSeat.skillCode) === skill) {
          newConflicts.add(seatNo)
          newConflicts.add(backSeatNo)
        }
      }
    })

    return newConflicts
  }

  useEffect(() => {
    if (roomSeating.length > 0) {
      const newConflicts = validateSeating(roomSeating)
      setConflicts(newConflicts)
    } else {
      setConflicts(new Set())
    }
  }, [roomSeating, classroomGrid, selectedRoom])

  // Debug: Log room switching
  useEffect(() => {
    // Room switch logging removed for performance
  }, [selectedRoom, availableRooms, roomSeating.length, classroomGrid, seatingData])

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = roomSeating.findIndex(s => (s.seatNo || s.seatingNo) === active.id)
      const newIndex = roomSeating.findIndex(s => (s.seatNo || s.seatingNo) === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Swap students between seats (including empty seats)
        const updatedSeating = [...roomSeating]
        const tempStudent = { ...updatedSeating[oldIndex] }
        const tempStudent2 = { ...updatedSeating[newIndex] }

        // Swap student info but keep seat positions
        updatedSeating[oldIndex] = {
          ...updatedSeating[oldIndex],
          studentName: tempStudent2.studentName || tempStudent2.student || '',
          student: tempStudent2.studentName || tempStudent2.student || '',
          niatId: tempStudent2.niatId || tempStudent2.studentId || '',
          bookingId: tempStudent2.bookingId || '',
          skillName: tempStudent2.skillName || tempStudent2.skill || tempStudent2.skillCode || '',
          skill: tempStudent2.skillName || tempStudent2.skill || tempStudent2.skillCode || '',
          skillCode: tempStudent2.skillCode || tempStudent2.skillName || tempStudent2.skill || '',
          status: tempStudent2.studentName || tempStudent2.student ? 'Occupied' : 'Empty'
        }

        updatedSeating[newIndex] = {
          ...updatedSeating[newIndex],
          studentName: tempStudent.studentName || tempStudent.student || '',
          student: tempStudent.studentName || tempStudent.student || '',
          niatId: tempStudent.niatId || tempStudent.studentId || '',
          bookingId: tempStudent.bookingId || '',
          skillName: tempStudent.skillName || tempStudent.skill || tempStudent.skillCode || '',
          skill: tempStudent.skillName || tempStudent.skill || tempStudent.skillCode || '',
          skillCode: tempStudent.skillCode || tempStudent.skillName || tempStudent.skill || '',
          status: tempStudent.studentName || tempStudent.student ? 'Occupied' : 'Empty'
        }

        // Update the full seating data - update assignments (new single source of truth)
        const updatedFullSeating = {
          ...seatingData,
          assignments: seatingData.assignments.map(a => {
            const seatNo = a.seatNo || a.seatingNo
            const updated = updatedSeating.find(us => (us.seatNo || us.seatingNo) === seatNo)
            if (updated) {
              return {
                ...a,
                studentName: updated.studentName,
                student: updated.student,
                niatId: updated.niatId,
                bookingId: updated.bookingId,
                skillName: updated.skillName,
                skill: updated.skill,
                skillCode: updated.skillCode,
                status: updated.status
              }
            }
            return a
          }),
          // Also update finalSeating for backward compatibility
          finalSeating: seatingData.finalSeating ? seatingData.finalSeating.map(s => {
            const seatNo = s.seatNo || s.seatingNo
            const updated = updatedSeating.find(us => (us.seatNo || us.seatingNo) === seatNo)
            if (updated && updated.status === 'Occupied') {
              return {
                ...s,
                studentName: updated.studentName,
                student: updated.student,
                niatId: updated.niatId,
                bookingId: updated.bookingId,
                skillName: updated.skillName,
                skill: updated.skill,
                skillCode: updated.skillCode,
                status: updated.status
              }
            }
            if (updated && updated.status === 'Empty') {
              return null
            }
            return s
          }).filter(s => s !== null) : []
        }

        setSeatingData(updatedFullSeating)
      }
    }
  }

  const handleSave = () => {
    localStorage.setItem('grit-auto-seating-result', JSON.stringify(seatingData))
    setOriginalSeating(JSON.parse(JSON.stringify(seatingData)))
    setSaveMessage('Seating arrangement saved successfully!')
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleReset = () => {
    if (originalSeating) {
      setSeatingData(JSON.parse(JSON.stringify(originalSeating)))
      setSaveMessage('Reset to original auto-seating.')
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleDownloadExcel = () => {
    try {
      exportToExcel(seatingData, roomSkillDistribution, totalSkillCounts)
      setSaveMessage('Excel file downloaded successfully!')
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('[2D EDITOR] Error exporting Excel:', error)
      setSaveMessage('Failed to export Excel file.')
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  if (!seatingData || !config || !classroomGrid) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[var(--grit-gold)]">2D Seating Editor</h1>
          
          {loadingTimeout ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-red-400 font-semibold">
                Loading timeout exceeded (5 seconds)
              </p>
              <p className="text-xs text-[var(--grit-cream)]/55">
                Check browser console for detailed diagnostics
              </p>
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-[var(--grit-cream)]/70">
                <p className="font-semibold mb-2">Diagnostic Information:</p>
                <p>seatingData: {seatingData ? 'loaded' : 'null/undefined'}</p>
                <p>config: {config ? 'loaded' : 'null/undefined'}</p>
                <p>classroomGrid: {classroomGrid ? 'loaded' : 'null/undefined'}</p>
                <p>selectedRoom: {selectedRoom || 'none'}</p>
              </div>
            </div>
          ) : loadingError ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-red-400 font-semibold">
                {loadingError}
              </p>
              <button
                onClick={() => navigate('/seating')}
                className="text-xs text-[var(--grit-gold)] hover:underline"
              >
                Return to Seating Results
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--grit-cream)]/55">
              Loading seating data...
            </p>
          )}
        </div>
      </AppLayout>
    )
  }

  // Generate ALL benches based on room capacity (rows × columns)
  // This ensures the complete room layout is rendered, including empty seats
  const totalBenches = classroomGrid.rows * classroomGrid.columns
  const studentsPerBench = classroomGrid.studentsPerBench
  
  // Group existing assignments by bench number
  const byBench = {}
  roomSeating.forEach(seat => {
    const benchNo = seat.benchNo
    if (!byBench[benchNo]) byBench[benchNo] = []
    byBench[benchNo].push(seat)
  })
  
  // Sort seats within each bench by seatIndex
  Object.values(byBench).forEach(seats => {
    seats.sort((a, b) => (a.seatIndex || 0) - (b.seatIndex || 0))
  })
  
  // Generate benches directly from assignments (assignments already include empty seats)
  const benches = []
  for (let benchNo = 1; benchNo <= totalBenches; benchNo++) {
    const existingSeats = byBench[benchNo] || []
    
    benches.push({
      benchNumber: benchNo,
      seats: existingSeats
    })
  }
  
  // Convert benches to grid based on orientation (same logic as Dashboard preview)
  const gridBenchMap = []
  const { rows, columns, orientation } = classroomGrid

  if (orientation === 'vertical') {
    // Vertical: column-major layout
    // B1 B7 B13 B19
    // B2 B8 B14 B20
    // B3 B9 B15 B21
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < columns; c++) {
        // In vertical mode, bench at position (r, c) is at index c * rows + r
        const benchIndex = c * rows + r
        row.push(benches[benchIndex] || null)
      }
      gridBenchMap.push(row)
    }
  } else {
    // Horizontal: row-major layout
    // B1 B2 B3 B4
    // B5 B6 B7 B8
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < columns; c++) {
        const benchIndex = r * columns + c
        row.push(benches[benchIndex] || null)
      }
      gridBenchMap.push(row)
    }
  }

  // Calculate summary statistics
  const totalCapacity = totalBenches * studentsPerBench
  const occupiedCount = roomSeating.filter(s => s.status === 'Occupied').length
  const emptyCount = roomSeating.filter(s => s.status === 'Empty').length

  // Diagnostic logging before rendering
  console.log('[2D EDITOR RENDER DIAGNOSTICS]', {
    roomSeatingCount: roomSeating.length,
    availableRooms: availableRooms.length,
    selectedRoom: selectedRoom || 'none',
    classroomGrid: classroomGrid ? 'loaded' : 'null',
    activeRoom: activeRoom ? 'loaded' : 'null',
    totalCapacity,
    occupiedCount,
    emptyCount,
  })

  const hasConflicts = conflicts.size > 0

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
              2D Editor
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--grit-cream)] sm:text-3xl">
              Interactive Seating Editor
            </h1>
            <p className="mt-1 text-xs text-[var(--grit-cream)]/45">
              Drag and drop students to rearrange · Single source of truth
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/seating')}>
              Back to Results
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/visualization')}>
              View 3D Classroom
            </Button>
          </div>
        </div>

        {saveMessage && (
          <div className="mb-4 rounded-xl border border-[var(--grit-gold)]/30 bg-[var(--grit-gold)]/8 px-4 py-3 text-sm text-[var(--grit-cream)]/70">
            {saveMessage}
          </div>
        )}

        {hasConflicts && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            ⚠️ {conflicts.size} seating conflict(s) detected - same skill students are adjacent
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-[var(--grit-cream)]/55">
            Room
          </label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-full rounded-xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-800)] px-4 py-2.5 text-sm text-[var(--grit-cream)]"
          >
            {availableRooms.map((roomName) => (
              <option key={roomName} value={roomName}>
                {roomName}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-[var(--grit-cream)]/55">Room Capacity:</span>
              <span className="ml-2 font-semibold text-[var(--grit-gold)]">{totalCapacity}</span>
            </div>
            <div>
              <span className="text-[var(--grit-cream)]/55">Occupied Seats:</span>
              <span className="ml-2 font-semibold text-[var(--grit-cream)]">{occupiedCount}</span>
            </div>
            <div>
              <span className="text-[var(--grit-cream)]/55">Empty Seats:</span>
              <span className="ml-2 font-semibold text-[var(--grit-cream)]/55">{emptyCount}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={hasConflicts}
            className={hasConflicts ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Save Arrangement
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleReset}
          >
            Reset Auto Seating
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleDownloadExcel}
          >
            Download Excel
          </Button>
        </div>

        {/* FEATURE 1: Total Skill Count Dashboard */}
        {totalSkillCounts.size > 0 && (
          <div className="mb-6 rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--grit-gold)] uppercase tracking-wider">
              Total Skill Count (CSV Summary)
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(totalSkillCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([skill, count]) => (
                  <div key={skill} className="flex items-center justify-between rounded-lg border border-[var(--grit-brown-600)]/30 bg-[var(--grit-brown-900)]/20 px-3 py-2">
                    <span className="text-sm text-[var(--grit-cream)]">{skill}</span>
                    <span className="text-sm font-semibold text-[var(--grit-gold)]">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* FEATURE 2: Class-wise Skill Assignment Summary */}
        {roomSkillDistribution.size > 0 && (
          <div className="mb-6 rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--grit-gold)] uppercase tracking-wider">
              Room-wise Skill Distribution
            </h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from(roomSkillDistribution.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([roomName, skillMap]) => (
                  <div key={roomName} className="rounded-lg border border-[var(--grit-brown-600)]/30 bg-[var(--grit-brown-900)]/20 p-3">
                    <h4 className="mb-2 text-sm font-medium text-[var(--grit-cream)]">{roomName}</h4>
                    <div className="space-y-1">
                      {Array.from(skillMap.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([skill, count]) => (
                          <div key={skill} className="flex items-center justify-between text-xs">
                            <span className="text-[var(--grit-cream)]/70">{skill}</span>
                            <span className="font-semibold text-[var(--grit-gold)]">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--grit-cream)]">
              {selectedRoom || 'Room'} - Top View
            </h2>
            <div className="flex gap-4 text-xs text-[var(--grit-cream)]/55">
              <span>{classroomGrid?.rows} × {classroomGrid?.columns} × {classroomGrid?.studentsPerBench}</span>
              <span>{roomSeating.filter(s => s.studentName).length} students</span>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={roomSeating.map(s => s.seatNo || s.seatingNo)} strategy={verticalListSortingStrategy}>
              <div 
                className="grid gap-4 overflow-auto pb-4"
                style={{
                  gridTemplateColumns: `repeat(${classroomGrid.columns}, minmax(0, 1fr))`
                }}
              >
                {gridBenchMap.map((row, rowIdx) =>
                  row.map((bench, colIdx) => {
                    if (!bench) return (
                      <div 
                        key={`empty-${rowIdx}-${colIdx}`}
                        className="rounded-lg border border-dashed border-[var(--grit-brown-600)]/30 bg-[var(--grit-brown-900)]/20 p-3"
                      />
                    )
                    return (
                      <div 
                        key={bench.benchNumber}
                        className="rounded-lg border border-[var(--grit-brown-600)]/30 bg-[var(--grit-brown-900)]/40 p-3"
                      >
                        <div className="mb-2 text-xs font-medium text-[var(--grit-cream)]/55">
                          B{bench.benchNumber}
                        </div>
                        <div 
                          className="grid gap-2"
                          style={{
                            gridTemplateColumns: `repeat(${classroomGrid.studentsPerBench}, minmax(0, 1fr))`
                          }}
                        >
                          {bench.seats.map((seat, seatIndex) => (
                            <SortableSeat
                              key={seat.seatNo || seat.seatingNo}
                              seat={seat}
                              isConflict={conflicts.has(seat.seatNo || seat.seatingNo)}
                              benchNumber={bench.benchNumber}
                              seatIndex={seatIndex}
                              studentsPerBench={classroomGrid.studentsPerBench}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/30 p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--grit-cream)]">All Seats ({roomSeating.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--grit-brown-600)]/50">
                  <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Seat No</th>
                  <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Bench No</th>
                  <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Room</th>
                  <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Student</th>
                  <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Skill</th>
                  <th className="px-4 py-2 text-left text-[var(--grit-cream)]/55">Status</th>
                </tr>
              </thead>
              <tbody>
                {roomSeating.map((seat) => {
                  const fullSkillName = seat.skillName || seat.skill || seat.skillCode || ''
                  const skillShortCode = getSkillShortCode(fullSkillName)
                  const isOccupied = seat.status === 'Occupied'
                  const seatNo = seat.seatNo || '?'
                  return (
                    <tr 
                      key={seatNo} 
                      className={`border-b border-[var(--grit-brown-600)]/30 ${
                        conflicts.has(seatNo) ? 'bg-red-500/10' : ''
                      } ${!isOccupied ? 'bg-[var(--grit-brown-900)]/20' : ''}`}
                    >
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seatNo}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.benchNo || '?'}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.roomName || selectedRoom || '?'}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.studentName || '-'}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]" title={fullSkillName}>{skillShortCode || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-2 py-1 text-xs ${
                          isOccupied
                            ? 'bg-[var(--grit-gold)]/20 text-[var(--grit-gold)]'
                            : 'bg-[var(--grit-brown-600)]/30 text-[var(--grit-cream)]/55'
                        }`}>
                          {isOccupied ? 'Occupied' : 'Empty'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function SeatingEditor2DPage() {
  return (
    <ErrorBoundary>
      <SeatingEditor2DPageContent />
    </ErrorBoundary>
  )
}
