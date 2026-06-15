/**
 * AUDIT REPORT FOR MANUAL GRIT SEATING ALGORITHM
 * Tracks conflicts, fallback usage, and skipped seats
 */

import { allocateSeating } from './src/utils/seatingAlgorithmManual.js'

function generateMockStudents(count, skillDistribution) {
  const students = []
  let skillIndex = 0
  
  for (let i = 0; i < count; i++) {
    const skill = skillDistribution[skillIndex % skillDistribution.length]
    students.push({
      'Student Name': `Student ${i}`,
      'Booking ID': `BOOK${String(i).padStart(6, '0')}`,
      'NIAT ID': `NIAT${String(i).padStart(6, '0')}`,
      'Student UID': `UID${String(i).padStart(6, '0')}`,
      Skill: skill,
      'Skill Name': skill,
      Section: ['A', 'B', 'C', 'D', 'E'][i % 5],
      Campus: 'Main',
      'Slot Centre': 'Center1',
      Batch: '2024',
      'Contest Date': '2024-01-01',
      'Time Slot': 'Morning',
    })
    skillIndex++
  }
  return students
}

function generateMockRooms(roomCount, rows, columns, studentsPerBench, orientation) {
  const rooms = []
  for (let i = 0; i < roomCount; i++) {
    rooms.push({
      roomName: `Room ${String(i + 1).padStart(3, '0')}`,
      rows: rows,
      columns: columns,
      studentsPerBench: studentsPerBench,
      orientation: orientation,
    })
  }
  return rooms
}

function normalizeSkill(skill) {
  if (!skill) return ''
  return String(skill).toUpperCase().trim()
}

function countConflicts(assignments) {
  const conflicts = {
    sameBench: 0,
    leftRight: 0,
    frontBack: 0,
  }
  
  // Group by room
  const byRoom = new Map()
  for (const a of assignments) {
    if (a.status !== 'Occupied') continue
    const room = a.roomName || a.room
    if (!byRoom.has(room)) byRoom.set(room, [])
    byRoom.get(room).push(a)
  }
  
  // Check each room
  for (const [roomName, roomAssignments] of byRoom) {
    // Build a map of seat positions
    const seatMap = new Map()
    for (const a of roomAssignments) {
      const key = `${a.row}-${a.col}-${a.seatIndex}`
      seatMap.set(key, a)
    }
    
    // Check each seat
    for (const seat of roomAssignments) {
      const skill = normalizeSkill(seat.skill || seat.skillCode || seat.Skill)
      if (!skill) continue
      
      const { row, col, seatIndex, benchNo } = seat
      
      // Check same bench
      for (const other of roomAssignments) {
        if (other === seat) continue
        const otherSkill = normalizeSkill(other.skill || other.skillCode || other.Skill)
        if (otherSkill === skill && other.benchNo === benchNo) {
          conflicts.sameBench++
        }
      }
      
      // Check left/right (adjacent horizontal benches)
      const leftKey = `${row}-${col - 1}-${seatIndex}`
      const rightKey = `${row}-${col + 1}-${seatIndex}`
      const leftSeat = seatMap.get(leftKey)
      const rightSeat = seatMap.get(rightKey)
      
      if (leftSeat) {
        const leftSkill = normalizeSkill(leftSeat.skill || leftSeat.skillCode || leftSeat.Skill)
        if (leftSkill === skill) {
          conflicts.leftRight++
        }
      }
      if (rightSeat) {
        const rightSkill = normalizeSkill(rightSeat.skill || rightSeat.skillCode || rightSeat.Skill)
        if (rightSkill === skill) {
          conflicts.leftRight++
        }
      }
      
      // Check front/back (immediate vertical back bench)
      const frontKey = `${row - 1}-${col}-${seatIndex}`
      const backKey = `${row + 1}-${col}-${seatIndex}`
      const frontSeat = seatMap.get(frontKey)
      const backSeat = seatMap.get(backKey)
      
      if (frontSeat) {
        const frontSkill = normalizeSkill(frontSeat.skill || frontSeat.skillCode || frontSeat.Skill)
        if (frontSkill === skill) {
          conflicts.frontBack++
        }
      }
      if (backSeat) {
        const backSkill = normalizeSkill(backSeat.skill || backSeat.skillCode || backSeat.Skill)
        if (backSkill === skill) {
          conflicts.frontBack++
        }
      }
    }
  }
  
  // Divide by 2 since each conflict is counted twice
  conflicts.sameBench = Math.floor(conflicts.sameBench / 2)
  conflicts.leftRight = Math.floor(conflicts.leftRight / 2)
  conflicts.frontBack = Math.floor(conflicts.frontBack / 2)
  
  return conflicts
}

// Intercept console.log to track fallback and skipped seats
const originalLog = console.log
let fallbackCount = 0
let skippedCount = 0

console.log = function(...args) {
  const message = args.join(' ')
  if (message.includes('FALLBACK:')) {
    fallbackCount++
  }
  if (message.includes('Conflict detected') && message.includes('trying next skill')) {
    // This is a conflict that was handled by trying next skill, not a skip
  }
  if (message.includes('Skipping seat due to conflict')) {
    skippedCount++
  }
  originalLog.apply(console, args)
}

async function runAudit() {
  console.log('=== AUDIT REPORT ===\n')
  
  // Use the same test configuration as the main test
  const config = {
    name: 'Audit Test',
    rows: 3,
    columns: 3,
    studentsPerBench: 2,
    roomCount: 1,
    studentCount: 18,
    skillDistribution: ['GEN AI', 'CT', 'CTC']
  }
  
  const students = generateMockStudents(config.studentCount, config.skillDistribution)
  const rooms = generateMockRooms(
    config.roomCount,
    config.rows,
    config.columns,
    config.studentsPerBench,
    'horizontal'
  )
  
  const result = allocateSeating(students, rooms)
  const conflicts = countConflicts(result.assignments)
  
  // Count empty seats
  const emptySeats = result.assignments.filter(a => a.status === 'Empty').length
  
  // Restore original console.log
  console.log = originalLog
  
  // Output audit report in requested format
  console.log('=== AUDIT REPORT ===')
  console.log(`sameBenchConflicts = ${conflicts.sameBench}`)
  console.log(`leftRightConflicts = ${conflicts.leftRight}`)
  console.log(`frontBackConflicts = ${conflicts.frontBack}`)
  console.log(`fallbackUsed = ${fallbackCount} students`)
  console.log(`emptySeatsSkipped = ${emptySeats}`)
  console.log('=== END AUDIT REPORT ===')
}

runAudit()
