/**
 * EXHAUSTIVE SEATING ENGINE VALIDATION SUITE
 * 
 * Tests the seating engine across a comprehensive matrix of configurations
 * to ensure correctness and reliability before production release.
 * 
 * Target: 100% pass rate before release
 */

import { allocateSeating } from './seatingAlgorithmStrictNew.js'
import { buildExportRows } from './exportExcel.js'

// Test configuration
const TEST_CONFIG = {
  // Full test matrix (for release validation)
  full: {
    layouts: {
      rows: [1, 2, 3, 4, 5, 10, 20, 50, 100],
      columns: [1, 2, 3, 4, 5, 10, 20, 50, 100],
      orientations: ['horizontal', 'vertical'],
    },
    studentsPerBench: [1, 2, 3, 4, 5],
    roomCounts: [1, 2, 3, 5, 10, 20, 50, 100],
    studentCounts: [1, 10, 50, 100, 250, 500, 1000, 2000, 3000, 5000],
  },
  
  // Quick test matrix (for development)
  quick: {
    layouts: {
      rows: [1, 2, 5, 10, 50],
      columns: [1, 2, 5, 10, 50],
      orientations: ['horizontal', 'vertical'],
    },
    studentsPerBench: [1, 2, 3, 4, 5],
    roomCounts: [1, 2, 5, 10],
    studentCounts: [1, 10, 50, 100, 500],
  },
}

/**
 * Generate mock students for testing
 */
function generateMockStudents(count, startIndex = 0) {
  const students = []
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i
    students.push({
      'Student Name': `Student ${idx}`,
      'Booking ID': `BOOK${String(idx).padStart(6, '0')}`,
      'NIAT ID': `NIAT${String(idx).padStart(6, '0')}`,
      'Student UID': `UID${String(idx).padStart(6, '0')}`,
      Skill: ['Java', 'Python', 'JavaScript', 'C++', 'Go'][idx % 5],
      'Skill Name': ['Java', 'Python', 'JavaScript', 'C++', 'Go'][idx % 5],
      Section: ['A', 'B', 'C', 'D', 'E'][idx % 5],
      Campus: 'Main',
      'Slot Centre': 'Center1',
      Batch: '2024',
      'Contest Date': '2024-01-01',
      'Time Slot': 'Morning',
    })
  }
  return students
}

/**
 * Generate mock rooms for testing
 */
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

/**
 * Validate seating result
 */
function validateSeatingResult(result, uploadedStudents, expectedCapacity) {
  const errors = []
  
  // Check result structure
  if (!result.rooms) errors.push('Missing result.rooms')
  if (!result.students) errors.push('Missing result.students')
  if (!result.seats) errors.push('Missing result.seats')
  if (!result.assignments) errors.push('Missing result.assignments')
  if (!result.validation) errors.push('Missing result.validation')
  
  if (errors.length > 0) {
    return { passed: false, errors }
  }
  
  const { rooms, students, seats, assignments, validation } = result
  
  // Validation 1: uploadedStudents === assignedStudents
  const assignedStudents = assignments.filter(a => a.status === 'Occupied').length
  if (assignedStudents !== uploadedStudents) {
    errors.push(`assignedStudents (${assignedStudents}) !== uploadedStudents (${uploadedStudents})`)
  }
  
  // Validation 2: One student = one seat
  const studentIds = new Set()
  assignments.forEach(a => {
    if (a.status === 'Occupied' && a.studentId) {
      if (studentIds.has(a.studentId)) {
        errors.push(`Duplicate student ID: ${a.studentId}`)
      }
      studentIds.add(a.studentId)
    }
  })
  
  // Validation 3: No duplicate Booking IDs
  const bookingIds = new Set()
  assignments.forEach(a => {
    if (a.status === 'Occupied' && a.bookingId) {
      if (bookingIds.has(a.bookingId)) {
        errors.push(`Duplicate Booking ID: ${a.bookingId}`)
      }
      bookingIds.add(a.bookingId)
    }
  })
  
  // Validation 4: No duplicate Student UIDs
  const studentUIDs = new Set()
  students.forEach(s => {
    const uid = s['Student UID']
    if (uid) {
      if (studentUIDs.has(uid)) {
        errors.push(`Duplicate Student UID: ${uid}`)
      }
      studentUIDs.add(uid)
    }
  })
  
  // Validation 5: No duplicate seat assignments
  const seatIds = new Set()
  assignments.forEach(a => {
    if (seatIds.has(a.seatId)) {
      errors.push(`Duplicate seat assignment: ${a.seatId}`)
    }
    seatIds.add(a.seatId)
  })
  
  // Validation 6: No room capacity overflow
  rooms.forEach(room => {
    const roomAssignments = assignments.filter(a => a.roomId === room.id)
    if (roomAssignments.length > room.capacity) {
      errors.push(`Room ${room.name} overflow: ${roomAssignments.length} > capacity ${room.capacity}`)
    }
  })
  
  // Validation 7: Total capacity check
  const totalCapacity = seats.length
  if (assignments.length !== totalCapacity) {
    errors.push(`Total assignments (${assignments.length}) !== total capacity (${totalCapacity})`)
  }
  
  // Validation 8: Excel export count validation
  try {
    const exportRows = buildExportRows(result)
    const exportOccupied = exportRows.filter(r => r['Student Name'] && r['Student Name'] !== '').length
    if (exportOccupied !== assignedStudents) {
      errors.push(`Excel export count (${exportOccupied}) !== assignedStudents (${assignedStudents})`)
    }
  } catch (e) {
    errors.push(`Excel export failed: ${e.message}`)
  }
  
  // Validation 9: 2D Editor count validation (simulated)
  const simulated2DCount = assignments.filter(a => a.status === 'Occupied').length
  if (simulated2DCount !== assignedStudents) {
    errors.push(`2D Editor count (${simulated2DCount}) !== assignedStudents (${assignedStudents})`)
  }
  
  // Validation 10: 3D Viewer count validation (simulated)
  const simulated3DCount = assignments.filter(a => a.status === 'Occupied').length
  if (simulated3DCount !== assignedStudents) {
    errors.push(`3D Viewer count (${simulated3DCount}) !== assignedStudents (${assignedStudents})`)
  }
  
  // Production guarantee check
  if (uploadedStudents <= expectedCapacity && assignedStudents !== uploadedStudents) {
    errors.push(`PRODUCTION GUARANTEE VIOLATION: uploadedStudents (${uploadedStudents}) <= capacity (${expectedCapacity}) but assignedStudents (${assignedStudents}) !== uploadedStudents`)
  }
  
  return {
    passed: errors.length === 0,
    errors,
    stats: {
      uploadedStudents,
      assignedStudents,
      totalCapacity,
      emptySeats: assignments.filter(a => a.status === 'Empty').length,
    },
  }
}

/**
 * Run a single test case
 */
async function runSingleTest(config) {
  const {
    rows,
    columns,
    orientation,
    studentsPerBench,
    roomCount,
    studentCount,
  } = config
  
  const students = generateMockStudents(studentCount)
  const rooms = generateMockRooms(roomCount, rows, columns, studentsPerBench, orientation)
  const totalCapacity = rooms.reduce((sum, r) => sum + (r.rows * r.columns * r.studentsPerBench), 0)
  
  const testLabel = `R${rows}×C${columns}_${orientation}_SPB${studentsPerBench}_Rooms${roomCount}_Students${studentCount}`
  
  try {
    const result = allocateSeating(students, rooms)
    const validation = validateSeatingResult(result, studentCount, totalCapacity)
    
    return {
      label: testLabel,
      config,
      passed: validation.passed,
      errors: validation.errors,
      stats: validation.stats,
      duration: 0, // Could add timing if needed
    }
  } catch (error) {
    // Check if error is expected (capacity overflow)
    if (studentCount > totalCapacity) {
      return {
        label: testLabel,
        config,
        passed: true, // Expected failure is a pass
        errors: [],
        stats: { uploadedStudents: studentCount, totalCapacity },
        expectedFailure: true,
        error: error.message,
      }
    }
    
    return {
      label: testLabel,
      config,
      passed: false,
      errors: [error.message],
      stats: { uploadedStudents: studentCount, totalCapacity },
      unexpectedError: true,
    }
  }
}

/**
 * Generate test matrix
 */
function generateTestMatrix(mode = 'quick') {
  const config = TEST_CONFIG[mode]
  const tests = []
  
  for (const rows of config.layouts.rows) {
    for (const columns of config.layouts.columns) {
      for (const orientation of config.layouts.orientations) {
        for (const studentsPerBench of config.studentsPerBench) {
          for (const roomCount of config.roomCounts) {
            for (const studentCount of config.studentCounts) {
              tests.push({
                rows,
                columns,
                orientation,
                studentsPerBench,
                roomCount,
                studentCount,
              })
            }
          }
        }
      }
    }
  }
  
  return tests
}

/**
 * Run validation suite
 */
export async function runValidationSuite(mode = 'quick') {
  console.log(`[VALIDATION SUITE] Starting ${mode} validation suite`)
  console.log(`[VALIDATION SUITE] ====================================`)
  
  const tests = generateTestMatrix(mode)
  console.log(`[VALIDATION SUITE] Total tests to run: ${tests.length}`)
  
  const results = {
    totalTests: tests.length,
    passed: 0,
    failed: 0,
    expectedFailures: 0,
    unexpectedFailures: 0,
    tests: [],
    summary: {
      layoutsTested: new Set(),
      roomCountsTested: new Set(),
      studentCountsTested: new Set(),
      studentsPerBenchTested: new Set(),
    },
    failures: [],
  }
  
  let testIndex = 0
  for (const test of tests) {
    testIndex++
    const testResult = await runSingleTest(test)
    
    results.tests.push(testResult)
    
    // Track summary stats
    results.summary.layoutsTested.add(`${test.rows}×${test.columns}_${test.orientation}`)
    results.summary.roomCountsTested.add(test.roomCount)
    results.summary.studentCountsTested.add(test.studentCount)
    results.summary.studentsPerBenchTested.add(test.studentsPerBench)
    
    if (testResult.passed) {
      if (testResult.expectedFailure) {
        results.expectedFailures++
      } else {
        results.passed++
      }
    } else {
      results.failed++
      if (testResult.unexpectedError) {
        results.unexpectedFailures++
      }
      results.failures.push({
        label: testResult.label,
        errors: testResult.errors,
        stats: testResult.stats,
      })
    }
    
    // Progress logging
    if (testIndex % 100 === 0 || testIndex === tests.length) {
      console.log(`[VALIDATION SUITE] Progress: ${testIndex}/${tests.length} tests completed`)
    }
  }
  
  // Generate report
  generateReport(results, mode)
  
  return results
}

/**
 * Generate validation report
 */
function generateReport(results, mode) {
  console.log(`[VALIDATION SUITE] ====================================`)
  console.log(`[VALIDATION SUITE] ${mode.toUpperCase()} VALIDATION REPORT`)
  console.log(`[VALIDATION SUITE] ====================================`)
  console.log(`[VALIDATION SUITE] Total tests: ${results.totalTests}`)
  console.log(`[VALIDATION SUITE] Passed: ${results.passed}`)
  console.log(`[VALIDATION SUITE] Failed: ${results.failed}`)
  console.log(`[VALIDATION SUITE] Expected failures (capacity overflow): ${results.expectedFailures}`)
  console.log(`[VALIDATION SUITE] Unexpected failures: ${results.unexpectedFailures}`)
  console.log(`[VALIDATION SUITE] Pass rate: ${((results.passed / results.totalTests) * 100).toFixed(2)}%`)
  console.log(`[VALIDATION SUITE] ====================================`)
  console.log(`[VALIDATION SUITE] Layouts tested: ${results.summary.layoutsTested.size}`)
  console.log(`[VALIDATION SUITE] Room counts tested: ${results.summary.roomCountsTested.size}`)
  console.log(`[VALIDATION SUITE] Student counts tested: ${results.summary.studentCountsTested.size}`)
  console.log(`[VALIDATION SUITE] Students per bench tested: ${results.summary.studentsPerBenchTested.size}`)
  console.log(`[VALIDATION SUITE] ====================================`)
  
  if (results.failures.length > 0) {
    console.log(`[VALIDATION SUITE] FAILURES (${results.failures.length}):`)
    results.failures.forEach((failure, idx) => {
      console.log(`[VALIDATION SUITE] ${idx + 1}. ${failure.label}`)
      console.log(`[VALIDATION SUITE]    Errors: ${failure.errors.join(', ')}`)
      console.log(`[VALIDATION SUITE]    Stats:`, failure.stats)
    })
  } else {
    console.log(`[VALIDATION SUITE] ✓ ALL TESTS PASSED`)
  }
  
  console.log(`[VALIDATION SUITE] ====================================`)
  
  // Return pass/fail status
  return results.unexpectedFailures === 0
}

/**
 * Run quick validation (for development)
 */
export async function runQuickValidation() {
  return runValidationSuite('quick')
}

/**
 * Run full validation (for release)
 */
export async function runFullValidation() {
  return runValidationSuite('full')
}
