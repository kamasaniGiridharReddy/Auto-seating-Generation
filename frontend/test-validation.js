/**
 * STANDALONE VALIDATION TEST
 * Run with: node test-validation.js
 */

import { allocateSeating } from './src/utils/seatingAlgorithmStrictNew.js'
import { buildExportRows } from './src/utils/exportExcel.js'

function generateMockStudents(count) {
  const students = []
  for (let i = 0; i < count; i++) {
    students.push({
      'Student Name': `Student ${i}`,
      'Booking ID': `BOOK${String(i).padStart(6, '0')}`,
      'NIAT ID': `NIAT${String(i).padStart(6, '0')}`,
      'Student UID': `UID${String(i).padStart(6, '0')}`,
      Skill: ['Java', 'Python', 'JavaScript', 'C++', 'Go'][i % 5],
      'Skill Name': ['Java', 'Python', 'JavaScript', 'C++', 'Go'][i % 5],
      Section: ['A', 'B', 'C', 'D', 'E'][i % 5],
      Campus: 'Main',
      'Slot Centre': 'Center1',
      Batch: '2024',
      'Contest Date': '2024-01-01',
      'Time Slot': 'Morning',
    })
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

function validateResult(result, expectedStudents) {
  const errors = []
  
  const assignedStudents = result.assignments.filter(a => a.status === 'Occupied').length
  
  if (assignedStudents !== expectedStudents) {
    errors.push(`assignedStudents (${assignedStudents}) !== expectedStudents (${expectedStudents})`)
  }
  
  const studentIds = new Set()
  result.assignments.forEach(a => {
    if (a.status === 'Occupied' && a.studentId) {
      if (studentIds.has(a.studentId)) {
        errors.push(`Duplicate student ID: ${a.studentId}`)
      }
      studentIds.add(a.studentId)
    }
  })
  
  const seatIds = new Set()
  result.assignments.forEach(a => {
    if (seatIds.has(a.seatId)) {
      errors.push(`Duplicate seat ID: ${a.seatId}`)
    }
    seatIds.add(a.seatId)
  })
  
  return {
    passed: errors.length === 0,
    errors,
  }
}

async function runValidation() {
  console.log('=== VALIDATING CURRENT SEATING ENGINE ===')
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: [],
  }
  
  const testConfigs = [
    { rows: 1, columns: 1, orientation: 'horizontal', studentsPerBench: 1, roomCount: 1, studentCount: 1 },
    { rows: 2, columns: 2, orientation: 'horizontal', studentsPerBench: 2, roomCount: 1, studentCount: 4 },
    { rows: 3, columns: 3, orientation: 'horizontal', studentsPerBench: 3, roomCount: 1, studentCount: 9 },
    { rows: 5, columns: 5, orientation: 'horizontal', studentsPerBench: 2, roomCount: 1, studentCount: 50 },
    { rows: 10, columns: 10, orientation: 'horizontal', studentsPerBench: 3, roomCount: 2, studentCount: 100 },
    { rows: 1, columns: 1, orientation: 'vertical', studentsPerBench: 1, roomCount: 1, studentCount: 1 },
    { rows: 2, columns: 2, orientation: 'vertical', studentsPerBench: 2, roomCount: 1, studentCount: 4 },
    { rows: 3, columns: 3, orientation: 'vertical', studentsPerBench: 3, roomCount: 1, studentCount: 9 },
    { rows: 5, columns: 5, orientation: 'vertical', studentsPerBench: 2, roomCount: 1, studentCount: 50 },
    { rows: 10, columns: 10, orientation: 'vertical', studentsPerBench: 3, roomCount: 2, studentCount: 100 },
  ]
  
  for (const config of testConfigs) {
    results.totalTests++
    
    try {
      const students = generateMockStudents(config.studentCount)
      const rooms = generateMockRooms(config.roomCount, config.rows, config.columns, config.studentsPerBench, config.orientation)
      
      const result = allocateSeating(students, rooms)
      const validation = validateResult(result, config.studentCount)
      
      if (validation.passed) {
        results.passed++
      } else {
        results.failed++
        results.failures.push({
          config,
          errors: validation.errors,
        })
      }
    } catch (error) {
      results.failed++
      results.failures.push({
        config,
        errors: [error.message],
      })
    }
  }
  
  console.log('=== VALIDATION RESULTS ===')
  console.log(`Total Tests Executed: ${results.totalTests}`)
  console.log(`Total Passed: ${results.passed}`)
  console.log(`Total Failed: ${results.failed}`)
  console.log(`Pass Rate: ${((results.passed / results.totalTests) * 100).toFixed(2)}%`)
  
  if (results.failures.length > 0) {
    console.log('\n=== FAILED TESTS ===')
    results.failures.forEach((failure, idx) => {
      console.log(`\nFailure ${idx + 1}:`)
      console.log(`  Layout: ${failure.config.rows}x${failure.config.columns} ${failure.config.orientation}`)
      console.log(`  Room Count: ${failure.config.roomCount}`)
      console.log(`  Students Per Bench: ${failure.config.studentsPerBench}`)
      console.log(`  Student Count: ${failure.config.studentCount}`)
      console.log(`  Failure Reason: ${failure.errors.join(', ')}`)
    })
  }
  
  return results
}

runValidation()
