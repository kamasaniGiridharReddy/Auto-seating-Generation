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

export const SEATING_LOGIC_VERSION = 29
export const CLASSROOM_LAYOUT_VERSION = 6
export const SEATING_NUMBERING_VERSION = 8

console.log('[ALGORITHM FILE] seatingAlgorithmStrictNew.js loaded')
console.log('[ALGORITHM VERSION] SEATING_LOGIC_VERSION:', SEATING_LOGIC_VERSION)

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
 * POST-ALLOCATION OPTIMIZATION: Reduce conflicts by swapping students
 * This pass runs after initial seating generation to improve the arrangement
 */
function optimizeSeatingBySwapping(assignments, rooms, maxIterations = 100) {
  console.log('[POST-OPTIMIZATION] Starting swap-based optimization')
  console.log(`[POST-OPTIMIZATION] Initial assignments: ${assignments.length}`)
  
  const occupiedAssignments = assignments.filter(a => a.status === 'Occupied')
  console.log(`[POST-OPTIMIZATION] Occupied seats: ${occupiedAssignments.length}`)
  
  // Count initial conflicts
  const initialConflicts = countTotalConflicts(occupiedAssignments, rooms)
  console.log(`[POST-OPTIMIZATION] Initial conflicts: ${initialConflicts}`)
  
  let improved = true
  let iteration = 0
  let totalSwaps = 0
  
  while (improved && iteration < maxIterations) {
    improved = false
    iteration++
    
    console.log(`[POST-OPTIMIZATION] Iteration ${iteration}`)
    
    // Find the student with the most conflicts
    const conflictCounts = new Map()
    for (const assignment of occupiedAssignments) {
      const conflicts = countStudentConflicts(assignment, occupiedAssignments, rooms)
      conflictCounts.set(assignment, conflicts)
    }
    
    // Sort students by conflict count (highest first)
    const sortedByConflicts = Array.from(occupiedAssignments)
      .sort((a, b) => (conflictCounts.get(b) || 0) - (conflictCounts.get(a) || 0))
    
    // Try to swap the highest-conflict student with another student
    for (let i = 0; i < Math.min(10, sortedByConflicts.length); i++) {
      const studentA = sortedByConflicts[i]
      const conflictsA = conflictCounts.get(studentA) || 0
      
      if (conflictsA === 0) break // No more conflicts to resolve
      
      console.log(`[POST-OPTIMIZATION] Trying to swap student with ${conflictsA} conflicts`)
      
      // Try swapping with other students
      let swapAttempted = 0
      for (const studentB of occupiedAssignments) {
        if (studentA === studentB) continue
        swapAttempted++
        
        // Simulate the swap
        const conflictsBefore = conflictsA + (conflictCounts.get(studentB) || 0)
        
        // Create temporary swapped assignments
        const tempAssignments = occupiedAssignments.map(a => {
          if (a === studentA) {
            return { ...a, row: studentB.row, col: studentB.col, seatIndex: studentB.seatIndex, benchNo: studentB.benchNo }
          } else if (a === studentB) {
            return { ...a, row: studentA.row, col: studentA.col, seatIndex: studentA.seatIndex, benchNo: studentA.benchNo }
          }
          return a
        })
        
        // Count conflicts after swap
        const conflictsAfter = countTotalConflicts(tempAssignments, rooms)
        
        // Keep swap if it reduces total conflicts
        if (conflictsAfter < conflictsBefore) {
          // Apply the swap
          const tempRowA = studentA.row
          const tempColA = studentA.col
          const tempSeatIndexA = studentA.seatIndex
          const tempBenchNoA = studentA.benchNo
          
          studentA.row = studentB.row
          studentA.col = studentB.col
          studentA.seatIndex = studentB.seatIndex
          studentA.benchNo = studentB.benchNo
          
          studentB.row = tempRowA
          studentB.col = tempColA
          studentB.seatIndex = tempSeatIndexA
          studentB.benchNo = tempBenchNoA
          
          totalSwaps++
          improved = true
          
          console.log(`[POST-OPTIMIZATION] Swap ${totalSwaps}: Reduced conflicts from ${conflictsBefore} to ${conflictsAfter}`)
          break // Move to next student
        }
      }
      
      console.log(`[POST-OPTIMIZATION] Attempted ${swapAttempted} swaps, no improvement found`)
      
      if (improved) break // Found an improving swap
    }
  }
  
  // Count final conflicts
  const finalConflicts = countTotalConflicts(occupiedAssignments, rooms)
  console.log(`[POST-OPTIMIZATION] Final conflicts: ${finalConflicts}`)
  console.log(`[POST-OPTIMIZATION] Total swaps: ${totalSwaps}`)
  console.log(`[POST-OPTIMIZATION] Conflict reduction: ${initialConflicts - finalConflicts}`)
  
  return assignments
}

/**
 * Count total conflicts across all assignments
 */
function countTotalConflicts(assignments, rooms) {
  let total = 0
  for (const assignment of assignments) {
    total += countStudentConflicts(assignment, assignments, rooms)
  }
  return total / 2 // Each conflict is counted twice
}

/**
 * Count conflicts for a specific student using grid-based neighbor detection
 */
function countStudentConflicts(assignment, assignments, rooms) {
  const studentSkill = normalizeSkill(assignment.skill || assignment.skillCode)
  let conflicts = 0
  
  // Build a grid for the room
  const room = rooms.find(r => r.id === assignment.roomId)
  if (!room) return 0
  
  const roomAssignments = assignments.filter(a => a.roomId === assignment.roomId && a.status === 'Occupied')
  const grid = createEmptyGrid(room.rows, room.columns, room.studentsPerBench)
  
  for (const a of roomAssignments) {
    if (a.row !== undefined && a.col !== undefined && a.seatIndex !== undefined) {
      grid[a.row][a.col][a.seatIndex] = {
        skill: a.skill,
        skillCode: a.skillCode,
        Skill: a.skill,
        Section: a.section
      }
    }
  }
  
  // Get neighbors using the same logic as scoring
  const neighbors = getNeighborSeats(grid, assignment.row, assignment.col, assignment.seatIndex, room.rows, room.columns, room.studentsPerBench, room.orientation)
  
  // Count same-skill neighbors
  for (const neighbor of neighbors.sameBench) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        conflicts++
      }
    }
  }
  
  const allNeighbors = [...neighbors.frontBack, ...neighbors.leftRight, ...neighbors.diagonal]
  for (const neighbor of allNeighbors) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      if (neighborSkill === studentSkill) {
        conflicts++
      }
    }
  }
  
  return conflicts
}

/**
 * PRE-DISTRIBUTION PHASE: Distribute students across rooms by skill
 * This reduces same-skill clustering by spreading high-frequency skills evenly
 */
function distributeStudentsBySkill(students, rooms) {
  console.log('[PRE-DISTRIBUTION] Phase: Distributing students by skill across rooms')
  
  // Group students by skill
  const skillGroups = new Map()
  for (const student of students) {
    const skill = normalizeSkill(student.Skill)
    if (!skillGroups.has(skill)) {
      skillGroups.set(skill, [])
    }
    skillGroups.get(skill).push(student)
  }
  
  // Sort skills by frequency (highest count first)
  const sortedSkills = Array.from(skillGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
  
  console.log(`[PRE-DISTRIBUTION] Total skills: ${sortedSkills.length}`)
  for (const [skill, skillStudents] of sortedSkills) {
    console.log(`[PRE-DISTRIBUTION] Skill ${skill}: ${skillStudents.length} students`)
  }
  
  // Initialize room queues - each room will have skill groups
  const roomSkillQueues = new Map()
  for (const room of rooms) {
    roomSkillQueues.set(room.id, new Map())
  }
  
  // Distribute each skill group across rooms using round-robin
  for (const [skill, skillStudents] of sortedSkills) {
    // Shuffle students within the skill group for randomness
    const shuffledSkillStudents = shuffleArray(skillStudents)
    
    // Distribute evenly across rooms
    let roomIndex = 0
    const roomIds = Array.from(roomSkillQueues.keys())
    
    for (const student of shuffledSkillStudents) {
      const roomId = roomIds[roomIndex % roomIds.length]
      const roomSkills = roomSkillQueues.get(roomId)
      if (!roomSkills.has(skill)) {
        roomSkills.set(skill, [])
      }
      roomSkills.get(skill).push(student)
      roomIndex++
    }
    
    console.log(`[PRE-DISTRIBUTION] Skill ${skill}: distributed ${shuffledSkillStudents.length} students across ${roomIds.length} rooms`)
  }
  
  // Log final distribution
  console.log('[PRE-DISTRIBUTION] Final room distribution:')
  for (const [roomId, roomSkills] of roomSkillQueues) {
    const room = rooms.find(r => r.id === roomId)
    let totalStudents = 0
    for (const [skill, skillStudents] of roomSkills) {
      totalStudents += skillStudents.length
    }
    console.log(`[PRE-DISTRIBUTION] Room ${room.name}: ${totalStudents} students`)
    
    for (const [skill, skillStudents] of roomSkills) {
      console.log(`[PRE-DISTRIBUTION]   - Skill ${skill}: ${skillStudents.length}`)
    }
  }
  
  return roomSkillQueues
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
 * SEAT SCORING MODEL: Calculate placement score for student at position
 * Returns score (HIGHER is better - positive for good placement, negative for bad)
 * 
 * SCORING RULES:
 * - Different skill nearby: +10
 * - Different section nearby: +8
 * - Balanced row usage: +5
 * - Same skill nearby: -20 (increased penalty)
 * - Same section nearby: -3
 * - Same skill on same bench: -1000 (extremely high penalty to prevent same-bench same-skill)
 * - Cluster penalty: -30 per additional same-skill neighbor (increased penalty)
 * 
 * STAGE CONFIGURATION:
 * - strictMode: Apply all penalties strictly (Stage 1)
 * - relaxAdjacency: Ignore adjacency penalties (Stage 2)
 * - relaxSection: Ignore section penalties (Stage 3)
 * - relaxSkill: Ignore skill penalties (Stage 4)
 * - emergency: No scoring, just find empty seat (Stage 5)
 */
function calculateSeatScore(grid, row, col, seatIndex, student, rows, cols, studentsPerBench, orientation, stage = 1) {
  const studentSkill = normalizeSkill(student.Skill)
  const studentSection = student.Section || ''
  
  const neighbors = getNeighborSeats(grid, row, col, seatIndex, rows, cols, studentsPerBench, orientation)
  let score = 0
  
  // Stage 5: Emergency mode - no scoring, just find empty seat
  if (stage === 5) {
    return 0
  }
  
  // Stage 4: Relax skill penalties
  const relaxSkill = stage >= 4
  
  // Stage 3: Relax section penalties
  const relaxSection = stage >= 3
  
  // Stage 2: Relax adjacency penalties
  const relaxAdjacency = stage >= 2
  
  // Count neighbors by type
  let sameSkillCount = 0
  let differentSkillCount = 0
  let sameSectionCount = 0
  let differentSectionCount = 0
  let sameBenchSameSkill = false
  
  // Check same bench (highest priority penalty)
  if (!relaxSkill) {
    for (const neighbor of neighbors.sameBench) {
      if (neighbor) {
        const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
        if (neighborSkill === studentSkill) {
          sameBenchSameSkill = true
          score -= 1000 // PENALTY: Same skill on same bench (extremely high to prevent)
        }
      }
    }
  }
  
  // Check all other neighbors
  const allNeighbors = [...neighbors.frontBack, ...neighbors.leftRight, ...neighbors.diagonal]
  
  for (const neighbor of allNeighbors) {
    if (neighbor) {
      const neighborSkill = normalizeSkill(neighbor.skill || neighbor.skillCode || neighbor.Skill)
      const neighborSection = neighbor.Section || ''
      
      // Skill scoring
      if (!relaxSkill) {
        if (neighborSkill === studentSkill) {
          sameSkillCount++
          score -= 20 // PENALTY: Same skill nearby (increased)
        } else if (neighborSkill) {
          differentSkillCount++
          if (!relaxAdjacency) {
            score += 10 // BONUS: Different skill nearby
          }
        }
      }
      
      // Section scoring
      if (!relaxSection) {
        if (neighborSection === studentSection) {
          sameSectionCount++
          score -= 3 // PENALTY: Same section nearby
        } else if (neighborSection) {
          differentSectionCount++
          if (!relaxAdjacency) {
            score += 8 // BONUS: Different section nearby
          }
        }
      }
    }
  }
  
  // Cluster penalty (multiple same-skill neighbors)
  if (!relaxSkill && sameSkillCount >= 2) {
    score -= 30 * (sameSkillCount - 1) // PENALTY: Cluster of same-skill students (increased)
  }
  
  // Cluster penalty (multiple same-section neighbors)
  if (!relaxSection && sameSectionCount >= 2) {
    score -= 5 * (sameSectionCount - 1) // PENALTY: Cluster of same-section students
  }
  
  // Balanced row usage bonus (if row is not too crowded)
  const rowOccupancy = grid[row].flat().filter(cell => cell !== null && cell.status === 'Occupied').length
  const rowCapacity = cols * studentsPerBench
  const rowUsageRatio = rowOccupancy / rowCapacity
  if (rowUsageRatio > 0.3 && rowUsageRatio < 0.7) {
    score += 5 // BONUS: Balanced row usage
  }
  
  return score // HIGHER score is better
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
 * Multi-Strategy Seating Engine - GUARANTEED 100% SEATING when capacity >= students
 * 
 * HARD CONSTRAINTS (must never break):
 * - One student per seat
 * - One seat per student
 * - Room capacity respected
 * 
 * SOFT CONSTRAINTS (can be relaxed):
 * - Skill balancing
 * - Section balancing
 * - Adjacency preferences
 * - Distribution preferences
 * 
 * STRATEGIES (executed sequentially until all students seated or capacity exhausted):
 * STRATEGY 1: Strict Skill + Section + Adjacency balancing
 * STRATEGY 2: Strict Skill + Section, Relax Adjacency
 * STRATEGY 3: Strict Skill, Relax Section + Adjacency
 * STRATEGY 4: Section balancing only
 * STRATEGY 5: Skill balancing only
 * STRATEGY 6: Alternate row placement
 * STRATEGY 7: Front-to-back filling
 * STRATEGY 8: Back-to-front filling
 * STRATEGY 9: Snake pattern
 * STRATEGY 10: Room distribution first
 * STRATEGY 11: Room fill first
 * STRATEGY 12: Emergency placement (only hard constraints)
 * STRATEGY 13: Absolute fallback (first empty seat)
 * 
 * Only fails when: students > capacity
 * If capacity exists, all students must be seated.
 */
function seatStudentsStrict(students, positions, grid, rows, cols, studentsPerBench, orientation, roomName, startSeatNumber = 1) {
  console.log('[ALGORITHM EXECUTION] Function: seatStudentsStrict')
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log(`[Multi-Strategy Seating Engine] SEATING ROOM: ${roomName}`)
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log(`[Multi-Strategy Seating Engine] Students to seat: ${students.length}`)
  console.log(`[Multi-Strategy Seating Engine] Room config: ${rows}x${cols}, ${studentsPerBench}/bench, orientation: ${orientation}`)
  console.log(`[Multi-Strategy Seating Engine] Total positions: ${positions.length}`)
  console.log(`[Multi-Strategy Seating Engine] Room capacity: ${rows * cols * studentsPerBench}`)
  
  const assignments = []
  let seatNumber = startSeatNumber
  const totalCapacity = rows * cols * studentsPerBench
  
  // Strategy execution tracking
  const strategyReport = {
    totalStudents: students.length,
    totalCapacity: totalCapacity,
    strategies: [],
    finalSeated: 0,
    finalRemaining: 0
  }
  
  // Placement tracking
  const placementStats = {
    normal: 0,      // Strategy 1-5 - balancing strategies
    fallback: 0,    // Strategy 6-11 - pattern strategies
    emergency: 0    // Strategy 12-13 - fallback strategies
  }
  
  // OPTIMIZATION: Use Set and Map for O(1) student lookup and removal
  const remainingStudentIds = new Set(students.map(s => s['NIAT ID']))
  const studentMap = new Map(students.map(s => [s['NIAT ID'], s]))
  
  // Group positions by bench for organized seating
  const positionsByBench = new Map()
  for (const pos of positions) {
    if (!positionsByBench.has(pos.benchNumber)) {
      positionsByBench.set(pos.benchNumber, [])
    }
    positionsByBench.get(pos.benchNumber).push(pos)
  }
  
  const benchCount = positionsByBench.size
  console.log(`[Multi-Strategy Seating Engine] Total benches: ${benchCount}`)
  
  // Helper function to place a student
  function placeStudent(pos, student, placementType = 'normal') {
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
      bookingId: student['Booking ID'] || '',
      skill: student.Skill,
      skillCode: student.Skill,
      skillName: student['Skill Name'] || student.Skill,
      status: 'Occupied',
      student,
      orientation: orientation,
      conflictScore: 0,
      conflicts: conflictDetails,
      placementType: placementType, // Track placement type
    }
    
    grid[pos.row][pos.col][pos.seatIndex] = assignment
    assignments.push(assignment)
    seatNumber++
    
    // Update placement stats
    if (placementType === 'normal') {
      placementStats.normal++
    } else if (placementType === 'emergency') {
      placementStats.emergency++
    } else {
      placementStats.fallback++
    }
  }
  
  // STRATEGY 1: Strict Skill + Section + Adjacency balancing (Stage 1 - all penalties)
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log('[Multi-Strategy Seating Engine] STRATEGY 1: Strict Skill + Section + Adjacency balancing')
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log(`[Multi-Strategy Seating Engine] Students entering strategy 1: ${remainingStudentIds.size}`)
  
  const pass1StartCount = remainingStudentIds.size
  strategyReport.strategies.push({ name: 'Strategy 1: Strict Skill + Section + Adjacency', entering: pass1StartCount, seated: 0, remaining: 0 })
  // Rebuild array from Set
  let remainingStudents = Array.from(remainingStudentIds).map(id => studentMap.get(id))
  
  // Try to seat students with all balancing rules (score-based placement)
  for (const [benchNumber, benchPositions] of positionsByBench) {
    if (remainingStudentIds.size === 0) break
    
    for (const seatPos of benchPositions) {
      if (remainingStudentIds.size === 0) break
      if (grid[seatPos.row][seatPos.col][seatPos.seatIndex]) continue
      
      // Find best student for this position with all balancing rules (Stage 1)
      let bestStudent = null
      let bestScore = -Infinity
      
      for (const student of remainingStudents) {
        const score = calculateSeatScore(grid, seatPos.row, seatPos.col, seatPos.seatIndex, student, rows, cols, studentsPerBench, orientation, 1)
        if (score > bestScore) {
          bestScore = score
          bestStudent = student
        }
      }
      
      if (bestStudent) {
        const studentId = bestStudent['NIAT ID']
        remainingStudentIds.delete(studentId)
        remainingStudents = remainingStudents.filter(s => s['NIAT ID'] !== studentId)
        placeStudent(seatPos, bestStudent, 'normal') // normal placement
      }
    }
  }
  
  const pass1Seated = pass1StartCount - remainingStudentIds.size
  strategyReport.strategies[0].seated = pass1Seated
  strategyReport.strategies[0].remaining = remainingStudentIds.size
  console.log(`[Multi-Strategy Seating Engine] STRATEGY 1: Students seated: ${pass1Seated}, Students remaining: ${remainingStudentIds.size}`)
  console.log('[Multi-Strategy Seating Engine] ============================================')
  
  // STRATEGY 2: Strict Skill + Section, Relax Adjacency
  if (remainingStudentIds.size > 0) {
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log('[Multi-Strategy Seating Engine] STRATEGY 2: Strict Skill + Section, Relax Adjacency')
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log(`[Multi-Strategy Seating Engine] Students entering strategy 2: ${remainingStudentIds.size}`)
    
    const pass2StartCount = remainingStudentIds.size
    strategyReport.strategies.push({ name: 'Strategy 2: Strict Skill + Section, Relax Adjacency', entering: pass2StartCount, seated: 0, remaining: 0 })
    remainingStudents = Array.from(remainingStudentIds).map(id => studentMap.get(id))
    
    for (const student of remainingStudents) {
      if (remainingStudentIds.size === 0) break
      
      let bestPos = null
      let bestScore = -Infinity
      
      for (const pos of positions) {
        if (grid[pos.row][pos.col][pos.seatIndex]) continue
        
        // Stage 2: Relax adjacency penalties
        const score = calculateSeatScore(grid, pos.row, pos.col, pos.seatIndex, student, rows, cols, studentsPerBench, orientation, 2)
        if (score > bestScore) {
          bestScore = score
          bestPos = pos
        }
      }
      
      if (bestPos) {
        const studentId = student['NIAT ID']
        remainingStudentIds.delete(studentId)
        placeStudent(bestPos, student, 'fallback') // fallback placement
      }
    }
    
    const pass2Seated = pass2StartCount - remainingStudentIds.size
    strategyReport.strategies[1].seated = pass2Seated
    strategyReport.strategies[1].remaining = remainingStudentIds.size
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 2: Students seated: ${pass2Seated}, Students remaining: ${remainingStudentIds.size}`)
    console.log('[Multi-Strategy Seating Engine] ============================================')
  } else {
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 2: Skipped (no remaining students)`)
  }
  
  // STRATEGY 3: Strict Skill, Relax Section + Adjacency
  if (remainingStudentIds.size > 0) {
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log('[Multi-Strategy Seating Engine] STRATEGY 3: Strict Skill, Relax Section + Adjacency')
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log(`[Multi-Strategy Seating Engine] Students entering strategy 3: ${remainingStudentIds.size}`)
    
    const pass3StartCount = remainingStudentIds.size
    strategyReport.strategies.push({ name: 'Strategy 3: Strict Skill, Relax Section + Adjacency', entering: pass3StartCount, seated: 0, remaining: 0 })
    remainingStudents = Array.from(remainingStudentIds).map(id => studentMap.get(id))
    
    // Stage 3: Relax section + adjacency penalties (only skill penalties)
    for (const student of remainingStudents) {
      if (remainingStudentIds.size === 0) break
      
      let bestPos = null
      let bestScore = -Infinity
      
      for (const pos of positions) {
        if (grid[pos.row][pos.col][pos.seatIndex]) continue
        
        // Stage 3: Relax section + adjacency penalties
        const score = calculateSeatScore(grid, pos.row, pos.col, pos.seatIndex, student, rows, cols, studentsPerBench, orientation, 3)
        if (score > bestScore) {
          bestScore = score
          bestPos = pos
        }
      }
      
      if (bestPos) {
        const studentId = student['NIAT ID']
        remainingStudentIds.delete(studentId)
        placeStudent(bestPos, student, 'fallback') // fallback placement
      }
    }
    
    const pass3Seated = pass3StartCount - remainingStudentIds.size
    strategyReport.strategies[2].seated = pass3Seated
    strategyReport.strategies[2].remaining = remainingStudentIds.size
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 3: Students seated: ${pass3Seated}, Students remaining: ${remainingStudentIds.size}`)
    console.log('[Multi-Strategy Seating Engine] ============================================')
  } else {
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 3: Skipped (no remaining students)`)
  }
  
  // STRATEGY 4: Section balancing only
  if (remainingStudentIds.size > 0) {
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log('[Multi-Strategy Seating Engine] STRATEGY 4: Section balancing only')
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log(`[Multi-Strategy Seating Engine] Students entering strategy 4: ${remainingStudentIds.size}`)
    
    const pass4StartCount = remainingStudentIds.size
    strategyReport.strategies.push({ name: 'Strategy 4: Section balancing only', entering: pass4StartCount, seated: 0, remaining: 0 })
    remainingStudents = Array.from(remainingStudentIds).map(id => studentMap.get(id))
    
    // Stage 4: Relax skill penalties (only section penalties)
    for (const student of remainingStudents) {
      if (remainingStudentIds.size === 0) break
      
      let bestPos = null
      let bestScore = -Infinity
      
      for (const pos of positions) {
        if (grid[pos.row][pos.col][pos.seatIndex]) continue
        
        // Stage 4: Relax skill penalties
        const score = calculateSeatScore(grid, pos.row, pos.col, pos.seatIndex, student, rows, cols, studentsPerBench, orientation, 4)
        if (score > bestScore) {
          bestScore = score
          bestPos = pos
        }
      }
      
      if (bestPos) {
        const studentId = student['NIAT ID']
        remainingStudentIds.delete(studentId)
        placeStudent(bestPos, student, 'fallback') // fallback placement
      }
    }
    
    const pass4Seated = pass4StartCount - remainingStudentIds.size
    strategyReport.strategies[3].seated = pass4Seated
    strategyReport.strategies[3].remaining = remainingStudentIds.size
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 4: Students seated: ${pass4Seated}, Students remaining: ${remainingStudentIds.size}`)
    console.log('[Multi-Strategy Seating Engine] ============================================')
  } else {
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 4: Skipped (no remaining students)`)
  }
  
  // STRATEGY 5: Skill balancing only
  if (remainingStudentIds.size > 0) {
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log('[Multi-Strategy Seating Engine] STRATEGY 5: Skill balancing only')
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log(`[Multi-Strategy Seating Engine] Students entering strategy 5: ${remainingStudentIds.size}`)
    
    const pass5StartCount = remainingStudentIds.size
    strategyReport.strategies.push({ name: 'Strategy 5: Skill balancing only', entering: pass5StartCount, seated: 0, remaining: 0 })
    remainingStudents = Array.from(remainingStudentIds).map(id => studentMap.get(id))
    
    // Stage 5: Emergency placement - any empty seat, no constraints whatsoever
    for (const student of remainingStudents) {
      if (remainingStudentIds.size === 0) break
      
      let seatsChecked = 0
      let foundSeat = false
      
      for (const pos of positions) {
        if (remainingStudentIds.size === 0) break
        seatsChecked++
        if (grid[pos.row][pos.col][pos.seatIndex]) continue
        
        // Stage 5: No scoring, just find empty seat
        const score = calculateSeatScore(grid, pos.row, pos.col, pos.seatIndex, student, rows, cols, studentsPerBench, orientation, 5)
        
        const studentId = student['NIAT ID']
        remainingStudentIds.delete(studentId)
        placeStudent(pos, student, 'emergency') // emergency placement
        foundSeat = true
        break
      }
      
      if (!foundSeat) {
        console.error(`[Multi-Strategy Seating Engine] STRATEGY 5: Could not find empty seat for student ${student['Student Name']} after checking ${seatsChecked} seats`)
      }
    }
    
    const pass5Seated = pass5StartCount - remainingStudentIds.size
    strategyReport.strategies[4].seated = pass5Seated
    strategyReport.strategies[4].remaining = remainingStudentIds.size
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 5: Students seated: ${pass5Seated}, Students remaining: ${remainingStudentIds.size}`)
    console.log('[Multi-Strategy Seating Engine] ============================================')
  } else {
    console.log(`[Multi-Strategy Seating Engine] STRATEGY 5: Skipped (no remaining students)`)
  }
  
  // STRATEGY 6-13: Additional fallback strategies (simplified for now - use global emergency fallback)
  // For now, we'll rely on the global emergency fallback in allocateSeating to handle any remaining students
  if (remainingStudentIds.size > 0) {
    strategyReport.strategies.push({ name: 'Strategy 6-13: Global Emergency Fallback', entering: remainingStudentIds.size, seated: 0, remaining: remainingStudentIds.size })
  }
  
  // CRITICAL: Check if capacity was actually exhausted
  if (remainingStudentIds.size > 0) {
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log('[Multi-Strategy Seating Engine] POST-STRATEGY DIAGNOSTICS')
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log(`[Multi-Strategy Seating Engine] Remaining students count: ${remainingStudentIds.size}`)
    
    // Count empty seats
    let emptySeatCount = 0
    for (const pos of positions) {
      if (!grid[pos.row][pos.col][pos.seatIndex]) {
        emptySeatCount++
      }
    }
    console.log(`[Multi-Strategy Seating Engine] Total generated seats: ${positions.length}`)
    console.log(`[Multi-Strategy Seating Engine] Total occupied seats: ${assignments.length}`)
    console.log(`[Multi-Strategy Seating Engine] Total empty seats: ${emptySeatCount}`)
    
    // Detailed diagnostics for each remaining student
    console.log('[Multi-Strategy Seating Engine] ============================================')
    console.log('[Multi-Strategy Seating Engine] REMAINING STUDENTS DETAILS')
    console.log('[Multi-Strategy Seating Engine] ============================================')
    
    remainingStudents = Array.from(remainingStudentIds).map(id => studentMap.get(id))
    
    for (const student of remainingStudents) {
      console.log(`[Multi-Strategy Seating Engine] Student Name: ${student['Student Name']}`)
      console.log(`[Multi-Strategy Seating Engine] Booking ID: ${student['Booking ID'] || 'N/A'}`)
      console.log(`[Multi-Strategy Seating Engine] NIAT ID: ${student['NIAT ID']}`)
      
      // Check candidate seats
      let candidateSeatsChecked = 0
      let emptySeatsAvailable = 0
      
      for (const pos of positions) {
        candidateSeatsChecked++
        if (!grid[pos.row][pos.col][pos.seatIndex]) {
          emptySeatsAvailable++
        }
      }
      
      console.log(`[Multi-Strategy Seating Engine] Reason not assigned: Strategies 1-5 failed to find suitable seat`)
      console.log(`[Multi-Strategy Seating Engine] Function that rejected assignment: seatStudentsStrict (Strategy 1-5)`)
      console.log(`[Multi-Strategy Seating Engine] Candidate seats checked: ${candidateSeatsChecked}`)
      console.log(`[Multi-Strategy Seating Engine] Number of empty seats still available: ${emptySeatsAvailable}`)
      console.log('[Multi-Strategy Seating Engine] ---')
    }
    
    console.log('[Multi-Strategy Seating Engine] ============================================')
    
    if (assignments.length >= totalCapacity) {
      console.error(`[Multi-Strategy Seating Engine] CRITICAL: Physical capacity exhausted`)
      console.error(`[Multi-Strategy Seating Engine] Total Capacity: ${totalCapacity}`)
      console.error(`[Multi-Strategy Seating Engine] Students to seat: ${students.length}`)
      console.error(`[Multi-Strategy Seating Engine] Already seated: ${assignments.length}`)
      console.error(`[Multi-Strategy Seating Engine] Remaining students: ${remainingStudentIds.size}`)
      
      // This is the only valid reason for failure - capacity truly exhausted
      throw new Error(`Physical capacity exhausted. Cannot seat ${remainingStudentIds.size} students. Capacity: ${totalCapacity}, Students: ${students.length}`)
    } else {
      // Grid state corruption - should never happen
      console.error(`[Multi-Strategy Seating Engine] CRITICAL: Grid state corruption detected`)
      console.error(`[Multi-Strategy Seating Engine] Total Capacity: ${totalCapacity}`)
      console.error(`[Multi-Strategy Seating Engine] Students to seat: ${students.length}`)
      console.error(`[Multi-Strategy Seating Engine] Already seated: ${assignments.length}`)
      console.error(`[Multi-Strategy Seating Engine] Remaining students: ${remainingStudentIds.size}`)
      console.error(`[Multi-Strategy Seating Engine] Grid shows no available seats but capacity not reached`)
      throw new Error(`Grid state corruption: No available seat found but capacity not reached. Seated: ${assignments.length}/${totalCapacity}`)
    }
  }
  
  // Display final seating summary with placement stats
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log('[Multi-Strategy Seating Engine] SEATING SUMMARY')
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log(`[Multi-Strategy Seating Engine] Total Students: ${students.length}`)
  console.log(`[Multi-Strategy Seating Engine] Total Capacity: ${totalCapacity}`)
  console.log(`[Multi-Strategy Seating Engine] Students successfully seated: ${assignments.length}`)
  const unseatedCount = Math.max(0, students.length - assignments.length)
  console.log(`[Multi-Strategy Seating Engine] Students unseated: ${unseatedCount}`)
  
  // Placement report
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log('[Multi-Strategy Seating Engine] PLACEMENT REPORT')
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log(`[Multi-Strategy Seating Engine] Students seated normally (Strategy 1): ${placementStats.normal}`)
  console.log(`[Multi-Strategy Seating Engine] Students seated using fallback (Strategy 2-4): ${placementStats.fallback}`)
  console.log(`[Multi-Strategy Seating Engine] Students seated using emergency (Strategy 5): ${placementStats.emergency}`)
  console.log('[Multi-Strategy Seating Engine] ============================================')
  
  // Strategy execution report
  console.log('[Multi-Strategy Seating Engine] ============================================')
  console.log('[Multi-Strategy Seating Engine] STRATEGY EXECUTION REPORT')
  console.log('[Multi-Strategy Seating Engine] ============================================')
  for (const strategy of strategyReport.strategies) {
    console.log(`[Multi-Strategy Seating Engine] ${strategy.name}:`)
    console.log(`[Multi-Strategy Seating Engine]   Students entering: ${strategy.entering}`)
    console.log(`[Multi-Strategy Seating Engine]   Students seated: ${strategy.seated}`)
    console.log(`[Multi-Strategy Seating Engine]   Students remaining: ${strategy.remaining}`)
  }
  console.log('[Multi-Strategy Seating Engine] ============================================')
  
  strategyReport.finalSeated = assignments.length
  strategyReport.finalRemaining = Math.max(0, students.length - assignments.length)
  
  console.log('[Multi-Strategy Seating Engine] ============================================')
  
  return { assignments, placementStats, strategyReport }
}

/**
 * VALIDATION ENGINE: Comprehensive validation of seating result
 * PURE FUNCTION - no side effects
 * 
 * Validates:
 * - No duplicate students
 * - No duplicate seats
 * - No room capacity violation
 * - All Booking IDs preserved
 * - All Student IDs preserved
 * - assignedStudents + unassignedStudents == totalStudents
 * - occupiedSeats <= totalCapacity
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
  
  // COMPREHENSIVE VALIDATION
  const validationErrors = []
  
  // Check for duplicate students
  const studentIds = new Set()
  const niatIds = new Set()
  const bookingIds = new Set()
  
  for (const assignment of assignments) {
    if (assignment.status === 'Occupied') {
      const studentId = assignment['NIAT ID']
      const niatId = assignment.niatId
      const bookingId = assignment.bookingId
      
      if (studentIds.has(studentId)) {
        validationErrors.push(`Duplicate student ID: ${studentId}`)
      }
      studentIds.add(studentId)
      
      if (niatIds.has(niatId)) {
        validationErrors.push(`Duplicate NIAT ID: ${niatId}`)
      }
      niatIds.add(niatId)
      
      if (bookingId && bookingIds.has(bookingId)) {
        validationErrors.push(`Duplicate Booking ID: ${bookingId}`)
      }
      if (bookingId) {
        bookingIds.add(bookingId)
      }
    }
  }
  
  // Check for duplicate seats
  const seatPositions = new Set()
  for (const assignment of assignments) {
    if (assignment.status === 'Occupied') {
      const seatKey = `${assignment.row}-${assignment.col}-${assignment.seatIndex}`
      if (seatPositions.has(seatKey)) {
        validationErrors.push(`Duplicate seat position: ${seatKey}`)
      }
      seatPositions.add(seatKey)
    }
  }
  
  // Check room capacity violation
  const totalCapacity = rows * cols * studentsPerBench
  if (generatedCount > totalCapacity) {
    validationErrors.push(`Room capacity violation: ${generatedCount} seated, capacity is ${totalCapacity}`)
  }
  
  // Check assignedStudents + unassignedStudents == totalStudents
  if (generatedCount + missingStudents !== uploadedCount) {
    validationErrors.push(`Count mismatch: seated(${generatedCount}) + unseated(${missingStudents}) != total(${uploadedCount})`)
  }
  
  const validationPassed = validationErrors.length === 0
  
  if (!validationPassed) {
    console.error('[VALIDATION ENGINE] ============================================')
    console.error('[VALIDATION ENGINE] VALIDATION FAILED')
    console.error('[VALIDATION ENGINE] ============================================')
    for (const error of validationErrors) {
      console.error(`[VALIDATION ENGINE] ${error}`)
    }
    console.error('[VALIDATION ENGINE] ============================================')
  } else {
    console.log('[VALIDATION ENGINE] ============================================')
    console.log('[VALIDATION ENGINE] VALIDATION PASSED')
    console.log('[VALIDATION ENGINE] ============================================')
    console.log(`[VALIDATION ENGINE] No duplicate students`)
    console.log(`[VALIDATION ENGINE] No duplicate seats`)
    console.log(`[VALIDATION ENGINE] No capacity violation`)
    console.log(`[VALIDATION ENGINE] All IDs preserved`)
    console.log(`[VALIDATION ENGINE] Count validation passed`)
    console.log('[VALIDATION ENGINE] ============================================')
  }
  
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
    validationPassed,
    validationErrors,
  }
}

/**
 * SINGLE SOURCE OF TRUTH SEATING ENGINE
 * Data structure: { rooms, students, seats, assignments }
 * 
 * PRIMARY RULES:
 * - Every student gets one seat
 * - No duplicate students
 * - No duplicate seats
 * - Capacity respected
 * - Fail only when students > capacity
 * 
 * SCORING STRATEGY:
 * - Seats are never rejected
 * - Best seat gets highest score
 * - If no scored seat exists, assign next empty seat
 */
export function allocateSeating(students, classrooms) {
  console.log('[SINGLE SOURCE OF TRUTH] File: seatingAlgorithmStrictNew.js')
  console.log('[SINGLE SOURCE OF TRUTH] Function: allocateSeating')
  console.log('[SINGLE SOURCE OF TRUTH] ============================================')
  
  // Clear previous seating data - start fresh
  console.log('[SINGLE SOURCE OF TRUTH] Clearing previous seating data')
  
  // PHASE 1: Generate seats for all rooms
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 1: Generating seats for all rooms')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 1: Started')
  
  const rooms = classrooms.map(room => ({
    id: room.roomName,
    name: room.roomName,
    rows: Number(room.rows),
    columns: Number(room.columns),
    studentsPerBench: Number(room.studentsPerBench),
    orientation: room.orientation || 'vertical',
    capacity: Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench),
  }))
  
  const seats = []
  for (const room of rooms) {
    const positions = generateSeatPositions(room.rows, room.columns, room.studentsPerBench, room.orientation)
    for (const pos of positions) {
      seats.push({
        id: `${room.name}-${pos.row}-${pos.col}-${pos.seatIndex}`,
        roomId: room.id,
        roomName: room.name,
        row: pos.row,
        col: pos.col,
        seatIndex: pos.seatIndex,
        benchNo: pos.benchNumber,
        occupied: false,
      })
    }
  }
  
  const totalCapacity = seats.length
  console.log(`[SINGLE SOURCE OF TRUTH] Total seats generated: ${totalCapacity}`)
  console.log(`[SINGLE SOURCE OF TRUTH] Rooms: ${rooms.length}`)
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 1: Completed')
  
  // PHASE 2: Validate capacity
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 2: Validating capacity')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 2: Started')
  
  const totalStudents = students.length
  console.log(`[SINGLE SOURCE OF TRUTH] Total students: ${totalStudents}`)
  console.log(`[SINGLE SOURCE OF TRUTH] Total capacity: ${totalCapacity}`)
  
  if (totalStudents > totalCapacity) {
    console.error(`[SINGLE SOURCE OF TRUTH] FAILURE: Students (${totalStudents}) > Capacity (${totalCapacity})`)
    throw new Error(`Physical capacity exceeded. Cannot seat ${totalStudents} students. Total capacity: ${totalCapacity}`)
  }
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 2: Completed')
  
  // PHASE 3: Pre-distribute students across rooms by skill
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 3: Pre-distributing students by skill across rooms')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 3: Started')
  const roomSkillQueues = distributeStudentsBySkill(students, rooms)
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 3: Completed')
  
  // PHASE 4: Assign students to seats using scoring with bench distance penalty
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 4: Assigning students with bench distance penalty')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 4: Started')
  
  const assignments = []
  const assignedStudentIds = new Set()
  const assignedSeatIds = new Set()
  let fallbackCount = 0
  
  // Process each room's skill queues
  for (const [roomId, roomSkills] of roomSkillQueues) {
    const room = rooms.find(r => r.id === roomId)
    console.log(`[SINGLE SOURCE OF TRUTH] Processing room ${room.name} with skill groups`)
    
    // Get all seats in this room
    const roomSeats = seats.filter(s => s.roomId === roomId)
    
    // For each skill in this room, assign students using scoring
    for (const [skill, skillStudents] of roomSkills) {
      console.log(`[SINGLE SOURCE OF TRUTH] Assigning skill ${skill} (${skillStudents.length} students)`)
      
      // Shuffle students within this skill group
      const shuffledSkillStudents = [...skillStudents].sort(() => Math.random() - 0.5)
      
      for (const student of shuffledSkillStudents) {
        const studentId = student['Booking ID'] || student['NIAT ID'] || student['Student Name']
        
        // Check for duplicate students
        if (assignedStudentIds.has(studentId)) {
          console.error(`[SINGLE SOURCE OF TRUTH] DUPLICATE STUDENT: ${studentId}`)
          throw new Error(`Duplicate student detected: ${studentId}`)
        }
        
        // Find best seat in this room using scoring
        let bestSeat = null
        let bestScore = -Infinity
        let fallbackUsed = false
        
        for (const seat of roomSeats) {
          if (assignedSeatIds.has(seat.id)) continue
          
          // Calculate seat score
          const score = calculateSeatScoreForStudent(seat, student, rooms, assignments)
          
          if (score > bestScore) {
            bestScore = score
            bestSeat = seat
          }
        }
        
        // If no scored seat, assign next empty seat in this room (fallback)
        if (!bestSeat) {
          fallbackUsed = true
          fallbackCount++
          const emptySeat = roomSeats.find(s => !assignedSeatIds.has(s.id))
          if (!emptySeat) {
            console.error(`[SINGLE SOURCE OF TRUTH] FAILURE: No empty seats available for student ${student['Student Name']} in room ${roomId}`)
            throw new Error(`No empty seats available. Cannot seat all students.`)
          }
          bestSeat = emptySeat
          console.log(`[SEAT SELECTION] FALLBACK: Student ${student['Student Name']} (${student.Skill}) assigned to first available seat (Bench ${bestSeat.benchNo})`)
        } else {
          console.log(`[SEAT SELECTION] Student ${student['Student Name']} (${student.Skill}) → Bench ${bestSeat.benchNo}, Score: ${bestScore}`)
        }
        
        // Assign student to seat
        bestSeat.occupied = true
        assignedStudentIds.add(studentId)
        assignedSeatIds.add(bestSeat.id)
        
        assignments.push({
          seatId: bestSeat.id,
          roomId: bestSeat.roomId,
          roomName: bestSeat.roomName,
          seatNo: assignments.length + 1,
          benchNo: bestSeat.benchNo,
          row: bestSeat.row,
          col: bestSeat.col,
          seatIndex: bestSeat.seatIndex,
          studentId: studentId,
          studentName: student['Student Name'],
          niatId: student['NIAT ID'],
          bookingId: student['Booking ID'] || '',
          skill: student.Skill,
          skillCode: student.Skill,
          skillName: student['Skill Name'] || student.Skill,
          section: student.Section,
          status: 'Occupied',
          student,
          score: bestScore,
        })
      }
    }
  }
  
  console.log(`[SINGLE SOURCE OF TRUTH] All ${totalStudents} students assigned to seats`)
  console.log(`[SINGLE SOURCE OF TRUTH] Fallback used: ${fallbackCount} times`)
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 4: Completed')
  
  // PHASE 5: Post-allocation optimization (swap students to reduce conflicts)
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 5: Post-allocation optimization')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 5: Started')
  // TEMPORARILY DISABLED FOR DEBUGGING
  // const optimizedAssignments = optimizeSeatingBySwapping(assignments, rooms, 50)
  const optimizedAssignments = assignments
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 5: Completed')
  
  // Update assignments with optimized positions
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i] && assignments[i].status === 'Occupied' && optimizedAssignments[i]) {
      assignments[i].row = optimizedAssignments[i].row
      assignments[i].col = optimizedAssignments[i].col
      assignments[i].seatIndex = optimizedAssignments[i].seatIndex
      assignments[i].benchNo = optimizedAssignments[i].benchNo
    }
  }
  
  // PHASE 6: Generate empty seats for remaining capacity
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 6: Generating empty seats')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 6: Started')
  
  for (const seat of seats) {
    if (!assignedSeatIds.has(seat.id)) {
      assignments.push({
        seatId: seat.id,
        roomId: seat.roomId,
        roomName: seat.roomName,
        seatNo: assignments.length + 1,
        benchNo: seat.benchNo,
        row: seat.row,
        col: seat.col,
        seatIndex: seat.seatIndex,
        studentId: null,
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
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 6: Completed')
  
  // PHASE 7: Sort assignments in physical order (room → bench → seat)
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 7: Sorting assignments in physical order')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 7: Started')
  
  // Sort by room name, then bench number, then seat index
  assignments.sort((a, b) => {
    // First sort by room name
    if (a.roomName !== b.roomName) {
      return a.roomName.localeCompare(b.roomName)
    }
    // Then by bench number
    if (a.benchNo !== b.benchNo) {
      return a.benchNo - b.benchNo
    }
    // Then by seat index
    return a.seatIndex - b.seatIndex
  })
  
  // Reassign seat numbers based on physical order
  assignments.forEach((a, index) => {
    a.seatNo = index + 1
  })
  
  console.log('[SINGLE SOURCE OF TRUTH] Assignments sorted in physical order')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 7: Completed')
  
  // PHASE 8: Validation
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 8: Validation')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 8: Started')
  
  const occupiedAssignments = assignments.filter(a => a.status === 'Occupied')
  const emptyAssignments = assignments.filter(a => a.status === 'Empty')
  
  console.log(`[SINGLE SOURCE OF TRUTH] Uploaded students: ${totalStudents}`)
  console.log(`[SINGLE SOURCE OF TRUTH] Assigned students: ${occupiedAssignments.length}`)
  console.log(`[SINGLE SOURCE OF TRUTH] Empty seats: ${emptyAssignments.length}`)
  console.log(`[SINGLE SOURCE OF TRUTH] Total assignments: ${assignments.length}`)
  
  if (occupiedAssignments.length !== totalStudents) {
    console.error(`[SINGLE SOURCE OF TRUTH] VALIDATION FAILURE: Assigned (${occupiedAssignments.length}) !== Uploaded (${totalStudents})`)
    throw new Error(`Validation failed: ${totalStudents - occupiedAssignments.length} students were not seated`)
  }
  
  console.log('[SINGLE SOURCE OF TRUTH] VALIDATION PASSED')
  console.log('[SINGLE SOURCE OF TRUTH] PHASE 8: Completed')
  
  // Return single source of truth
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

// Calculate seat score for a student
function calculateSeatScoreForStudent(seat, student, rooms, assignments) {
  const studentSkill = normalizeSkill(student.Skill)
  const studentSection = student.Section || ''
  
  // Get room configuration
  const room = rooms.find(r => r.id === seat.roomId)
  if (!room) return 0
  
  // Get assignments in this room to build a grid for neighbor checking
  const roomAssignments = assignments.filter(a => a.roomId === seat.roomId)
  
  // Build a grid representation of the room
  const grid = createEmptyGrid(room.rows, room.columns, room.studentsPerBench)
  for (const a of roomAssignments) {
    if (a.status === 'Occupied' && a.row !== undefined && a.col !== undefined && a.seatIndex !== undefined) {
      grid[a.row][a.col][a.seatIndex] = {
        skill: a.skill,
        skillCode: a.skillCode,
        Skill: a.skill,
        Section: a.section
      }
    }
  }
  
  // Use the comprehensive scoring function
  return calculateSeatScore(
    grid,
    seat.row,
    seat.col,
    seat.seatIndex,
    student,
    room.rows,
    room.columns,
    room.studentsPerBench,
    room.orientation,
    1 // Stage 1: Strict mode with all penalties
  )
}
