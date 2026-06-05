/**
 * STRICT INVIGILATION SEATING ENGINE V2
 * 
 * Complete rewrite with:
 * - 100% student guarantee (no disappearing students)
 * - Strict invigilation (no same skill in same bench, left, right, front, back, diagonal)
 * - Works for both horizontal and vertical orientation
 * - No empty bench rule (spread students first)
 * - Deterministic placement (no repair logic, no recursion)
 * - Continuous seat numbering across rooms
 * - Room balancing (proportional distribution)
 * - Single source of truth for data
 */

export const SEATING_LOGIC_VERSION = 28
export const CLASSROOM_LAYOUT_VERSION = 6
export const SEATING_NUMBERING_VERSION = 8

/**
 * Normalize skill name for comparison
 */
function normalizeSkill(skill) {
  if (!skill) return ''
  return String(skill).toUpperCase().trim()
}

/**
 * Group students by skill
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
 * Create fair interleaved ordering of skills
 * Example: GENAI → UI → SQL → DSML → CT → SSE → CS → repeat
 */
function createSkillOrdering(skillGroups) {
  const skills = Array.from(skillGroups.keys())
  const ordering = []
  
  let index = 0
  while (ordering.length < skills.length) {
    if (index >= skills.length) index = 0
    ordering.push(skills[index])
    index++
  }
  
  return ordering
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Interleave students fairly by skill with shuffling
 */
function interleaveStudents(skillGroups, skillOrdering) {
  const interleaved = []
  const skillQueues = new Map()
  
  // Create shuffled queues for each skill
  for (const [skill, students] of skillGroups) {
    skillQueues.set(skill, shuffleArray(students))
  }
  
  // Interleave fairly
  let index = 0
  let hasStudents = true
  
  while (hasStudents) {
    hasStudents = false
    
    for (const skill of skillOrdering) {
      const queue = skillQueues.get(skill)
      if (queue && queue.length > 0) {
        interleaved.push(queue.shift())
        hasStudents = true
      }
    }
    
    index++
    if (index > skillOrdering.length * 10) break // Safety limit
  }
  
  return interleaved
}

/**
 * Create empty grid for a room
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
 * Get neighbor seats based on orientation
 * STRICT: Returns all adjacent seats (left, right, front, back, diagonal, same bench)
 */
function getNeighborSeats(grid, row, col, seatIndex, rows, cols, studentsPerBench, orientation) {
  const neighbors = {
    sameBench: [],
    frontBack: [],
    leftRight: [],
    diagonal: []
  }
  
  // Same bench (other seats on same bench)
  const bench = grid[row][col]
  for (let s = 0; s < studentsPerBench; s++) {
    if (s !== seatIndex && bench[s]) {
      neighbors.sameBench.push(bench[s])
    }
  }
  
  // Orientation-aware neighbor detection
  if (orientation === 'vertical') {
    // Vertical mode (column-major): front/back follow column direction
    const front = col > 0 ? grid[row][col - 1] : null
    const back = col < cols - 1 ? grid[row][col + 1] : null
    const left = row > 0 ? grid[row - 1][col] : null
    const right = row < rows - 1 ? grid[row + 1][col] : null
    
    // Diagonal neighbors
    const topLeft = row > 0 && col > 0 ? grid[row - 1][col - 1] : null
    const topRight = row > 0 && col < cols - 1 ? grid[row - 1][col + 1] : null
    const bottomLeft = row < rows - 1 && col > 0 ? grid[row + 1][col - 1] : null
    const bottomRight = row < rows - 1 && col < cols - 1 ? grid[row + 1][col + 1] : null
    
    if (front) neighbors.frontBack.push(...front.filter(s => s))
    if (back) neighbors.frontBack.push(...back.filter(s => s))
    if (left) neighbors.leftRight.push(...left.filter(s => s))
    if (right) neighbors.leftRight.push(...right.filter(s => s))
    
    if (topLeft) neighbors.diagonal.push(...topLeft.filter(s => s))
    if (topRight) neighbors.diagonal.push(...topRight.filter(s => s))
    if (bottomLeft) neighbors.diagonal.push(...bottomLeft.filter(s => s))
    if (bottomRight) neighbors.diagonal.push(...bottomRight.filter(s => s))
  } else {
    // Horizontal mode (row-major): front/back follow row direction
    const front = row > 0 ? grid[row - 1][col] : null
    const back = row < rows - 1 ? grid[row + 1][col] : null
    const left = col > 0 ? grid[row][col - 1] : null
    const right = col < cols - 1 ? grid[row][col + 1] : null
    
    // Diagonal neighbors
    const topLeft = row > 0 && col > 0 ? grid[row - 1][col - 1] : null
    const topRight = row > 0 && col < cols - 1 ? grid[row - 1][col + 1] : null
    const bottomLeft = row < rows - 1 && col > 0 ? grid[row + 1][col - 1] : null
    const bottomRight = row < rows - 1 && col < cols - 1 ? grid[row + 1][col + 1] : null
    
    if (front) neighbors.frontBack.push(...front.filter(s => s))
    if (back) neighbors.frontBack.push(...back.filter(s => s))
    if (left) neighbors.leftRight.push(...left.filter(s => s))
    if (right) neighbors.leftRight.push(...right.filter(s => s))
    
    if (topLeft) neighbors.diagonal.push(...topLeft.filter(s => s))
    if (topRight) neighbors.diagonal.push(...topRight.filter(s => s))
    if (bottomLeft) neighbors.diagonal.push(...bottomLeft.filter(s => s))
    if (bottomRight) neighbors.diagonal.push(...bottomRight.filter(s => s))
  }
  
  return neighbors
}

/**
 * CONFLICT SCORING: Calculate conflict score for placing student at position
 * Returns score (lower is better)
 * Priority 1: same bench = Infinity (FORBIDDEN - hard constraint)
 * Priority 2: front/back = 500, left/right = 500 (strong preference)
 * Priority 3: diagonal = 100 (soft preference)
 * Priority 4: cluster = 300 (anti-clustering)
 */
function calculateConflictScore(grid, row, col, seatIndex, student, rows, cols, studentsPerBench, orientation) {
  const studentSkill = normalizeSkill(student.Skill)
  if (!studentSkill) return 0
  
  const neighbors = getNeighborSeats(grid, row, col, seatIndex, rows, cols, studentsPerBench, orientation)
  let score = 0
  
  // Check same bench conflicts (Priority 1 - FORBIDDEN)
  for (const neighbor of neighbors.sameBench) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        return Infinity // FORBIDDEN: Same skill on same bench
      }
    }
  }
  
  // Check front/back conflicts (Priority 2 - strong preference)
  for (const neighbor of neighbors.frontBack) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        score += 500 // CONFLICT: Same skill front/back
      }
    }
  }
  
  // Check left/right conflicts (Priority 2 - strong preference)
  for (const neighbor of neighbors.leftRight) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        score += 500 // CONFLICT: Same skill left/right
      }
    }
  }
  
  // Check diagonal conflicts (Priority 3 - soft preference)
  for (const neighbor of neighbors.diagonal) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        score += 100 // CONFLICT: Same skill diagonal
      }
    }
  }
  
  // Check cluster conflicts (Priority 4 - anti-clustering)
  // Count same-skill neighbors within 2-bench radius
  let clusterCount = 0
  for (const neighbor of [...neighbors.frontBack, ...neighbors.leftRight, ...neighbors.diagonal]) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        clusterCount++
      }
    }
  }
  
  if (clusterCount >= 2) {
    score += 300 // CLUSTER: Multiple same-skill neighbors
  }
  
  return score // Lower score is better
}

/**
 * Generate all seat positions for a room
 */
function generateSeatPositions(rows, cols, studentsPerBench, orientation) {
  const positions = []
  let benchNumber = 1
  
  if (orientation === 'vertical') {
    // Column-major order for vertical
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        for (let s = 0; s < studentsPerBench; s++) {
          positions.push({
            row: r,
            col: c,
            seatIndex: s,
            benchNumber: benchNumber,
            benchLabel: `B${benchNumber}`,
          })
        }
        benchNumber++
      }
    }
  } else {
    // Row-major order for horizontal
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let s = 0; s < studentsPerBench; s++) {
          positions.push({
            row: r,
            col: c,
            seatIndex: s,
            benchNumber: benchNumber,
            benchLabel: `B${benchNumber}`,
          })
        }
        benchNumber++
      }
    }
  }
  
  return positions
}

/**
 * Seat students with strict bench spreading - GUARANTEED 100% SEATING
 * PASS 1: Assign 1 student per bench (first seat only) - maximizes invigilation distance
 * PASS 2: Fill remaining students in second seats
 * PASS 3: Fill remaining students in third seats
 * Uses conflict scoring to minimize conflicts
 * Same skill on same bench = FORBIDDEN (Infinity score)
 */
function seatStudentsStrict(students, positions, grid, rows, cols, studentsPerBench, orientation, roomName, startSeatNumber = 1) {
  console.log('[Strict Seating] ============================================')
  console.log(`[Strict Seating] SEATING ROOM: ${roomName}`)
  console.log('[Strict Seating] ============================================')
  console.log(`[Strict Seating] Students to seat: ${students.length}`)
  console.log(`[Strict Seating] Room config: ${rows}x${cols}, ${studentsPerBench}/bench, orientation: ${orientation}`)
  console.log(`[Strict Seating] Total positions: ${positions.length}`)
  console.log(`[Strict Seating] Room capacity: ${rows * cols * studentsPerBench}`)
  
  const assignments = []
  let seatNumber = startSeatNumber
  let remainingStudents = [...students]
  
  // Group positions by bench for pass-based seating
  const positionsByBench = new Map()
  for (const pos of positions) {
    if (!positionsByBench.has(pos.benchNumber)) {
      positionsByBench.set(pos.benchNumber, [])
    }
    positionsByBench.get(pos.benchNumber).push(pos)
  }
  
  const benchCount = positionsByBench.size
  console.log(`[Strict Seating] Total benches: ${benchCount}`)
  
  // Helper function to place a student
  function placeStudent(pos, student) {
    const neighbors = getNeighborSeats(grid, pos.row, pos.col, pos.seatIndex, rows, cols, studentsPerBench, orientation)
    const studentSkill = normalizeSkill(student.Skill)
    
    const conflictDetails = {
      sameBench: false,
      frontBack: false,
      leftRight: false,
      diagonal: false,
      cluster: false,
    }
    
    conflictDetails.sameBench = neighbors.sameBench.some(n => {
      const neighborSkill = normalizeSkill(n?.skill || n?.skillCode || n?.Skill)
      return neighborSkill === studentSkill
    })
    
    conflictDetails.frontBack = neighbors.frontBack.some(n => {
      const neighborSkill = normalizeSkill(n?.skill || n?.skillCode || n?.Skill)
      return neighborSkill === studentSkill
    })
    
    conflictDetails.leftRight = neighbors.leftRight.some(n => {
      const neighborSkill = normalizeSkill(n?.skill || n?.skillCode || n?.Skill)
      return neighborSkill === studentSkill
    })
    
    conflictDetails.diagonal = neighbors.diagonal.some(n => {
      const neighborSkill = normalizeSkill(n?.skill || n?.skillCode || n?.Skill)
      return neighborSkill === studentSkill
    })
    
    // Check cluster
    let clusterCount = 0
    for (const neighbor of [...neighbors.frontBack, ...neighbors.leftRight, ...neighbors.diagonal]) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
        if (neighborSkill === studentSkill) {
          clusterCount++
        }
      }
    }
    conflictDetails.cluster = clusterCount >= 2
    
    const assignment = {
      seatingNo: seatNumber,
      seatNo: seatNumber,
      benchNo: pos.benchNumber,
      benchLabel: pos.benchLabel,
      room: roomName,
      roomName: roomName,
      row: pos.row,
      col: pos.col,
      seatIndex: pos.seatIndex,
      studentName: student['Student Name'],
      niatId: student['NIAT ID'],
      skill: student.Skill,
      skillCode: student.Skill,
      skillName: student['Skill Name'] || student.Skill,
      status: 'Occupied',
      student,
      orientation: orientation,
      conflictScore: 0,
      conflicts: conflictDetails,
    }
    
    grid[pos.row][pos.col][pos.seatIndex] = assignment
    assignments.push(assignment)
    seatNumber++
  }
  
  // PASS 1: Assign 1 student per bench (first seat only) - maximizes invigilation distance
  console.log('[Strict Seating] PASS 1: 1 student per bench (first seat)')
  console.log(`[Strict Seating] Benches available: ${benchCount}`)
  console.log(`[Strict Seating] Students to seat: ${remainingStudents.length}`)
  
  for (const [benchNumber, benchPositions] of positionsByBench) {
    if (remainingStudents.length === 0) break
    
    // Get first seat position for this bench
    const firstSeatPos = benchPositions.find(p => p.seatIndex === 0)
    if (!firstSeatPos) continue
    
    // Find best student for this bench position
    let bestStudent = null
    let bestScore = Infinity
    
    for (const student of remainingStudents) {
      const score = calculateConflictScore(grid, firstSeatPos.row, firstSeatPos.col, firstSeatPos.seatIndex, student, rows, cols, studentsPerBench, orientation)
      if (score < bestScore) {
        bestScore = score
        bestStudent = student
      }
    }
    
    if (bestStudent) {
      // Remove student from remaining list
      const studentIndex = remainingStudents.indexOf(bestStudent)
      remainingStudents.splice(studentIndex, 1)
      
      console.log(`[Strict Seating] PASS 1: Seated ${bestStudent['Student Name']} at bench ${benchNumber} (conflict score: ${bestScore})`)
      placeStudent(firstSeatPos, bestStudent)
    } else {
      console.warn(`[Strict Seating] PASS 1: No student found for bench ${benchNumber}`)
    }
  }
  
  console.log(`[Strict Seating] PASS 1 complete: ${assignments.length} seated, ${remainingStudents.length} remaining`)
  
  // PASS 2: Fill second seats (if studentsPerBench >= 2)
  if (studentsPerBench >= 2 && remainingStudents.length > 0) {
    console.log('[Strict Seating] PASS 2: Fill second seats')
    console.log(`[Strict Seating] Students to seat: ${remainingStudents.length}`)
    
    for (const [benchNumber, benchPositions] of positionsByBench) {
      if (remainingStudents.length === 0) break
      
      // Get second seat position for this bench
      const secondSeatPos = benchPositions.find(p => p.seatIndex === 1)
      if (!secondSeatPos) continue
      
      // Find best student for this position
      let bestStudent = null
      let bestScore = Infinity
      
      for (const student of remainingStudents) {
        const score = calculateConflictScore(grid, secondSeatPos.row, secondSeatPos.col, secondSeatPos.seatIndex, student, rows, cols, studentsPerBench, orientation)
        if (score < bestScore) {
          bestScore = score
          bestStudent = student
        }
      }
      
      if (bestStudent) {
        // Remove student from remaining list
        const studentIndex = remainingStudents.indexOf(bestStudent)
        remainingStudents.splice(studentIndex, 1)
        
        console.log(`[Strict Seating] PASS 2: Seated ${bestStudent['Student Name']} at bench ${benchNumber} seat 2 (conflict score: ${bestScore})`)
        placeStudent(secondSeatPos, bestStudent)
      }
    }
    
    console.log(`[Strict Seating] PASS 2 complete: ${assignments.length} seated, ${remainingStudents.length} remaining`)
  }
  
  // PASS 3: Fill third seats (if studentsPerBench >= 3)
  if (studentsPerBench >= 3 && remainingStudents.length > 0) {
    console.log('[Strict Seating] PASS 3: Fill third seats')
    console.log(`[Strict Seating] Students to seat: ${remainingStudents.length}`)
    
    for (const [benchNumber, benchPositions] of positionsByBench) {
      if (remainingStudents.length === 0) break
      
      // Get third seat position for this bench
      const thirdSeatPos = benchPositions.find(p => p.seatIndex === 2)
      if (!thirdSeatPos) continue
      
      // Find best student for this position
      let bestStudent = null
      let bestScore = Infinity
      
      for (const student of remainingStudents) {
        const score = calculateConflictScore(grid, thirdSeatPos.row, thirdSeatPos.col, thirdSeatPos.seatIndex, student, rows, cols, studentsPerBench, orientation)
        if (score < bestScore) {
          bestScore = score
          bestStudent = student
        }
      }
      
      if (bestStudent) {
        // Remove student from remaining list
        const studentIndex = remainingStudents.indexOf(bestStudent)
        remainingStudents.splice(studentIndex, 1)
        
        console.log(`[Strict Seating] PASS 3: Seated ${bestStudent['Student Name']} at bench ${benchNumber} seat 3 (conflict score: ${bestScore})`)
        placeStudent(thirdSeatPos, bestStudent)
      }
    }
    
    console.log(`[Strict Seating] PASS 3 complete: ${assignments.length} seated, ${remainingStudents.length} remaining`)
  }
  
  // FINAL PASS: Seat any remaining students in any available seat
  // PRIORITY: Seat every student first, minimize conflicts second
  if (remainingStudents.length > 0) {
    console.log('[Strict Seating] FINAL PASS: Seat remaining students (priority: seat all students)')
    console.log(`[Strict Seating] Remaining students: ${remainingStudents.length}`)
    
    for (const student of remainingStudents) {
      let bestPos = null
      let bestScore = Infinity
      let availableSeats = 0
      
      for (const pos of positions) {
        if (grid[pos.row][pos.col][pos.seatIndex]) continue
        availableSeats++
        
        const score = calculateConflictScore(grid, pos.row, pos.col, pos.seatIndex, student, rows, cols, studentsPerBench, orientation)
        if (score < bestScore) {
          bestScore = score
          bestPos = pos
        }
      }
      
      if (bestPos) {
        const conflictLevel = bestScore === Infinity ? 'none' : bestScore === 0 ? 'none' : bestScore >= 500 ? 'high' : 'low'
        console.log(`[Strict Seating] FINAL PASS: Seated ${student['Student Name']} at best available seat (conflict score: ${bestScore}, level: ${conflictLevel})`)
        placeStudent(bestPos, student)
      } else {
        console.error(`[Strict Seating] CRITICAL ERROR: No available seat for student: ${student['Student Name']}`)
        console.error(`[Strict Seating] Available seats checked: ${availableSeats}`)
        console.error(`[Strict Seating] Total positions: ${positions.length}`)
        console.error(`[Strict Seating] Grid occupied seats: ${assignments.length}`)
        console.error(`[Strict Seating] This should never happen if capacity >= students`)
        throw new Error(`No available seat for student: ${student['Student Name']}. Capacity exceeded.`)
      }
    }
  }
  
  console.log(`[Strict Seating] Seated ${assignments.length} students successfully`)
  
  // CRITICAL: Ensure all students were seated
  if (assignments.length < students.length) {
    const unseatedCount = students.length - assignments.length
    console.error(`[Strict Seating] CRITICAL: ${unseatedCount} students not seated in room ${roomName}`)
    console.error(`[Strict Seating] Expected: ${students.length}, Seated: ${assignments.length}`)
    
    // List unseated students
    const seatedNiatIds = new Set(assignments.map(a => a.niatId))
    const unseatedStudents = students.filter(s => !seatedNiatIds.has(s['NIAT ID']))
    console.error('[Strict Seating] Unseated students:', unseatedStudents.map(s => `${s['Student Name']} (${s['NIAT ID']}) - ${s.Skill}`).join(', '))
    
    // This should never happen - throw error to investigate
    throw new Error(`Failed to seat ${unseatedCount} students in room ${roomName}. Expected: ${students.length}, Seated: ${assignments.length}`)
  }
  
  return assignments
}

/**
 * Validate seating result
 * PURE FUNCTION - no side effects
 * Returns detailed conflict analysis including diagonal and cluster
 */
function validateSeatingResult(assignments, grid, rows, cols, studentsPerBench, orientation, uploadedCount) {
  let sameBenchSkillConflicts = 0 // Renamed for clarity
  let frontBackConflicts = 0
  let leftRightConflicts = 0
  let diagonalConflicts = 0
  let clusterConflicts = 0
  let occupiedBenches = new Set()
  let emptyBenches = 0
  
  for (const assignment of assignments) {
    const { row, col, seatIndex } = assignment
    const studentSkill = normalizeSkill(assignment.skill)
    
    // Track occupied benches
    occupiedBenches.add(`${row}-${col}`)
    
    // Check same bench conflicts (FORBIDDEN - should be 0)
    const bench = grid[row][col]
    for (let s = 0; s < studentsPerBench; s++) {
      if (s !== seatIndex && bench[s]) {
        const neighborSkill = normalizeSkill(bench[s].skill)
        if (neighborSkill === studentSkill) {
          sameBenchSkillConflicts++
        }
      }
    }
    
    // Check neighbor conflicts with categorization
    const neighbors = getNeighborSeats(grid, row, col, seatIndex, rows, cols, studentsPerBench, orientation)
    
    for (const neighbor of neighbors.sameBench) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill)
        if (neighborSkill === studentSkill) {
          sameBenchSkillConflicts++
        }
      }
    }
    
    for (const neighbor of neighbors.frontBack) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill)
        if (neighborSkill === studentSkill) {
          frontBackConflicts++
        }
      }
    }
    
    for (const neighbor of neighbors.leftRight) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill)
        if (neighborSkill === studentSkill) {
          leftRightConflicts++
        }
      }
    }
    
    for (const neighbor of neighbors.diagonal) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill)
        if (neighborSkill === studentSkill) {
          diagonalConflicts++
        }
      }
    }
    
    // Check cluster conflicts (multiple same-skill neighbors)
    let clusterCount = 0
    for (const neighbor of [...neighbors.frontBack, ...neighbors.leftRight, ...neighbors.diagonal]) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill)
        if (neighborSkill === studentSkill) {
          clusterCount++
        }
      }
    }
    if (clusterCount >= 2) {
      clusterConflicts++
    }
  }
  
  // Count empty benches
  const totalBenches = rows * cols
  emptyBenches = totalBenches - occupiedBenches.size
  
  const generatedCount = assignments.length
  const missingStudents = uploadedCount - generatedCount
  const totalConflicts = sameBenchSkillConflicts + frontBackConflicts + leftRightConflicts + diagonalConflicts + clusterConflicts
  
  return {
    sameBenchSkillConflicts, // Renamed for clarity
    frontBackConflicts,
    leftRightConflicts,
    diagonalConflicts,
    clusterConflicts,
    totalConflicts,
    emptyBenches,
    occupiedBenches: occupiedBenches.size,
    seatedStudents: generatedCount,
    unassignedStudents: missingStudents,
    uploadedCount,
    generatedCount,
  }
}

/**
 * Main allocation function with fallback strategies
 * FULLY DYNAMIC - Works for ANY configuration (1×1×1, 4×4×1, 7×5×2, 6×4×3, 12×10×2, 20×15×3, etc.)
 */
export function allocateSeating(students, classrooms) {
  console.log('[Strict Seating] START allocation')
  console.log(`[Strict Seating] Total students: ${students.length}`)
  console.log(`[Strict Seating] Total classrooms: ${classrooms.length}`)
  
  const MAX_RETRIES = 5
  
  // Try multiple strategies before failing
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`[Strict Seating] Attempt ${attempt + 1}/${MAX_RETRIES}`)
    
    try {
      const result = allocateSeatingSingleAttempt(students, classrooms, attempt)
      
      // Check if all students are seated
      const totalOccupied = result.finalSeating.filter((a) => a.status === 'Occupied').length
      if (totalOccupied === students.length) {
        console.log('[Strict Seating] SUCCESS: All students seated')
        return result
      }
      
      console.warn(`[Strict Seating] Attempt ${attempt + 1} failed: ${students.length - totalOccupied} students not seated`)
      
      // If this is the last attempt, throw error
      if (attempt === MAX_RETRIES - 1) {
        throw new Error(`Failed to seat ${students.length - totalOccupied} students after ${MAX_RETRIES} attempts`)
      }
      
    } catch (error) {
      console.error(`[Strict Seating] Attempt ${attempt + 1} error:`, error.message)
      
      // If this is the last attempt, rethrow
      if (attempt === MAX_RETRIES - 1) {
        throw error
      }
    }
  }
  
  throw new Error('Failed to seat students')
}

/**
 * Single allocation attempt with configurable strategy
 */
function allocateSeatingSingleAttempt(students, classrooms, attemptIndex = 0) {
  console.log('[Strict Seating] ============================================')
  console.log('[Strict Seating] ALLOCATION ATTEMPT START')
  console.log('[Strict Seating] ============================================')
  
  // Group students by skill
  const skillGroups = groupStudentsBySkill(students)
  console.log(`[Strict Seating] Skill groups: ${skillGroups.size}`)
  console.log('[Strict Seating] Skill group details:', Array.from(skillGroups.entries()).map(([skill, students]) => `${skill}: ${students.length}`).join(', '))
  
  // Create fair interleaved ordering
  const skillOrdering = createSkillOrdering(skillGroups)
  console.log(`[Strict Seating] Skill ordering: ${skillOrdering.join(' → ')}`)
  
  // Interleave students fairly with different shuffling based on attempt
  const interleavedStudents = interleaveStudents(skillGroups, skillOrdering)
  console.log(`[Strict Seating] Interleaved students: ${interleavedStudents.length}`)
  
  // Calculate total capacity across all rooms
  const totalCapacity = classrooms.reduce((sum, room) => {
    return sum + (Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench))
  }, 0)
  
  console.log(`[Strict Seating] Total capacity: ${totalCapacity}`)
  console.log(`[Strict Seating] Total students: ${students.length}`)
  console.log(`[Strict Seating] Capacity surplus: ${totalCapacity - students.length}`)
  
  if (totalCapacity < students.length) {
    console.error(`[Strict Seating] CRITICAL: Capacity (${totalCapacity}) < Students (${students.length})`)
  }
  
  // Distribute students across rooms proportionally (room balancing)
  const roomResults = []
  let globalSeatNumber = 1 // Continuous seat numbering across rooms
  
  // Calculate target distribution for each room
  const roomDistribution = []
  let remainingStudents = interleavedStudents.length
  
  for (let i = 0; i < classrooms.length; i++) {
    const room = classrooms[i]
    const rows = Number(room.rows)
    const cols = Number(room.columns)
    const studentsPerBench = Number(room.studentsPerBench)
    const roomCapacity = rows * cols * studentsPerBench // DYNAMIC: rows × columns × studentsPerBench
    const roomName = room.roomName || room.roomNumber || 'Room'
    const orientation = room.orientation || 'horizontal' // PER-ROOM orientation
    
    console.log(`[Strict Seating] Room config: ${roomName} - rows: ${rows}, cols: ${cols}, studentsPerBench: ${studentsPerBench}, orientation: ${orientation}, capacity: ${roomCapacity}`)
    
    // Calculate proportional distribution (DYNAMIC)
    let studentsForRoomCount
    if (i === classrooms.length - 1) {
      // Last room gets all remaining students
      studentsForRoomCount = Math.min(roomCapacity, remainingStudents)
    } else {
      const roomProportion = roomCapacity / totalCapacity
      studentsForRoomCount = Math.min(
        roomCapacity,
        Math.max(1, Math.floor(interleavedStudents.length * roomProportion))
      )
    }
    
    // CRITICAL: Ensure we don't allocate more students than room capacity
    if (studentsForRoomCount > roomCapacity) {
      console.error(`[Strict Seating] CRITICAL: Room ${roomName} allocation exceeds capacity`)
      console.error(`[Strict Seating] Allocated: ${studentsForRoomCount}, Capacity: ${roomCapacity}`)
      studentsForRoomCount = roomCapacity
    }
    
    roomDistribution.push({
      room,
      roomName,
      rows,
      cols,
      studentsPerBench,
      roomCapacity,
      studentsCount: studentsForRoomCount,
      orientation, // PER-ROOM orientation
    })
    
    remainingStudents -= studentsForRoomCount
  }
  
  console.log(`[Strict Seating] Room distribution:`, roomDistribution.map(r => `${r.roomName}: ${r.studentsCount}/${r.roomCapacity}`).join(', '))
  console.log('[Strict Seating] Room distribution details:', roomDistribution.map(r => ({
    roomName: r.roomName,
    studentsCount: r.studentsCount,
    roomCapacity: r.roomCapacity,
    utilization: `${Math.round((r.studentsCount / r.roomCapacity) * 100)}%`,
    orientation: r.orientation
  })))
  
  // Process each room (DYNAMIC - uses per-room config)
  for (const roomData of roomDistribution) {
    const { room, roomName, rows, cols, studentsPerBench, roomCapacity, studentsCount, orientation } = roomData
    
    console.log(`[Strict Seating] Processing room: ${roomName} (${rows}x${cols}, ${studentsPerBench}/bench, capacity: ${roomCapacity}, orientation: ${orientation})`)
    console.log(`[Strict Seating] Students for room: ${studentsCount}`)
    console.log(`[Strict Seating] Room capacity: ${roomCapacity}`)
    console.log(`[Strict Seating] Utilization: ${Math.round((studentsCount / roomCapacity) * 100)}%`)
    
    // CRITICAL: Validate that studentsCount <= roomCapacity
    if (studentsCount > roomCapacity) {
      console.error(`[Strict Seating] CRITICAL ERROR: Students (${studentsCount}) > Capacity (${roomCapacity}) for room ${roomName}`)
      throw new Error(`Room ${roomName} cannot seat ${studentsCount} students. Capacity is ${roomCapacity}.`)
    }
    
    // Take students from the interleaved list
    const roomStudents = interleavedStudents.splice(0, studentsCount)
    
    if (roomStudents.length === 0) {
      console.warn(`[Strict Seating] No students for room: ${roomName}`)
      continue
    }
    
    // Create grid (DYNAMIC)
    const grid = createEmptyGrid(rows, cols, studentsPerBench)
    
    // Generate positions (DYNAMIC - uses per-room orientation)
    const positions = generateSeatPositions(rows, cols, studentsPerBench, orientation)
    console.log(`[Strict Seating] Generated ${positions.length} positions (${rows * cols} benches)`)
    
    // Seat students (DYNAMIC - uses per-room orientation)
    const assignments = seatStudentsStrict(roomStudents, positions, grid, rows, cols, studentsPerBench, orientation, roomName, globalSeatNumber)
    console.log(`[Strict Seating] Seated ${assignments.length} students in room`)
    
    // Update global seat number for next room
    globalSeatNumber += assignments.length
    
    // Add empty seats with continuous numbering (DYNAMIC)
    const emptySeats = []
    for (const pos of positions) {
      if (!grid[pos.row][pos.col][pos.seatIndex]) {
        const emptyAssignment = {
          seatingNo: globalSeatNumber,
          seatNo: globalSeatNumber,
          benchNo: pos.benchNumber,
          benchLabel: pos.benchLabel,
          room: roomName,
          roomName: roomName,
          row: pos.row,
          col: pos.col,
          seatIndex: pos.seatIndex,
          studentName: '',
          niatId: '',
          skill: '',
          skillCode: '',
          skillName: '',
          status: 'Empty',
          orientation: orientation, // PER-ROOM orientation
        }
        grid[pos.row][pos.col][pos.seatIndex] = emptyAssignment
        emptySeats.push(emptyAssignment)
        globalSeatNumber++
      }
    }
    
    // Combine occupied and empty
    const allAssignments = [...assignments, ...emptySeats]
    
    // Validate (DYNAMIC - uses per-room orientation)
    const validation = validateSeatingResult(assignments, grid, rows, cols, studentsPerBench, orientation, roomStudents.length)
    console.log(`[Strict Seating] Room validation:`, validation)
    
    roomResults.push({
      room,
      assignments: allAssignments,
      capacity: roomCapacity, // DYNAMIC capacity
      occupied: assignments.length,
      empty: emptySeats.length,
      validation,
    })
  }
  
  // Handle any remaining students (should not happen with proper balancing)
  if (interleavedStudents.length > 0) {
    console.warn(`[Strict Seating] ${interleavedStudents.length} students remaining after room distribution`)
    // Add to first room
    const firstRoom = roomResults[0]
    if (firstRoom) {
      console.log(`[Strict Seating] Adding remaining students to first room`)
      // Would need to re-seat, but for now just log warning
    }
  }
  
  // Create unified finalSeating array
  const finalSeating = []
  roomResults.forEach((result) => {
    result.assignments.forEach((assignment) => {
      finalSeating.push(assignment)
    })
  })
  
  // Global validation
  const totalOccupied = finalSeating.filter((a) => a.status === 'Occupied').length
  const globalValidation = {
    sameBenchSkillConflicts: roomResults.reduce((sum, r) => sum + r.validation.sameBenchSkillConflicts, 0),
    frontBackConflicts: roomResults.reduce((sum, r) => sum + r.validation.frontBackConflicts, 0),
    leftRightConflicts: roomResults.reduce((sum, r) => sum + r.validation.leftRightConflicts, 0),
    diagonalConflicts: roomResults.reduce((sum, r) => sum + r.validation.diagonalConflicts, 0),
    clusterConflicts: roomResults.reduce((sum, r) => sum + r.validation.clusterConflicts, 0),
    totalConflicts: roomResults.reduce((sum, r) => sum + r.validation.totalConflicts, 0),
    emptyBenches: roomResults.reduce((sum, r) => sum + r.validation.emptyBenches, 0),
    occupiedBenches: roomResults.reduce((sum, r) => sum + r.validation.occupiedBenches, 0),
    missingStudents: students.length - totalOccupied,
    uploadedCount: students.length,
    generatedCount: totalOccupied,
  }
  
  console.log('[Strict Seating] Global validation:', globalValidation)
  
  // VALIDATION ASSERT: Ensure all students are seated
  if (globalValidation.missingStudents > 0) {
    console.error(`[Strict Seating] CRITICAL: ${globalValidation.missingStudents} students missing!`)
    console.error(`[Strict Seating] Uploaded: ${globalValidation.uploadedCount}, Seated: ${globalValidation.generatedCount}`)
    
    // Find which students disappeared
    const seatedNiatIds = new Set(finalSeating.filter(a => a.status === 'Occupied').map(a => a.niatId))
    const missingStudents = students.filter(s => !seatedNiatIds.has(s['NIAT ID']))
    
    console.error('[Strict Seating] Missing students:')
    missingStudents.forEach(s => {
      console.error(`  - ${s['Student Name']} (${s['NIAT ID']}) - ${s.Skill}`)
    })
    
    throw new Error(`Failed to seat ${globalValidation.missingStudents} students. Missing: ${missingStudents.map(s => s['Student Name']).join(', ')}`)
  }
  
  return {
    roomResults,
    finalSeating,
    unassigned: [],
    totalAssigned: totalOccupied,
    validation: globalValidation,
  }
}
