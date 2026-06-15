/**
 * VALIDATE ORDERING CONSISTENCY ACROSS ALL OUTPUTS
 * Run with: node validate-ordering.js
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

function validatePhysicalOrdering(assignments) {
  const errors = []
  
  // Check that assignments are sorted by room, then bench, then seat index
  for (let i = 1; i < assignments.length; i++) {
    const prev = assignments[i - 1]
    const curr = assignments[i]
    
    // Room should be non-decreasing
    if (prev.roomName.localeCompare(curr.roomName) > 0) {
      errors.push(`Room order violation at index ${i}: ${prev.roomName} before ${curr.roomName}`)
    }
    
    // If same room, bench should be non-decreasing
    if (prev.roomName === curr.roomName && prev.benchNo > curr.benchNo) {
      errors.push(`Bench order violation at index ${i}: Room ${prev.roomName}, Bench ${prev.benchNo} before Bench ${curr.benchNo}`)
    }
    
    // If same room and bench, seat index should be non-decreasing
    if (prev.roomName === curr.roomName && prev.benchNo === curr.benchNo && prev.seatIndex > curr.seatIndex) {
      errors.push(`Seat index order violation at index ${i}: Room ${prev.roomName}, Bench ${prev.benchNo}, Seat ${prev.seatIndex} before Seat ${curr.seatIndex}`)
    }
  }
  
  return errors
}

function validateConsistency(result) {
  const errors = []
  
  const assignments = result.assignments
  
  // Validate physical ordering
  const orderingErrors = validatePhysicalOrdering(assignments)
  errors.push(...orderingErrors)
  
  // Validate Excel export ordering
  const exportRows = buildExportRows(result)
  for (let i = 0; i < Math.min(assignments.length, exportRows.length); i++) {
    if (assignments[i].seatNo !== Number(exportRows[i]['Seat No'])) {
      errors.push(`Excel export order mismatch at index ${i}: Assignment seatNo ${assignments[i].seatNo} != Export Seat No ${exportRows[i]['Seat No']}`)
    }
  }
  
  // Validate seat numbers are sequential
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i].seatNo !== i + 1) {
      errors.push(`Seat number not sequential at index ${i}: Expected ${i + 1}, got ${assignments[i].seatNo}`)
    }
  }
  
  return errors
}

async function runValidation() {
  console.log('=== VALIDATING ORDERING CONSISTENCY ===')
  
  const testConfigs = [
    { rows: 2, columns: 2, orientation: 'horizontal', studentsPerBench: 2, roomCount: 2, studentCount: 8 },
    { rows: 3, columns: 3, orientation: 'horizontal', studentsPerBench: 3, roomCount: 2, studentCount: 18 },
    { rows: 5, columns: 5, orientation: 'horizontal', studentsPerBench: 2, roomCount: 3, studentCount: 50 },
    { rows: 2, columns: 2, orientation: 'vertical', studentsPerBench: 2, roomCount: 2, studentCount: 8 },
    { rows: 3, columns: 3, orientation: 'vertical', studentsPerBench: 3, roomCount: 2, studentCount: 18 },
  ]
  
  let totalTests = 0
  let passedTests = 0
  let failedTests = 0
  
  for (const config of testConfigs) {
    totalTests++
    
    try {
      const students = generateMockStudents(config.studentCount)
      const rooms = generateMockRooms(config.roomCount, config.rows, config.columns, config.studentsPerBench, config.orientation)
      
      const result = allocateSeating(students, rooms)
      const errors = validateConsistency(result)
      
      if (errors.length === 0) {
        passedTests++
        console.log(`✓ Test passed: ${config.rows}×${config.columns} ${config.orientation}, ${config.roomCount} rooms, ${config.studentCount} students`)
      } else {
        failedTests++
        console.log(`✗ Test failed: ${config.rows}×${config.columns} ${config.orientation}, ${config.roomCount} rooms, ${config.studentCount} students`)
        errors.forEach(error => console.log(`  - ${error}`))
      }
    } catch (error) {
      failedTests++
      console.log(`✗ Test error: ${config.rows}×${config.columns} ${config.orientation}, ${config.roomCount} rooms, ${config.studentCount} students`)
      console.log(`  - ${error.message}`)
    }
  }
  
  console.log('\n=== VALIDATION SUMMARY ===')
  console.log(`Total Tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests}`)
  console.log(`Pass Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`)
  
  return failedTests === 0
}

runValidation()
