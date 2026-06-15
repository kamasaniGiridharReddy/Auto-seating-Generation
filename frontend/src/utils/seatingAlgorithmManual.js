/**
 * MANUAL GRIT SEATING ALGORITHM
 * 
 * Based on manual Excel spreadsheet seating process
 * No scoring, no penalties, no optimization
 * Simple pattern-based seating with conflict validation
 */

export const SEATING_LOGIC_VERSION = 30
export const CLASSROOM_LAYOUT_VERSION = 6
export const SEATING_NUMBERING_VERSION = 8

console.log('[ALGORITHM FILE] seatingAlgorithmManual.js loaded')
console.log('[ALGORITHM VERSION] SEATING_LOGIC_VERSION:', SEATING_LOGIC_VERSION)

/**
 * Normalize skill name for comparison
 */
function normalizeSkill(skill) {
  if (!skill) return ''
  return String(skill).toUpperCase().trim()
}

/**
 * STEP 1: Group students by skill and count each skill
 */
function groupStudentsBySkill(students) {
  const skillGroups = new Map()
  
  for (const student of students) {
    const skill = normalizeSkill(student.Skill)
    if (!skillGroups.has(skill)) {
      skillGroups.set(skill, [])
    }
    skillGroups.get(skill).push(student)
  }
  
  return skillGroups
}

/**
 * STEP 2: Divide skill count across classrooms with balanced distribution
 * Alternates extra seat distribution for fairness
 */
function distributeSkillsAcrossRooms(skillGroups, rooms) {
  const roomSkillQuotas = new Map()
  
  // Initialize room quotas
  for (const room of rooms) {
    roomSkillQuotas.set(room.id, new Map())
  }
  
  const roomIds = rooms.map(r => r.id)
  let alternateDirection = 0 // 0 = start from room 0, 1 = start from last room
  
  for (const [skill, students] of skillGroups) {
    const count = students.length
    const numRooms = roomIds.length
    
    // Calculate base quota per room
    const baseQuota = Math.floor(count / numRooms)
    const remainder = count % numRooms
    
    // Distribute base quota to all rooms
    for (const roomId of roomIds) {
      roomSkillQuotas.get(roomId).set(skill, baseQuota)
    }
    
    // Distribute remainder alternately
    for (let i = 0; i < remainder; i++) {
      let roomIndex
      if (alternateDirection === 0) {
        roomIndex = i % numRooms
      } else {
        roomIndex = numRooms - 1 - (i % numRooms)
      }
      const roomId = roomIds[roomIndex]
      roomSkillQuotas.get(roomId).set(skill, roomSkillQuotas.get(roomId).get(skill) + 1)
    }
    
    // Alternate direction for next skill
    alternateDirection = 1 - alternateDirection
  }
  
  return roomSkillQuotas
}

/**
 * STEP 4: Create fixed seating pattern (repeating skill pattern)
 * Returns array of skills in the order they should appear on benches
 */
function createSeatingPattern(skillGroups) {
  const skills = Array.from(skillGroups.keys())
  return skills // Simple pattern: repeat skills in order
}

/**
 * STEP 5: Check if seat placement has conflicts
 * Returns true if conflict exists
 */
function hasConflict(grid, row, col, seatIndex, skill, rows, cols, studentsPerBench) {
  // Check same bench
  for (let s = 0; s < studentsPerBench; s++) {
    if (s !== seatIndex && grid[row][col][s] && grid[row][col][s].skill === skill) {
      return true // Same skill on same bench
    }
  }
  
  // Check left/right
  if (col > 0 && grid[row][col - 1][seatIndex] && grid[row][col - 1][seatIndex].skill === skill) {
    return true // Same skill to the left
  }
  if (col < cols - 1 && grid[row][col + 1][seatIndex] && grid[row][col + 1][seatIndex].skill === skill) {
    return true // Same skill to the right
  }
  
  // Check front/back (immediate vertical neighbors only - same column)
  // This prevents same-skill students from sitting directly behind each other
  // Rule: If a skill is placed in one bench, the immediate bench behind it (same vertical column) must NOT contain the same skill
  if (row > 0 && grid[row - 1][col][seatIndex] && grid[row - 1][col][seatIndex].skill === skill) {
    return true // Same skill immediately in front (same column)
  }
  if (row < rows - 1 && grid[row + 1][col][seatIndex] && grid[row + 1][col][seatIndex].skill === skill) {
    return true // Same skill immediately behind (same column)
  }
  
  // Check diagonal
  if (row > 0 && col > 0 && grid[row - 1][col - 1][seatIndex] && grid[row - 1][col - 1][seatIndex].skill === skill) {
    return true // Diagonal top-left
  }
  if (row > 0 && col < cols - 1 && grid[row - 1][col + 1][seatIndex] && grid[row - 1][col + 1][seatIndex].skill === skill) {
    return true // Diagonal top-right
  }
  if (row < rows - 1 && col > 0 && grid[row + 1][col - 1][seatIndex] && grid[row + 1][col - 1][seatIndex].skill === skill) {
    return true // Diagonal bottom-left
  }
  if (row < rows - 1 && col < cols - 1 && grid[row + 1][col + 1][seatIndex] && grid[row + 1][col + 1][seatIndex].skill === skill) {
    return true // Diagonal bottom-right
  }
  
  return false
}

/**
 * Create empty grid for room
 */
function createEmptyGrid(rows, cols, studentsPerBench) {
  const grid = []
  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      grid[r][c] = []
      for (let s = 0; s < studentsPerBench; s++) {
        grid[r][c][s] = null
      }
    }
  }
  return grid
}

/**
 * MAIN ALLOCATION FUNCTION
 */
export function allocateSeating(students, classrooms) {
  console.log('[MANUAL SEATING] File: seatingAlgorithmManual.js')
  console.log('[MANUAL SEATING] Function: allocateSeating')
  console.log('[MANUAL SEATING] ============================================')
  
  // STEP 1: Group students by skill
  console.log('[MANUAL SEATING] STEP 1: Grouping students by skill')
  const skillGroups = groupStudentsBySkill(students)
  
  // Log skill counts
  for (const [skill, skillStudents] of skillGroups) {
    console.log(`[MANUAL SEATING] ${skill} = ${skillStudents.length}`)
  }
  
  // Generate seats for all rooms
  console.log('[MANUAL SEATING] Generating seats for all rooms')
  const rooms = classrooms.map(room => ({
    id: room.roomName,
    name: room.roomName,
    rows: Number(room.rows),
    columns: Number(room.columns),
    studentsPerBench: Number(room.studentsPerBench),
    orientation: room.orientation || 'horizontal',
    capacity: Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench),
  }))
  
  const seats = []
  for (const room of rooms) {
    let benchNumber = 1
    for (let row = 0; row < room.rows; row++) {
      for (let col = 0; col < room.columns; col++) {
        for (let seatIndex = 0; seatIndex < room.studentsPerBench; seatIndex++) {
          seats.push({
            id: `${room.id}-${row}-${col}-${seatIndex}`,
            roomId: room.id,
            roomName: room.name,
            row,
            col,
            seatIndex,
            benchNo: benchNumber,
            occupied: false,
          })
        }
        benchNumber++
      }
    }
  }
  
  const totalCapacity = seats.length
  const totalStudents = students.length
  
  console.log(`[MANUAL SEATING] Total capacity: ${totalCapacity}`)
  console.log(`[MANUAL SEATING] Total students: ${totalStudents}`)
  
  if (totalStudents > totalCapacity) {
    throw new Error(`Capacity exceeded. Cannot seat ${totalStudents} students. Total capacity: ${totalCapacity}`)
  }
  
  // STEP 2: Divide skill count across classrooms
  console.log('[MANUAL SEATING] STEP 2: Distributing skills across rooms')
  const roomSkillQuotas = distributeSkillsAcrossRooms(skillGroups, rooms)
  
  // Log room quotas
  for (const room of rooms) {
    console.log(`[MANUAL SEATING] Room ${room.name}:`)
    const quotas = roomSkillQuotas.get(room.id)
    for (const [skill, count] of quotas) {
      console.log(`[MANUAL SEATING]   ${skill} = ${count}`)
    }
  }
  
  // STEP 4: Create seating pattern
  console.log('[MANUAL SEATING] STEP 4: Creating seating pattern')
  const seatingPattern = createSeatingPattern(skillGroups)
  console.log(`[MANUAL SEATING] Pattern: ${seatingPattern.join(' → ')}`)
  
  // STEP 3: Process room by room
  console.log('[MANUAL SEATING] STEP 3: Processing rooms')
  const assignments = []
  let globalSeatNumber = 1
  
  for (const room of rooms) {
    console.log(`[MANUAL SEATING] Processing Room ${room.name}`)
    
    // Get room seats
    const roomSeats = seats.filter(s => s.roomId === room.id)
    const roomQuotas = roomSkillQuotas.get(room.id)
    
    // Create grid for conflict checking
    const grid = createEmptyGrid(room.rows, room.columns, room.studentsPerBench)
    
    // Track remaining quotas
    const remainingQuotas = new Map()
    for (const [skill, count] of roomQuotas) {
      remainingQuotas.set(skill, count)
    }
    
    // Get room seats in order (row by row, col by col, seat by seat)
    roomSeats.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row
      if (a.col !== b.col) return a.col - b.col
      return a.seatIndex - b.seatIndex
    })
    
    // Assign students using pattern
    let patternIndex = 0
    let assignedCount = 0
    let fallbackCount = 0
    
    // First pass: Try to place students in conflict-free seats
    for (const seat of roomSeats) {
      // Find next skill in pattern that still has quota and has no conflict
      let skillToAssign = null
      let attempts = 0
      let originalPatternIndex = patternIndex
      
      while (attempts < seatingPattern.length) {
        const skill = seatingPattern[patternIndex]
        if (remainingQuotas.get(skill) > 0) {
          // Check for conflicts
          if (!hasConflict(grid, seat.row, seat.col, seat.seatIndex, skill, room.rows, room.columns, room.studentsPerBench)) {
            skillToAssign = skill
            break
          } else {
            console.log(`[MANUAL SEATING] Conflict detected for ${skill} at bench ${seat.benchNo}, trying next skill`)
          }
        }
        patternIndex = (patternIndex + 1) % seatingPattern.length
        attempts++
      }
      
      if (!skillToAssign) {
        continue // No suitable skill found, skip this seat
      }
      
      // Get a student with this skill
      const skillStudents = skillGroups.get(skillToAssign)
      const studentIndex = skillStudents.length - remainingQuotas.get(skillToAssign)
      const student = skillStudents[studentIndex]
      
      // Assign student to seat
      grid[seat.row][seat.col][seat.seatIndex] = { skill: skillToAssign }
      remainingQuotas.set(skillToAssign, remainingQuotas.get(skillToAssign) - 1)
      assignedCount++
      
      assignments.push({
        seatId: seat.id,
        roomId: seat.roomId,
        roomName: seat.roomName,
        seatNo: globalSeatNumber++,
        benchNo: seat.benchNo,
        row: seat.row,
        col: seat.col,
        seatIndex: seat.seatIndex,
        studentId: student['Student UID'] || student['NIAT ID'],
        studentName: student['Student Name'],
        niatId: student['NIAT ID'],
        bookingId: student['Booking ID'] || '',
        skill: skillToAssign,
        skillCode: skillToAssign,
        skillName: student['Skill Name'] || skillToAssign,
        section: student.Section || '',
        status: 'Occupied',
        student,
        score: 0,
      })
      
      console.log(`[MANUAL SEATING] Assigned: ${student['Student Name']} (${skillToAssign}) → Room ${room.name}, Bench ${seat.benchNo}`)
      
      // Move to next skill in pattern
      patternIndex = (patternIndex + 1) % seatingPattern.length
    }
    
    // Second pass: Place remaining students even with conflicts (fallback)
    for (const seat of roomSeats) {
      if (assignments.find(a => a.seatId === seat.id)) {
        continue // Seat already occupied
      }
      
      // Find next skill in pattern that still has quota
      let skillToAssign = null
      let attempts = 0
      
      while (attempts < seatingPattern.length) {
        const skill = seatingPattern[patternIndex]
        if (remainingQuotas.get(skill) > 0) {
          skillToAssign = skill
          break
        }
        patternIndex = (patternIndex + 1) % seatingPattern.length
        attempts++
      }
      
      if (!skillToAssign) {
        continue // No more students to assign in this room
      }
      
      // Get a student with this skill
      const skillStudents = skillGroups.get(skillToAssign)
      const studentIndex = skillStudents.length - remainingQuotas.get(skillToAssign)
      const student = skillStudents[studentIndex]
      
      // Assign student to seat even with conflict (fallback)
      grid[seat.row][seat.col][seat.seatIndex] = { skill: skillToAssign }
      remainingQuotas.set(skillToAssign, remainingQuotas.get(skillToAssign) - 1)
      assignedCount++
      fallbackCount++
      
      assignments.push({
        seatId: seat.id,
        roomId: seat.roomId,
        roomName: seat.roomName,
        seatNo: globalSeatNumber++,
        benchNo: seat.benchNo,
        row: seat.row,
        col: seat.col,
        seatIndex: seat.seatIndex,
        studentId: student['Student UID'] || student['NIAT ID'],
        studentName: student['Student Name'],
        niatId: student['NIAT ID'],
        bookingId: student['Booking ID'] || '',
        skill: skillToAssign,
        skillCode: skillToAssign,
        skillName: student['Skill Name'] || skillToAssign,
        section: student.Section || '',
        status: 'Occupied',
        student,
        score: 0,
      })
      
      console.log(`[MANUAL SEATING] FALLBACK: ${student['Student Name']} (${skillToAssign}) → Room ${room.name}, Bench ${seat.benchNo} (with conflict)`)
      
      // Move to next skill in pattern
      patternIndex = (patternIndex + 1) % seatingPattern.length
    }
    
    console.log(`[MANUAL SEATING] Room ${room.name} complete: ${assignedCount} students assigned (${fallbackCount} with conflicts)`)
  }
  
  // Generate empty seats for remaining capacity
  console.log('[MANUAL SEATING] Generating empty seats')
  for (const seat of seats) {
    if (!assignments.find(a => a.seatId === seat.id)) {
      assignments.push({
        seatId: seat.id,
        roomId: seat.roomId,
        roomName: seat.roomName,
        seatNo: globalSeatNumber++,
        benchNo: seat.benchNo,
        row: seat.row,
        col: seat.col,
        seatIndex: seat.seatIndex,
        studentId: '',
        studentName: '',
        niatId: '',
        bookingId: '',
        skill: '',
        skillCode: '',
        skillName: '',
        section: '',
        status: 'Empty',
        student: null,
        score: 0,
      })
    }
  }
  
  // Sort assignments in physical order
  assignments.sort((a, b) => {
    if (a.roomName !== b.roomName) return a.roomName.localeCompare(b.roomName)
    if (a.benchNo !== b.benchNo) return a.benchNo - b.benchNo
    return a.seatIndex - b.seatIndex
  })
  
  // Reassign seat numbers
  assignments.forEach((a, index) => {
    a.seatNo = index + 1
  })
  
  // Validation
  const occupiedAssignments = assignments.filter(a => a.status === 'Occupied')
  const emptyAssignments = assignments.filter(a => a.status === 'Empty')
  
  console.log(`[MANUAL SEATING] Validation: ${occupiedAssignments.length} assigned, ${emptyAssignments.length} empty`)
  
  if (occupiedAssignments.length !== totalStudents) {
    throw new Error(`Assignment count mismatch. Expected ${totalStudents}, got ${occupiedAssignments.length}`)
  }
  
  console.log('[MANUAL SEATING] Seating generation complete')
  
  return {
    rooms,
    students,
    seats,
    assignments,
    validation: {
      uploadedStudents: totalStudents,
      assignedStudents: occupiedAssignments.length,
      emptySeats: emptyAssignments.length,
      passed: true,
    },
  }
}
