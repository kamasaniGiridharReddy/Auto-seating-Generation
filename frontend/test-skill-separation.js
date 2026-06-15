/**
 * TEST SAME-SKILL SEPARATION VIOLATIONS
 * Run with: node test-skill-separation.js
 */

import { allocateSeating } from './src/utils/seatingAlgorithmStrictNew.js'

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

function countSameSkillViolations(assignments) {
  const violations = {
    sameBench: 0,
    sideBySide: 0,
    frontBack: 0,
    diagonal: 0,
    totalViolations: 0
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
          violations.sameBench++
          violations.totalViolations++
        }
      }
      
      // Check side-by-side (left/right)
      const leftKey = `${row}-${col - 1}-${seatIndex}`
      const rightKey = `${row}-${col + 1}-${seatIndex}`
      const leftSeat = seatMap.get(leftKey)
      const rightSeat = seatMap.get(rightKey)
      
      if (leftSeat) {
        const leftSkill = normalizeSkill(leftSeat.skill || leftSeat.skillCode || leftSeat.Skill)
        if (leftSkill === skill) {
          violations.sideBySide++
          violations.totalViolations++
        }
      }
      if (rightSeat) {
        const rightSkill = normalizeSkill(rightSeat.skill || rightSeat.skillCode || rightSeat.Skill)
        if (rightSkill === skill) {
          violations.sideBySide++
          violations.totalViolations++
        }
      }
      
      // Check front/back
      const frontKey = `${row - 1}-${col}-${seatIndex}`
      const backKey = `${row + 1}-${col}-${seatIndex}`
      const frontSeat = seatMap.get(frontKey)
      const backSeat = seatMap.get(backKey)
      
      if (frontSeat) {
        const frontSkill = normalizeSkill(frontSeat.skill || frontSeat.skillCode || frontSeat.Skill)
        if (frontSkill === skill) {
          violations.frontBack++
          violations.totalViolations++
        }
      }
      if (backSeat) {
        const backSkill = normalizeSkill(backSeat.skill || backSeat.skillCode || backSeat.Skill)
        if (backSkill === skill) {
          violations.frontBack++
          violations.totalViolations++
        }
      }
      
      // Check diagonal
      const diagKeys = [
        `${row - 1}-${col - 1}-${seatIndex}`,
        `${row - 1}-${col + 1}-${seatIndex}`,
        `${row + 1}-${col - 1}-${seatIndex}`,
        `${row + 1}-${col + 1}-${seatIndex}`
      ]
      
      for (const diagKey of diagKeys) {
        const diagSeat = seatMap.get(diagKey)
        if (diagSeat) {
          const diagSkill = normalizeSkill(diagSeat.skill || diagSeat.skillCode || diagSeat.Skill)
          if (diagSkill === skill) {
            violations.diagonal++
            violations.totalViolations++
          }
        }
      }
    }
  }
  
  // Divide by 2 since each violation is counted twice
  violations.sameBench = Math.floor(violations.sameBench / 2)
  violations.sideBySide = Math.floor(violations.sideBySide / 2)
  violations.frontBack = Math.floor(violations.frontBack / 2)
  violations.diagonal = Math.floor(violations.diagonal / 2)
  violations.totalViolations = Math.floor(violations.totalViolations / 2)
  
  return violations
}

async function runTests() {
  console.log('=== SAME-SKILL SEPARATION VIOLATION TESTS ===')
  
  const testConfigs = [
    {
      name: 'Test 1: High skill concentration (50% Java)',
      rows: 3,
      columns: 3,
      studentsPerBench: 2,
      roomCount: 1,
      studentCount: 18,
      skillDistribution: ['Java', 'Java', 'Python', 'Python']
    },
    {
      name: 'Test 2: Balanced skills',
      rows: 3,
      columns: 3,
      studentsPerBench: 2,
      roomCount: 1,
      studentCount: 18,
      skillDistribution: ['Java', 'Python', 'JavaScript', 'C++']
    },
    {
      name: 'Test 3: Single skill dominant (80% Java)',
      rows: 4,
      columns: 4,
      studentsPerBench: 2,
      roomCount: 1,
      studentCount: 32,
      skillDistribution: ['Java', 'Java', 'Java', 'Java', 'Python']
    },
    {
      name: 'Test 4: Multiple rooms with high concentration',
      rows: 3,
      columns: 3,
      studentsPerBench: 2,
      roomCount: 2,
      studentCount: 36,
      skillDistribution: ['Java', 'Java', 'Python', 'Python']
    },
    {
      name: 'Test 5: Vertical orientation',
      rows: 3,
      columns: 3,
      studentsPerBench: 2,
      roomCount: 1,
      studentCount: 18,
      skillDistribution: ['Java', 'Java', 'Python', 'Python'],
      orientation: 'vertical'
    }
  ]
  
  for (const config of testConfigs) {
    console.log(`\n--- ${config.name} ---`)
    
    try {
      const students = generateMockStudents(config.studentCount, config.skillDistribution)
      const rooms = generateMockRooms(
        config.roomCount,
        config.rows,
        config.columns,
        config.studentsPerBench,
        config.orientation || 'horizontal'
      )
      
      const result = allocateSeating(students, rooms)
      const violations = countSameSkillViolations(result.assignments)
      
      console.log(`Total students: ${config.studentCount}`)
      console.log(`Skill distribution: ${config.skillDistribution.join(', ')}`)
      console.log(`Same bench violations: ${violations.sameBench}`)
      console.log(`Side-by-side violations: ${violations.sideBySide}`)
      console.log(`Front/back violations: ${violations.frontBack}`)
      console.log(`Diagonal violations: ${violations.diagonal}`)
      console.log(`Total violations: ${violations.totalViolations}`)
      
      // Calculate total possible adjacencies for correct percentage
      // Each student can have: same bench (studentsPerBench-1) + side-by-side (2) + front/back (2) + diagonal (4) neighbors
      const avgNeighborsPerStudent = (config.studentsPerBench - 1) + 2 + 2 + 4
      const totalPossibleAdjacencies = config.studentCount * avgNeighborsPerStudent / 2
      const violationRate = (violations.totalViolations / totalPossibleAdjacencies * 100).toFixed(2)
      console.log(`Total possible adjacencies: ${totalPossibleAdjacencies}`)
      console.log(`Violation rate: ${violationRate}%`)
      
    } catch (error) {
      console.log(`Error: ${error.message}`)
    }
  }
  
  console.log('\n=== TEST COMPLETE ===')
}

runTests()
