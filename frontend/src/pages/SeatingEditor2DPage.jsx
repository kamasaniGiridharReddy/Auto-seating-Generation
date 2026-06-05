import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import Button from '../components/ui/Button'
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

function SortableSeat({ seat, isConflict, onDragStart, benchNumber, seatIndex, studentsPerBench }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: seat.seatNo })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEmpty = seat.status === 'Empty' || !seat.studentName
  const fullSkillName = seat.skillName || seat.skill || seat.skillCode
  const skillShortCode = getSkillShortCode(fullSkillName)
  const skillColor = skillToColor(fullSkillName)
  
  // Calculate display seat number based on bench position (not global seatNo)
  const actualSeatNo = seat.seatNo || seat.seatingNo
  const displayedSeatNo = ((benchNumber - 1) * studentsPerBench) + seatIndex + 1
  
  console.log('[DISPLAY NUMBER]', {
    bench: benchNumber,
    seatIndex,
    actualSeatNo,
    displaySeatNo: displayedSeatNo
  })

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
            {seat.studentName || seat.student}
          </div>
          <div 
            className="text-[10px] px-1.5 py-0.5 rounded inline-block"
            style={{ backgroundColor: `${skillColor}20`, color: skillColor }}
            title={fullSkillName}
          >
            {skillShortCode}
          </div>
          <div className="text-[10px] text-[var(--grit-cream)]/50">
            #{displayedSeatNo}
          </div>
        </div>
      )}
    </div>
  )
}

// Normalize room name for safe comparison
function normalizeRoomName(room) {
  return String(room || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export default function SeatingEditor2DPage() {
  const navigate = useNavigate()
  const [seatingData, setSeatingData] = useState(null)
  const [originalSeating, setOriginalSeating] = useState(null)
  const [config, setConfig] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [conflicts, setConflicts] = useState(new Set())
  const [saveMessage, setSaveMessage] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const storedSeating = localStorage.getItem('grit-auto-seating-result')
    if (storedSeating) {
      const parsed = JSON.parse(storedSeating)
      setSeatingData(parsed)
      setOriginalSeating(JSON.parse(JSON.stringify(parsed)))
    }
    // Use current Dashboard config from localStorage (NOT stale config from seating results)
    // This ensures 2D Editor uses the latest classroom configuration
    const classroomConfig = loadClassroomConfig()
    setConfig(classroomConfig)

    // Debug: Log data source and configuration
    console.log('[2D EDITOR] Data Source Verification:')
    console.log('[2D EDITOR] Classroom config source: localStorage (current Dashboard config)')
    console.log('[2D EDITOR] Seating data source: localStorage (grit-auto-seating-result)')
    console.log('[2D EDITOR] Classroom count:', config?.classrooms?.length || 0)
    console.log('[2D EDITOR] Room configurations:', config?.classrooms?.map(r => ({
      roomName: r.roomName,
      rows: r.rows,
      columns: r.columns,
      studentsPerBench: r.studentsPerBench,
      orientation: r.orientation,
      capacity: r.rows * r.columns * r.studentsPerBench
    })))
    console.log('[2D EDITOR] Total seats in seating data:', seatingData?.finalSeating?.length || 0)
  }, [])

  // Dynamically populate available rooms from seating data
  const availableRooms = useMemo(() => {
    if (!seatingData?.finalSeating) return []
    const rooms = [
      ...new Set(
        seatingData.finalSeating
          .map(seat => seat.roomName || seat.room)
          .filter(Boolean)
      )
    ]
    return rooms.sort()
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
    
    // Debug: Log when room not found
    console.log('[SELECTED ROOM]', {
      selectedRoom,
      availableRooms: config.classrooms.map(r => r.roomName || r.roomNumber),
      normalizedSelected: normalizeRoomName(selectedRoom),
      normalizedAvailable: config.classrooms.map(r => normalizeRoomName(r.roomName || r.roomNumber))
    })
    
    // Return null instead of hardcoded fallback - this prevents using wrong room config
    return null
  }, [config, selectedRoom])

  const roomSeating = useMemo(() => {
    if (!seatingData?.finalSeating || !selectedRoom) return []
    const filtered = seatingData.finalSeating.filter(
      s => normalizeRoomName(s.roomName || s.room) === normalizeRoomName(selectedRoom)
    )
    const occupiedSeats = filtered.filter(s => s.status === 'Occupied').length
    
    // Debug: Show seat number range for this room
    const seatNumbers = filtered.map(s => s.seatNo || s.seatingNo).sort((a, b) => a - b)
    const benchNumbers = [...new Set(filtered.map(s => s.benchNo))].sort((a, b) => a - b)
    
    console.log('[ROOM ASSIGNMENTS]', {
      selectedRoom,
      assignments: filtered,
      filteredCount: filtered.length,
      occupiedSeats,
      studentCount: occupiedSeats,
      totalSeats: seatingData.finalSeating.length,
      seatNumberRange: {
        min: seatNumbers[0],
        max: seatNumbers[seatNumbers.length - 1],
        count: seatNumbers.length
      },
      benchNumberRange: {
        min: benchNumbers[0],
        max: benchNumbers[benchNumbers.length - 1],
        count: benchNumbers.length
      }
    })
    
    console.log('[2D EDITOR] Filtered room seats:', {
      selectedRoom,
      filteredCount: filtered.length,
      occupiedSeats,
      studentCount: occupiedSeats,
      totalSeats: seatingData.finalSeating.length
    })
    console.log('[2D EDITOR] Room config from localStorage:', {
      roomId: activeRoom?.id,
      roomConfig: {
        roomName: activeRoom?.roomName,
        rows: activeRoom?.rows,
        columns: activeRoom?.columns,
        studentsPerBench: activeRoom?.studentsPerBench,
        orientation: activeRoom?.orientation
      },
      occupiedSeats,
      studentCount: occupiedSeats,
      orientation: activeRoom?.orientation
    })
    return filtered
  }, [seatingData, selectedRoom, activeRoom])

  const classroomGrid = useMemo(() => {
    if (!activeRoom) return null
    const grid = {
      rows: Number(activeRoom.rows),
      columns: Number(activeRoom.columns),
      studentsPerBench: Number(activeRoom.studentsPerBench),
      totalBenches: Number(activeRoom.rows) * Number(activeRoom.columns),
      orientation: activeRoom.orientation || 'horizontal'
    }
    console.log('[GRID DATA]', {
      selectedRoom,
      grid,
      roomConfig: activeRoom
    })
    console.log('[2D Editor] Classroom grid config:', {
      selectedRoom,
      grid,
      roomConfig: activeRoom
    })
    return grid
  }, [activeRoom, selectedRoom])

  // Validation: check for same skill adjacent
  const validateSeating = (seating) => {
    const newConflicts = new Set()
    if (!classroomGrid) return newConflicts

    const { rows, columns, studentsPerBench } = classroomGrid
    const seatMap = new Map()
    seating.forEach(s => {
      seatMap.set(s.seatNo || s.seatingNo, s)
    })

    seating.forEach(seat => {
      const seatNo = seat.seatNo || seat.seatingNo
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
      console.log('[2D Editor] Validation complete:', {
        conflicts: newConflicts.size,
        room: selectedRoom
      })
    } else {
      setConflicts(new Set())
    }
  }, [roomSeating, classroomGrid, selectedRoom])

  // Debug: Log room switching
  useEffect(() => {
    console.log('[2D Editor] Room switched:', {
      selectedRoom,
      availableRooms,
      totalSeats: seatingData?.finalSeating?.length || 0,
      filteredSeats: roomSeating.length,
      gridConfig: classroomGrid
    })
  }, [selectedRoom, availableRooms, roomSeating.length, classroomGrid, seatingData])

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = roomSeating.findIndex(s => (s.seatNo || s.seatingNo) === active.id)
      const newIndex = roomSeating.findIndex(s => (s.seatNo || s.seatingNo) === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Swap students between seats
        const updatedSeating = [...roomSeating]
        const tempStudent = { ...updatedSeating[oldIndex] }
        const tempStudent2 = { ...updatedSeating[newIndex] }

        // Swap student info but keep seat positions
        updatedSeating[oldIndex] = {
          ...updatedSeating[oldIndex],
          studentName: tempStudent2.studentName || tempStudent2.student,
          student: tempStudent2.studentName || tempStudent2.student,
          niatId: tempStudent2.niatId || tempStudent2.studentId,
          skillName: tempStudent2.skillName || tempStudent2.skill || tempStudent2.skillCode,
          skill: tempStudent2.skillName || tempStudent2.skill || tempStudent2.skillCode,
          skillCode: tempStudent2.skillCode || tempStudent2.skillName || tempStudent2.skill,
          status: tempStudent2.status || (tempStudent2.studentName ? 'Occupied' : 'Empty')
        }

        updatedSeating[newIndex] = {
          ...updatedSeating[newIndex],
          studentName: tempStudent.studentName || tempStudent.student,
          student: tempStudent.studentName || tempStudent.student,
          niatId: tempStudent.niatId || tempStudent.studentId,
          skillName: tempStudent.skillName || tempStudent.skill || tempStudent.skillCode,
          skill: tempStudent.skillName || tempStudent.skill || tempStudent.skillCode,
          skillCode: tempStudent.skillCode || tempStudent.skillName || tempStudent.skill,
          status: tempStudent.status || (tempStudent.studentName ? 'Occupied' : 'Empty')
        }

        // Update the full seating data
        const updatedFullSeating = {
          ...seatingData,
          finalSeating: seatingData.finalSeating.map(s => {
            const updated = updatedSeating.find(us => (us.seatNo || us.seatingNo) === (s.seatNo || s.seatingNo))
            return updated || s
          })
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

  if (!seatingData || !config || !classroomGrid) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[var(--grit-gold)]">2D Seating Editor</h1>
          <p className="mt-4 text-sm text-[var(--grit-cream)]/55">
            Loading seating data...
          </p>
        </div>
      </AppLayout>
    )
  }

  // Generate bench layout using actual seat numbers from data (not local calculation)
  console.log('[2D ORIENTATION]', {
    selectedRoom,
    roomConfig: {
      roomName: activeRoom?.roomName,
      orientation: activeRoom?.orientation,
      rows: activeRoom?.rows,
      columns: activeRoom?.columns,
      studentsPerBench: activeRoom?.studentsPerBench
    }
  })
  console.log('[2D GRID BUILD]', {
    selectedRoom,
    filteredSeats: roomSeating.length,
    classroomGrid
  })
  console.log('[2D GRID SAMPLE]', roomSeating.slice(0, 5).map(s => ({
    seatNo: s.seatNo || s.seatingNo,
    benchNo: s.benchNo,
    room: s.room || s.roomName,
    studentName: s.studentName
  })))
  
  // Group seats by bench number from the actual seating data
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
  
  // Get all unique bench numbers and sort them
  const benchNumbers = Object.keys(byBench).map(Number).sort((a, b) => a - b)
  
  // Generate benches from actual data
  const benches = benchNumbers.map(benchNo => {
    const benchSeats = byBench[benchNo] || []
    return {
      benchNumber: benchNo,
      seats: benchSeats
    }
  })
  
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
        row.push(benches[c * rows + r] ?? null)
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
        row.push(benches[r * columns + c] ?? null)
      }
      gridBenchMap.push(row)
    }
  }
  
  console.log('[2D GRID BENCHES]', {
    selectedRoom,
    orientation,
    rows,
    columns,
    benchNumbers: benches.map(b => b.benchNumber),
    gridBenchMap: gridBenchMap.map(row => row.map(b => b?.benchNumber ?? null))
  })
  
  console.log('[2D BENCH MAP]', {
    selectedRoom,
    benchCount: benches.length,
    benchNumbers: benches.map(b => b.benchNumber),
    firstBench: benches[0],
    lastBench: benches[benches.length - 1]
  })
  console.log('[2D GRID DATA]', {
    selectedRoom,
    classroomGrid,
    benches: benches.map(b => ({
      benchNumber: b.benchNumber,
      seatCount: b.seats.length,
      occupiedSeats: b.seats.filter(s => s.studentName).length,
      sampleSeat: b.seats[0]
    }))
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
        </div>

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
          <h2 className="mb-4 text-lg font-semibold text-[var(--grit-cream)]">Current Seating</h2>
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
                  const fullSkillName = seat.skillName || seat.skill || seat.skillCode
                  const skillShortCode = getSkillShortCode(fullSkillName)
                  return (
                    <tr 
                      key={seat.seatNo} 
                      className={`border-b border-[var(--grit-brown-600)]/30 ${
                        conflicts.has(seat.seatNo) ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.seatNo || seat.seatingNo}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.benchNo}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.room || seat.roomName}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]">{seat.studentName || seat.student || '-'}</td>
                      <td className="px-4 py-2 text-[var(--grit-cream)]" title={fullSkillName}>{skillShortCode || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-2 py-1 text-xs ${
                          seat.status === 'Occupied' || seat.studentName
                            ? 'bg-[var(--grit-gold)]/20 text-[var(--grit-gold)]'
                            : 'bg-[var(--grit-brown-600)]/30 text-[var(--grit-cream)]/55'
                        }`}>
                          {seat.studentName ? 'Occupied' : 'Empty'}
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
