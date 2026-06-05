/**
 * STRICT INVIGILATION SEATING ALGORITHM
 * 
 * Objective: NO SAME SKILL in same bench, left/right, front/back
 * Only violate if mathematically impossible
 * 
 * Primary goal: maximize separation
 * Secondary goal: no empty benches
 * Tertiary goal: seat everyone
 * 
 * Orientation (horizontal/vertical) affects bench numbering and adjacency
 */

export const SEATING_LOGIC_VERSION = 23
export const CLASSROOM_LAYOUT_VERSION = 3
export const SEATING_NUMBERING_VERSION = 5

/**
 * Normalize skill to lowercase string
 */
function normalizeSkill(skill) {
  return String(skill ?? '').trim().toLowerCase()
}

/**
 * Build bench order based on orientation
 * Used by: dashboard preview, auto seating, manual seating, 3D layout, excel export
 * Single source of truth for bench numbering
 */
export function buildBenchOrder(rows, cols, orientation = 'horizontal') {
  const benches = []
  let benchNumber = 1

  if (orientation === 'vertical') {
    // Vertical: column-major order
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        benches.push({
          benchNumber,
          benchLabel: `B${benchNumber}`,
          row,
          col,
          benchIndex: benchNumber - 1,
        })
        benchNumber++
      }
    }
  } else {
    // Horizontal: row-major order (default)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        benches.push({
          benchNumber,
          benchLabel: `B${benchNumber}`,
          row,
          col,
          benchIndex: benchNumber - 1,
        })
        benchNumber++
      }
    }
  }

  return benches
}

/**
 * Get room bench count
 */
export function getRoomBenchCount(room) {
  return Number(room.rows) * Number(room.columns)
}

/**
 * Get room capacity
 */
export function getRoomCapacity(room) {
  return getRoomBenchCount(room) * Number(room.studentsPerBench)
}

/**
 * Shuffle array randomly
 */
function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * STEP 1: Group students by skill, sort descending by count
 */
function groupStudentsBySkill(students) {
  const bySkill = new Map()
  students.forEach((s) => {
    const key = normalizeSkill(s.Skill) || '__none__'
    if (!bySkill.has(key)) bySkill.set(key, [])
    bySkill.get(key).push(s)
  })

  const sorted = [...bySkill.entries()].sort((a, b) => b[1].length - a[1].length)
  return sorted.map(([skill, students]) => ({ skill, students }))
}

/**
 * Check if bench exists in grid
 */
function benchExists(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < grid[row].length
}

/**
 * Get all occupants of a bench
 */
function getBenchOccupants(grid, row, col) {
  if (!benchExists(grid, row, col)) return []
  return grid[row][col].filter(Boolean)
}

/**
 * Check if bench has a specific skill
 */
function benchHasSkill(grid, row, col, normalizedSkill) {
  if (!normalizedSkill) return false
  return getBenchOccupants(grid, row, col).some(
    (o) => normalizeSkill(o.skillCode ?? o.skill ?? o.Skill) === normalizedSkill,
  )
}

/**
 * Check if placing a student at a position would create a conflict with neighbors
 * STRICT: No same skill in front/back/left/right benches
 * Orientation-aware: vertical mode uses column-major neighbor logic
 */
function hasSkillConflict(grid, row, col, normalizedSkill, orientation = 'horizontal') {
  if (!normalizedSkill) return false

  // Check all 4 neighbors: front, back, left, right
  // In horizontal mode: front/back = row changes, left/right = column changes
  // In vertical mode: front/back = column changes (column-major), left/right = row changes
  let neighbors = []
  
  if (orientation === 'vertical') {
    // Vertical mode (column-major): front/back follow column direction
    neighbors = [
      [row, col - 1], // front (previous in column)
      [row, col + 1], // back (next in column)
      [row - 1, col], // left (previous row, same column)
      [row + 1, col], // right (next row, same column)
    ]
  } else {
    // Horizontal mode (row-major): front/back follow row direction
    neighbors = [
      [row - 1, col], // front (previous row)
      [row + 1, col], // back (next row)
      [row, col - 1], // left (previous column)
      [row, col + 1], // right (next column)
    ]
  }

  for (const [r, c] of neighbors) {
    if (benchExists(grid, r, c) && benchHasSkill(grid, r, c, normalizedSkill)) {
      return true
    }
  }

  return false
}

/**
 * STRICT VALIDATION: Check if student can be placed at position
 * Returns false if ANY neighbor has same skill (same bench, left, right, front, back)
 * This is used BEFORE placement, not after
 */
function canPlaceStudent(grid, row, col, seatIndex, normalizedSkill, orientation = 'horizontal') {
  if (!normalizedSkill) return true

  // Check same bench conflict
  if (hasSameBenchConflict(grid, row, col, seatIndex, normalizedSkill)) {
    return false
  }

  // Check neighbor conflicts (front, back, left, right)
  if (hasSkillConflict(grid, row, col, normalizedSkill, orientation)) {
    return false
  }

  return true
}

/**
 * Check if placing a student at a position would create a conflict with same bench
 */
function hasSameBenchConflict(grid, row, col, seatIndex, normalizedSkill) {
  if (!normalizedSkill) return false
  if (!benchExists(grid, row, col)) return false

  const benchSeats = grid[row][col]
  for (let i = 0; i < benchSeats.length; i++) {
    if (i === seatIndex) continue
    const other = benchSeats[i]
    if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === normalizedSkill) {
      return true
    }
  }

  return false
}

/**
 * Get occupant of a specific seat
 */
function getSeatOccupant(grid, row, col, seatIndex) {
  if (!benchExists(grid, row, col)) return null
  return grid[row][col][seatIndex] || null
}

/**
 * Place student in grid
 */
function placeStudentInGrid(grid, pos, student) {
  grid[pos.row][pos.col][pos.seatIndex] = student
}

/**
 * STEP 4: Global seat scoring
 * Evaluate ALL candidate seats, NOT first seat
 * Heavy penalties for violations
 * STRICT INVIGILATION - different adjacency for vertical vs horizontal
 */
function evaluateSeat(grid, pos, student, rows, cols, orientation = 'horizontal') {
  const normalized = normalizeSkill(student.Skill)
  if (!normalized) return 0

  const { row, col, seatIndex } = pos
  let penalty = 0

  // Penalties (negative = bad) - choose LOWEST penalty seat
  
  // Same bench skill = -10000 (HARD BLOCK)
  const benchSeats = grid[row][col]
  for (let i = 0; i < benchSeats.length; i++) {
    if (i === seatIndex) continue
    const other = benchSeats[i]
    if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === normalized) {
      penalty -= 10000
    }
  }

  if (orientation === 'vertical') {
    // VERTICAL MODE: column-major adjacency
    // rows = front/back, columns = side
    // Front/back = same column, different row
    // Left/right = same row, different column
    
    // Front/back same skill = -5000 (STRICT)
    if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, normalized)) {
      penalty -= 5000
    }
    if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, normalized)) {
      penalty -= 5000
    }
    
    // Left/right same skill = -3000
    if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, normalized)) {
      penalty -= 3000
    }
    if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, normalized)) {
      penalty -= 3000
    }
    
    // Same lane repetition = -2500 (same column, multiple rows)
    for (let r = 0; r < rows; r++) {
      if (r === row) continue
      if (benchExists(grid, r, col) && benchHasSkill(grid, r, col, normalized)) {
        penalty -= 2500
      }
    }
    
    // Same row repetition = -500
    for (let c = 0; c < cols; c++) {
      if (c === col) continue
      if (benchExists(grid, row, c) && benchHasSkill(grid, row, c, normalized)) {
        penalty -= 500
      }
    }
  } else {
    // HORIZONTAL MODE: row-major adjacency
    // rows = side, columns = front/back
    // Front/back = same row, different column
    // Left/right = same column, different row
    
    // Front/back same skill = -5000 (STRICT)
    if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, normalized)) {
      penalty -= 5000
    }
    if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, normalized)) {
      penalty -= 5000
    }
    
    // Left/right same skill = -3000
    if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, normalized)) {
      penalty -= 3000
    }
    if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, normalized)) {
      penalty -= 3000
    }
    
    // Same lane repetition = -2500 (same row, multiple columns)
    for (let c = 0; c < cols; c++) {
      if (c === col) continue
      if (benchExists(grid, row, c) && benchHasSkill(grid, row, c, normalized)) {
        penalty -= 2500
      }
    }
    
    // Same row repetition = -500
    for (let r = 0; r < rows; r++) {
      if (r === row) continue
      if (benchExists(grid, r, col) && benchHasSkill(grid, r, col, normalized)) {
        penalty -= 500
      }
    }
  }

  // Bonuses (positive = good)
  
  // Distance bonus = +200
  let minDistance = Infinity
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === row && c === col) continue
      if (benchExists(grid, r, c) && benchHasSkill(grid, r, c, normalized)) {
        const distance = Math.abs(r - row) + Math.abs(c - col)
        minDistance = Math.min(minDistance, distance)
      }
    }
  }
  if (minDistance === Infinity) {
    penalty += 200 // No same skill nearby
  } else if (minDistance >= 3) {
    penalty += 200
  }

  // Empty bench bonus = +300
  const benchOccupants = getBenchOccupants(grid, row, col)
  if (benchOccupants.length === 0) {
    penalty += 300
  }

  // Spread bonus = +200
  const nearbySkills = new Set()
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      if (benchExists(grid, row + dr, col + dc)) {
        const occupants = getBenchOccupants(grid, row + dr, col + dc)
        occupants.forEach((o) => {
          const s = normalizeSkill(o.skillCode ?? o.skill ?? o.Skill)
          if (s) nearbySkills.add(s)
        })
      }
    }
  }
  if (nearbySkills.size > 0 && !nearbySkills.has(normalized)) {
    penalty += 200
  }

  return penalty
}

/**
 * Create empty grid
 */
function createEmptyGrid(rows, cols, studentsPerBench) {
  const grid = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      row.push(new Array(studentsPerBench).fill(null))
    }
    grid.push(row)
  }
  return grid
}

/**
 * Build seat positions for room
 */
function buildSeatPositionsForRoom(room, orientation = 'horizontal') {
  const rows = Number(room.rows)
  const cols = Number(room.columns)
  const studentsPerBench = Number(room.studentsPerBench)
  const positions = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let s = 0; s < studentsPerBench; s++) {
        positions.push({
          row: r,
          col: c,
          seatIndex: s,
          benchNumber: r * cols + c + 1,
          benchLabel: `B${r * cols + c + 1}`,
          benchIndex: r * cols + c,
        })
      }
    }
  }

  return { positions, rows, cols }
}

/**
 * Generate snake order positions
 */
function generateSnakeOrder(positions, rows, cols) {
  const ordered = []
  for (let r = 0; r < rows; r++) {
    const rowPositions = positions.filter((p) => p.row === r)
    if (r % 2 === 0) {
      ordered.push(...rowPositions.sort((a, b) => a.col - b.col))
    } else {
      ordered.push(...rowPositions.sort((a, b) => b.col - a.col))
    }
  }
  return ordered
}

/**
 * STEP 3: Bench layer filling
 * PASS 1: Fill every bench with ONE student
 * PASS 2: Fill second student/**
 * PASS 3: Fill third student
 * EMPTY BENCH POLICY: Spread students first, then fill second/third seats
 * Priority: 1. No same skill adjacency, 2. No empty bench, 3. Bench capacity
 */
function seatRoomWithStrictInvigilation(students, room, startingSeatingNo, orientation = 'horizontal') {
  const studentsPerBench = Number(room.studentsPerBench)
  const { positions, cols, rows } = buildSeatPositionsForRoom(room, orientation)
  let grid = createEmptyGrid(rows, cols, studentsPerBench)
  let assignments = []
  let nextSeatingNo = startingSeatingNo

  // Group positions by bench
  const positionsByBench = new Map()
  for (const pos of positions) {
    if (!positionsByBench.has(pos.benchIndex)) {
      positionsByBench.set(pos.benchIndex, [])
    }
    positionsByBench.get(pos.benchIndex).push(pos)
  }

  const benchCount = positionsByBench.size

  // EMPTY BENCH POLICY: Compute bench load dynamically
  // Spread students evenly - NO empty benches while students remain
  const benchLoad = new Array(benchCount).fill(0)
  let remaining = students.length

  // First pass: ensure every bench gets at least 1 student
  for (let benchIndex = 0; benchIndex < benchCount && remaining > 0; benchIndex++) {
    benchLoad[benchIndex] = 1
    remaining--
  }

  // Second pass: add second student to benches
  for (let benchIndex = 0; benchIndex < benchCount && remaining > 0; benchIndex++) {
    benchLoad[benchIndex] = 2
    remaining--
  }

  // Third pass: add third student to benches
  for (let benchIndex = 0; benchIndex < benchCount && remaining > 0; benchIndex++) {
    benchLoad[benchIndex] = 3
    remaining--
  }

  // Assign students to benches using BENCH-FIRST approach
  let remainingStudents = [...students]
  const benchStudentMap = new Map()

  // PASS 1: Place one student in every bench (minimum occupancy - EMPTY BENCH POLICY)
  for (let benchIndex = 0; benchIndex < benchCount; benchIndex++) {
    if (benchLoad[benchIndex] === 0) continue
    if (remainingStudents.length === 0) break

    if (!benchStudentMap.has(benchIndex)) {
      benchStudentMap.set(benchIndex, [])
    }

    let bestStudent = null
    let bestPenalty = Infinity

    for (const student of remainingStudents) {
      const benchPositions = positionsByBench.get(benchIndex)
      const pos = benchPositions[0]
      const normalized = normalizeSkill(student.Skill)

      // STRICT VALIDATION: Check if student can be placed BEFORE placement
      const canPlace = canPlaceStudent(grid, pos.row, pos.col, pos.seatIndex, normalized, orientation)
      
      if (!canPlace) {
        // HARD REJECT: Skip this student for this seat
        continue
      }

      // Safe placement - evaluate score
      const penalty = evaluateSeat(grid, pos, student, rows, cols, orientation)
      if (penalty < bestPenalty) {
        bestPenalty = penalty
        bestStudent = student
      }
    }

    if (bestStudent) {
      const studentIndex = remainingStudents.indexOf(bestStudent)
      remainingStudents.splice(studentIndex, 1)
      benchStudentMap.get(benchIndex).push(bestStudent)
    } else {
      console.warn(`[Strict Seating] No valid student found for bench ${benchIndex + 1} in PASS 1`)
    }
  }

  // PASS 2: Place second student in every bench
  for (let benchIndex = 0; benchIndex < benchCount; benchIndex++) {
    if (benchLoad[benchIndex] < 2) continue
    if (remainingStudents.length === 0) break

    let bestStudent = null
    let bestPenalty = Infinity

    for (const student of remainingStudents) {
      const benchPositions = positionsByBench.get(benchIndex)
      if (benchPositions.length < 2) continue
      const pos = benchPositions[1]
      const normalized = normalizeSkill(student.Skill)

      // STRICT VALIDATION: Check if student can be placed BEFORE placement
      const canPlace = canPlaceStudent(grid, pos.row, pos.col, pos.seatIndex, normalized, orientation)
      
      if (!canPlace) {
        // HARD REJECT: Skip this student for this seat
        continue
      }

      // Safe placement - evaluate score
      const penalty = evaluateSeat(grid, pos, student, rows, cols, orientation)
      if (penalty < bestPenalty) {
        bestPenalty = penalty
        bestStudent = student
      }
    }

    if (bestStudent) {
      const studentIndex = remainingStudents.indexOf(bestStudent)
      remainingStudents.splice(studentIndex, 1)
      benchStudentMap.get(benchIndex).push(bestStudent)
    } else {
      console.warn(`[Strict Seating] No valid student found for bench ${benchIndex + 1} in PASS 2`)
    }
  }

  // PASS 3: Place third student in every bench
  for (let benchIndex = 0; benchIndex < benchCount; benchIndex++) {
    if (benchLoad[benchIndex] < 3) continue
    if (remainingStudents.length === 0) break

    let bestStudent = null
    let bestPenalty = Infinity

    for (const student of remainingStudents) {
      const benchPositions = positionsByBench.get(benchIndex)
      if (benchPositions.length < 3) continue
      const pos = benchPositions[2]
      const normalized = normalizeSkill(student.Skill)

      // STRICT VALIDATION: Check if student can be placed BEFORE placement
      const canPlace = canPlaceStudent(grid, pos.row, pos.col, pos.seatIndex, normalized, orientation)
      
      if (!canPlace) {
        // HARD REJECT: Skip this student for this seat
        continue
      }

      // Safe placement - evaluate score
      const penalty = evaluateSeat(grid, pos, student, rows, cols, orientation)
      if (penalty < bestPenalty) {
        bestPenalty = penalty
        bestStudent = student
      }
    }

    if (bestStudent) {
      const studentIndex = remainingStudents.indexOf(bestStudent)
      remainingStudents.splice(studentIndex, 1)
      benchStudentMap.get(benchIndex).push(bestStudent)
    } else {
      console.warn(`[Strict Seating] No valid student found for bench ${benchIndex + 1} in PASS 3`)
    }
  }

  // Place students in each bench using global seat scoring
  const allPositions = generateSnakeOrder(positions, rows, cols)
  
  for (const [benchIndex, benchStudents] of benchStudentMap) {
    const benchPositions = positionsByBench.get(benchIndex)

    for (const student of benchStudents) {
      let bestPos = null
      let bestPenalty = Infinity
      const normalized = normalizeSkill(student.Skill)

      // Evaluate ALL candidate seats, NOT first seat
      for (const pos of benchPositions) {
        const occupant = getSeatOccupant(grid, pos.row, pos.col, pos.seatIndex)
        if (occupant) continue

        // STRICT VALIDATION: Check if student can be placed BEFORE placement
        const canPlace = canPlaceStudent(grid, pos.row, pos.col, pos.seatIndex, normalized, orientation)
        
        if (!canPlace) {
          // HARD REJECT: Skip this seat
          continue
        }

        // Safe placement - evaluate score
        const penalty = evaluateSeat(grid, pos, student, rows, cols, orientation)
        if (penalty < bestPenalty) {
          bestPenalty = penalty
          bestPos = pos
        }
      }

      if (bestPos) {
        const assignment = {
          seatingNo: nextSeatingNo,
          seatNo: nextSeatingNo,
          benchNo: bestPos.benchNumber,
          benchLabel: bestPos.benchLabel,
          room: room.roomName,
          roomName: room.roomName,
          row: bestPos.row,
          col: bestPos.col,
          seatIndex: bestPos.seatIndex,
          studentName: student['Student Name'],
          niatId: student['NIAT ID'],
          skill: student.Skill,
          skillCode: student.Skill,
          skillName: student['Skill Name'] || student.Skill,
          status: 'Occupied',
          student,
          orientation: orientation,
        }

        placeStudentInGrid(grid, bestPos, assignment)
        assignments.push(assignment)
        nextSeatingNo++
      } else {
        console.warn(`[Strict Seating] Could not seat student: ${student['Student Name']}`)
      }
    }
  }

  return { assignments, grid, nextSeatingNo }
}

/**
 * STEP 5: Repair pass (MINIMAL - only used as final optimization)
 * Since we now validate BEFORE placement, this is only for edge cases
 * Uses hasSkillConflict for strict neighbor checking
 */
function repairConflicts(assignments, grid, rows, cols, orientation = 'horizontal') {
  let improved = true
  let iterations = 0
  const maxIterations = 100 // Reduced iterations since we validate before placement

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]
      const normalized = normalizeSkill(assignment.skillCode)

      if (!normalized) continue

      const { row, col } = assignment

      // Check for neighbor conflicts using hasSkillConflict (STRICT)
      const hasNeighborConflict = hasSkillConflict(grid, row, col, normalized)

      // Check same bench conflict
      let hasBenchConflict = false
      const benchSeats = grid[row][col]
      for (let j = 0; j < benchSeats.length; j++) {
        if (j === assignment.seatIndex) continue
        const other = benchSeats[j]
        if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === normalized) {
          hasBenchConflict = true
          break
        }
      }

      if (!hasNeighborConflict && !hasBenchConflict) continue

      // Try to swap with another student to resolve conflicts
      for (let j = 0; j < assignments.length; j++) {
        if (i === j) continue

        const otherAssignment = assignments[j]
        const otherNormalized = normalizeSkill(otherAssignment.skillCode)

        if (!otherNormalized) continue

        // Check if swapping would resolve conflicts
        const currentConflict = hasNeighborConflict || hasBenchConflict
        const otherHasNeighborConflict = hasSkillConflict(grid, otherAssignment.row, otherAssignment.col, otherNormalized)
        
        // Check other bench conflict
        let otherHasBenchConflict = false
        const otherBenchSeats = grid[otherAssignment.row][otherAssignment.col]
        for (let k = 0; k < otherBenchSeats.length; k++) {
          if (k === otherAssignment.seatIndex) continue
          const other = otherBenchSeats[k]
          if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === otherNormalized) {
            otherHasBenchConflict = true
            break
          }
        }

        // Temporarily swap
        const temp = { ...assignment }
        assignments[i] = { ...otherAssignment }
        assignments[j] = { ...temp }

        // Update grid
        grid[row][col][assignment.seatIndex] = otherAssignment
        grid[otherAssignment.row][otherAssignment.col][otherAssignment.seatIndex] = assignment

        // Check if swap resolves conflicts
        const newConflict1 = hasSkillConflict(grid, row, col, otherNormalized)
        const newConflict2 = hasSkillConflict(grid, otherAssignment.row, otherAssignment.col, normalized)

        // Check new bench conflicts
        let newBenchConflict1 = false
        const newBenchSeats1 = grid[row][col]
        for (let k = 0; k < newBenchSeats1.length; k++) {
          if (k === assignment.seatIndex) continue
          const other = newBenchSeats1[k]
          if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === otherNormalized) {
            newBenchConflict1 = true
            break
          }
        }

        let newBenchConflict2 = false
        const newBenchSeats2 = grid[otherAssignment.row][otherAssignment.col]
        for (let k = 0; k < newBenchSeats2.length; k++) {
          if (k === otherAssignment.seatIndex) continue
          const other = newBenchSeats2[k]
          if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === normalized) {
            newBenchConflict2 = true
            break
          }
        }

        // If swap reduces conflicts, keep it
        const oldTotalConflicts = (currentConflict ? 1 : 0) + (hasBenchConflict ? 1 : 0) + (otherHasNeighborConflict ? 1 : 0) + (otherHasBenchConflict ? 1 : 0)
        const newTotalConflicts = (newConflict1 ? 1 : 0) + (newBenchConflict1 ? 1 : 0) + (newConflict2 ? 1 : 0) + (newBenchConflict2 ? 1 : 0)

        if (newTotalConflicts < oldTotalConflicts) {
          improved = true
          break
        } else {
          // Revert swap
          assignments[i] = temp
          assignments[j] = otherAssignment
          grid[row][col][assignment.seatIndex] = assignment
          grid[otherAssignment.row][otherAssignment.col][otherAssignment.seatIndex] = otherAssignment
        }
      }
    }
  }

  console.log('[Strict Seating] Repair pass completed after', iterations, 'iterations')
  return assignments
}

/**
 * Generate empty seats for remaining capacity
 */
function generateEmptySeats(grid, room, startingSeatingNo, orientation = 'horizontal') {
  const studentsPerBench = Number(room.studentsPerBench)
  const { positions, cols, rows } = buildSeatPositionsForRoom(room, orientation)
  const emptySeats = []
  let nextSeatingNo = startingSeatingNo

  const orderedPositions = [...positions].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row
    if (a.col !== b.col) return a.col - b.col
    return a.seatIndex - b.seatIndex
  })

  for (const pos of orderedPositions) {
    const occupant = getSeatOccupant(grid, pos.row, pos.col, pos.seatIndex)
    if (!occupant) {
      emptySeats.push({
        seatNo: nextSeatingNo,
        benchNo: pos.benchNumber,
        benchLabel: pos.benchLabel,
        roomName: room.roomName,
        row: pos.row,
        col: pos.col,
        seatIndex: pos.seatIndex,
        studentName: '',
        niatId: '',
        skillCode: '',
        skillName: '',
        status: 'Empty',
        student: null,
      })
      nextSeatingNo++
    }
  }

  return emptySeats
}

/**
 * Distribute students across rooms with balanced allocation
 */
function distributeStudentsAcrossRooms(students, classrooms) {
  const n = classrooms.length
  if (!n) {
    return { buckets: [], unassigned: [...students] }
  }

  const capacities = classrooms.map((room) =>
    Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
  )
  const totalCap = capacities.reduce((a, b) => a + b, 0)

  if (students.length > totalCap) {
    return {
      buckets: classrooms.map((room) => ({ room, students: [] })),
      unassigned: [...students],
    }
  }

  // Calculate balanced target per room
  const base = Math.floor(students.length / n)
  const remaining = students.length % n

  // Create room targets with capacity constraints
  const roomTargets = []
  for (let i = 0; i < n; i++) {
    let target = base + (i < remaining ? 1 : 0)
    target = Math.min(target, capacities[i])
    roomTargets.push(target)
  }

  // Adjust if total targets don't match student count
  let totalTarget = roomTargets.reduce((a, b) => a + b, 0)
  if (totalTarget < students.length) {
    let diff = students.length - totalTarget
    for (let i = 0; i < n && diff > 0; i++) {
      const canAdd = capacities[i] - roomTargets[i]
      const add = Math.min(canAdd, diff)
      roomTargets[i] += add
      diff -= add
    }
  }

  // Group by skill
  const skillGroups = groupStudentsBySkill(students)

  // Initialize room buckets
  const buckets = classrooms.map((room, i) => ({
    room,
    students: [],
    count: 0,
    capacity: capacities[i],
    skillCounts: {},
    target: roomTargets[i],
  }))

  // Distribute each skill group evenly across ALL rooms
  for (const { skill, students: skillStudents } of skillGroups) {
    const skillCount = skillStudents.length
    const targets = computeSkillTargets(skillCount, n)

    for (const student of shuffle(skillStudents)) {
      let bestIdx = -1
      let bestScore = Infinity

      for (let i = 0; i < n; i++) {
        const bucket = buckets[i]
        if (bucket.count >= bucket.target) continue

        const currentSkillCount = bucket.skillCounts[skill] || 0
        const skillTarget = targets[i]
        const skillGap = currentSkillCount - skillTarget
        const roomGap = bucket.count - bucket.target

        const score = Math.abs(skillGap) * 100 + Math.abs(roomGap) * 200

        if (score < bestScore) {
          bestScore = score
          bestIdx = i
        }
      }

      if (bestIdx !== -1) {
        buckets[bestIdx].students.push(student)
        buckets[bestIdx].count++
        buckets[bestIdx].skillCounts[skill] = (buckets[bestIdx].skillCounts[skill] || 0) + 1
      }
    }
  }

  const unassigned = []
  const finalBuckets = buckets.map((bucket) => {
    if (bucket.count > bucket.target) {
      const excess = bucket.count - bucket.target
      const removed = bucket.students.splice(-excess)
      unassigned.push(...removed)
      bucket.count = bucket.target
    }
    return bucket
  })

  return { buckets: finalBuckets, unassigned }
}

/**
 * Compute skill targets for balanced distribution
 */
function computeSkillTargets(skillCount, roomCount) {
  const targets = []
  const base = Math.floor(skillCount / roomCount)
  const remaining = skillCount % roomCount

  for (let i = 0; i < roomCount; i++) {
    targets.push(base + (i < remaining ? 1 : 0))
  }

  return targets
}

/**
 * Validate seating result and print conflicts
 */
function validateSeatingResult(roomResults, orientation = 'horizontal') {
  let sameBenchConflicts = 0
  let frontBackConflicts = 0
  let leftRightConflicts = 0
  let laneConflicts = 0
  let emptyBenches = 0
  let occupiedBenches = 0

  for (const result of roomResults) {
    const { assignments, room } = result
    const rows = Number(room.rows)
    const cols = Number(room.columns)

    // Build grid for conflict checking
    const grid = createEmptyGrid(rows, cols, Number(room.studentsPerBench))
    assignments.forEach((a) => {
      if (a.status === 'Occupied') {
        grid[a.row][a.col][a.seatIndex] = a
      }
    })

    // Count bench utilization
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const occupants = getBenchOccupants(grid, r, c)
        if (occupants.length === 0) {
          emptyBenches++
        } else {
          occupiedBenches++
        }
      }
    }

    // Check conflicts
    assignments.forEach((a) => {
      if (a.status !== 'Occupied') return
      const normalized = normalizeSkill(a.skillCode)
      if (!normalized) return

      const { row, col, seatIndex } = a

      // Same bench conflict
      const benchSeats = grid[row][col]
      for (let i = 0; i < benchSeats.length; i++) {
        if (i === seatIndex) continue
        const other = benchSeats[i]
        if (other && normalizeSkill(other.skillCode ?? other.skill ?? other.Skill) === normalized) {
          sameBenchConflicts++
        }
      }

      if (orientation === 'vertical') {
        // VERTICAL: front/back = same column, different row
        if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, normalized)) {
          frontBackConflicts++
        }
        if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, normalized)) {
          frontBackConflicts++
        }
        // Left/right = same row, different column
        if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, normalized)) {
          leftRightConflicts++
        }
        if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, normalized)) {
          leftRightConflicts++
        }
        // Same lane = same column
        for (let r = 0; r < rows; r++) {
          if (r === row) continue
          if (benchExists(grid, r, col) && benchHasSkill(grid, r, col, normalized)) {
            laneConflicts++
          }
        }
      } else {
        // HORIZONTAL: front/back = same row, different column
        if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, normalized)) {
          frontBackConflicts++
        }
        if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, normalized)) {
          frontBackConflicts++
        }
        // Left/right = same column, different row
        if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, normalized)) {
          leftRightConflicts++
        }
        if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, normalized)) {
          leftRightConflicts++
        }
        // Same lane = same row
        for (let c = 0; c < cols; c++) {
          if (c === col) continue
          if (benchExists(grid, row, c) && benchHasSkill(grid, row, c, normalized)) {
            laneConflicts++
          }
        }
      }
    })
  }

  console.log('[Strict Seating] VALIDATION RESULTS:')
  console.log('[Strict Seating] sameBenchConflicts:', sameBenchConflicts)
  console.log('[Strict Seating] frontBackConflicts:', frontBackConflicts)
  console.log('[Strict Seating] leftRightConflicts:', leftRightConflicts)
  console.log('[Strict Seating] laneConflicts:', laneConflicts)
  console.log('[Strict Seating] emptyBenches:', emptyBenches)
  console.log('[Strict Seating] occupiedBenches:', occupiedBenches)

  return {
    sameBenchConflicts,
    frontBackConflicts,
    leftRightConflicts,
    laneConflicts,
    emptyBenches,
    occupiedBenches,
  }
}

/**
 * Main allocation function
 */
export function allocateSeating(students, classrooms) {
  console.log('[Strict Seating] Starting allocation with', students.length, 'students and', classrooms.length, 'rooms')

  // Distribute students across rooms
  const { buckets, unassigned: distributionUnassigned } = distributeStudentsAcrossRooms(students, classrooms)
  console.log('[Strict Seating] Distributed to', buckets.length, 'rooms, unassigned:', distributionUnassigned.length)

  const roomResults = []
  let globalSeatNumber = 1

  for (const bucket of buckets) {
    const room = bucket.room
    const roomStudents = bucket.students
    const orientation = room.orientation || 'horizontal'

    console.log('[Strict Seating] Processing room:', room.roomName || room.roomNumber, 'students:', roomStudents.length)

    // Seat students with strict invigilation
    const { assignments, grid, nextSeatingNo } = seatRoomWithStrictInvigilation(
      roomStudents,
      room,
      globalSeatNumber,
      orientation,
    )
    console.log('[Strict Seating] Seated:', assignments.length, 'nextSeatingNo:', nextSeatingNo)

    // Repair pass: swap conflicting students
    const { positions, cols, rows } = buildSeatPositionsForRoom(room, orientation)
    const repairedAssignments = repairConflicts(assignments, grid, rows, cols, orientation)
    console.log('[Strict Seating] Repaired conflicts:', repairedAssignments.length)

    // Generate empty seats
    const emptySeats = generateEmptySeats(grid, room, nextSeatingNo, orientation)
    console.log('[Strict Seating] Empty seats:', emptySeats.length)

    // Combine occupied and empty seats
    const finalSeats = [...repairedAssignments, ...emptySeats].sort((a, b) => a.seatNo - b.seatNo)

    roomResults.push({
      room,
      assignments: finalSeats,
      capacity: Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench),
      occupied: repairedAssignments.length,
      unassigned: 0,
    })

    globalSeatNumber = nextSeatingNo + emptySeats.length
  }

  // Handle unassigned students
  if (distributionUnassigned.length > 0) {
    console.warn('[Strict Seating] Unassigned students:', distributionUnassigned.length)
  }

  // Validate and print conflicts (PURE VALIDATION - no side effects)
  const orientation = classrooms[0]?.orientation || 'horizontal'
  const validation = validateSeatingResult(roomResults, orientation)

  console.log('[Strict Seating] Validation result:', validation)

  // Create unified finalSeating array
  const finalSeating = []
  roomResults.forEach((result) => {
    result.assignments.forEach((assignment) => {
      finalSeating.push({
        seatingNo: assignment.seatingNo,
        seatNo: assignment.seatNo,
        benchNo: assignment.benchNo,
        benchLabel: assignment.benchLabel,
        room: assignment.room || assignment.roomName,
        roomName: assignment.roomName,
        row: assignment.row,
        col: assignment.col,
        seatIndex: assignment.seatIndex,
        studentName: assignment.studentName,
        niatId: assignment.niatId,
        skill: assignment.skill || assignment.skillCode,
        skillCode: assignment.skillCode,
        skillName: assignment.skillName,
        status: assignment.status,
        orientation: assignment.orientation || orientation,
      })
    })
  })

  return {
    roomResults,
    finalSeating,
    unassigned: distributionUnassigned,
    totalAssigned: students.length - distributionUnassigned.length,
    validation,
  }
}
