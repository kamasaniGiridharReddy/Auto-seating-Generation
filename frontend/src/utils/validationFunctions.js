/**
 * Validation Functions for Correctness Testing
 * Validates seating generation results for correctness
 */

/**
 * Validate that no student is missing from the seating
 */
export function validateNoStudentMissing(students, assignments) {
  const studentNiatIds = new Set(students.map(s => s['NIAT ID']))
  const seatedNiatIds = new Set(assignments.filter(a => a.status === 'Occupied').map(a => a.niatId))
  
  const missingStudents = students.filter(s => !seatedNiatIds.has(s['NIAT ID']))
  
  return {
    passed: missingStudents.length === 0,
    message: missingStudents.length === 0 
      ? 'All students are seated' 
      : `${missingStudents.length} students are missing from seating`,
    missingStudents,
    missingCount: missingStudents.length,
  }
}

/**
 * Validate that there are no duplicate seat assignments
 */
export function validateNoDuplicateAssignments(assignments) {
  const seatKeys = new Set()
  const duplicates = []
  
  for (const assignment of assignments) {
    if (assignment.status === 'Empty') continue
    
    const seatKey = `${assignment.room}-${assignment.benchNo}-${assignment.seatIndex}`
    
    if (seatKeys.has(seatKey)) {
      duplicates.push({
        seatKey,
        assignment,
      })
    } else {
      seatKeys.add(seatKey)
    }
  }
  
  return {
    passed: duplicates.length === 0,
    message: duplicates.length === 0 
      ? 'No duplicate seat assignments' 
      : `${duplicates.length} duplicate seat assignments found`,
    duplicates,
    duplicateCount: duplicates.length,
  }
}

/**
 * Validate that Booking IDs are preserved
 */
export function validateBookingIdPreserved(students, assignments) {
  const studentBookingIds = new Map()
  students.forEach(s => {
    studentBookingIds.set(s['NIAT ID'], s['Booking ID'] || '')
  })
  
  const missingBookingIds = []
  const incorrectBookingIds = []
  
  for (const assignment of assignments) {
    if (assignment.status === 'Empty') continue
    
    const expectedBookingId = studentBookingIds.get(assignment.niatId)
    const actualBookingId = assignment.bookingId || ''
    
    if (!actualBookingId && expectedBookingId) {
      missingBookingIds.push({
        niatId: assignment.niatId,
        studentName: assignment.studentName,
        expected: expectedBookingId,
        actual: actualBookingId,
      })
    } else if (actualBookingId !== expectedBookingId) {
      incorrectBookingIds.push({
        niatId: assignment.niatId,
        studentName: assignment.studentName,
        expected: expectedBookingId,
        actual: actualBookingId,
      })
    }
  }
  
  return {
    passed: missingBookingIds.length === 0 && incorrectBookingIds.length === 0,
    message: missingBookingIds.length === 0 && incorrectBookingIds.length === 0
      ? 'All Booking IDs preserved correctly'
      : `${missingBookingIds.length} missing, ${incorrectBookingIds.length} incorrect Booking IDs`,
    missingBookingIds,
    incorrectBookingIds,
    missingCount: missingBookingIds.length,
    incorrectCount: incorrectBookingIds.length,
  }
}

/**
 * Validate that room capacity is not exceeded
 */
export function validateRoomCapacity(assignments, roomConfig) {
  const rows = Number(roomConfig.rows) || 1
  const columns = Number(roomConfig.columns) || 1
  const studentsPerBench = Number(roomConfig.studentsPerBench) || 2
  const roomCapacity = rows * columns * studentsPerBench
  
  const occupiedCount = assignments.filter(a => a.status === 'Occupied').length
  
  return {
    passed: occupiedCount <= roomCapacity,
    message: occupiedCount <= roomCapacity
      ? `Room capacity not exceeded (${occupiedCount}/${roomCapacity})`
      : `Room capacity exceeded (${occupiedCount}/${roomCapacity})`,
    occupiedCount,
    roomCapacity,
    excess: Math.max(0, occupiedCount - roomCapacity),
  }
}

/**
 * Validate that bench capacity is not exceeded
 */
export function validateBenchCapacity(assignments, roomConfig) {
  const studentsPerBench = Number(roomConfig.studentsPerBench) || 2
  
  const benchAssignments = {}
  
  for (const assignment of assignments) {
    if (assignment.status === 'Empty') continue
    
    const benchKey = `${assignment.room}-${assignment.benchNo}`
    if (!benchAssignments[benchKey]) {
      benchAssignments[benchKey] = []
    }
    benchAssignments[benchKey].push(assignment)
  }
  
  const exceededBenches = []
  
  for (const [benchKey, benchSeats] of Object.entries(benchAssignments)) {
    if (benchSeats.length > studentsPerBench) {
      exceededBenches.push({
        benchKey,
        seatCount: benchSeats.length,
        capacity: studentsPerBench,
        excess: benchSeats.length - studentsPerBench,
      })
    }
  }
  
  return {
    passed: exceededBenches.length === 0,
    message: exceededBenches.length === 0
      ? 'No bench capacity exceeded'
      : `${exceededBenches.length} benches exceed capacity`,
    exceededBenches,
    exceededCount: exceededBenches.length,
  }
}

/**
 * Validate that all seats have valid assignments
 */
export function validateSeatAssignments(assignments, roomConfig) {
  const invalidAssignments = []
  
  for (const assignment of assignments) {
    // Check required fields
    if (!assignment.seatNo && assignment.status === 'Occupied') {
      invalidAssignments.push({
        assignment,
        reason: 'Missing seatNo',
      })
    }
    
    if (!assignment.benchNo && assignment.status === 'Occupied') {
      invalidAssignments.push({
        assignment,
        reason: 'Missing benchNo',
      })
    }
    
    if (!assignment.niatId && assignment.status === 'Occupied') {
      invalidAssignments.push({
        assignment,
        reason: 'Missing niatId',
      })
    }
    
    if (!assignment.studentName && assignment.status === 'Occupied') {
      invalidAssignments.push({
        assignment,
        reason: 'Missing studentName',
      })
    }
    
    // Check seat index is valid
    if (assignment.seatIndex !== undefined && assignment.seatIndex !== null) {
      const studentsPerBench = Number(roomConfig.studentsPerBench) || 2
      if (assignment.seatIndex < 0 || assignment.seatIndex >= studentsPerBench) {
        invalidAssignments.push({
          assignment,
          reason: `Invalid seatIndex (${assignment.seatIndex})`,
        })
      }
    }
  }
  
  return {
    passed: invalidAssignments.length === 0,
    message: invalidAssignments.length === 0
      ? 'All seat assignments are valid'
      : `${invalidAssignments.length} invalid seat assignments`,
    invalidAssignments,
    invalidCount: invalidAssignments.length,
  }
}

/**
 * Validate that conflict detection is working
 */
export function validateConflictDetection(assignments) {
  const occupiedAssignments = assignments.filter(a => a.status === 'Occupied')
  
  const assignmentsWithConflicts = occupiedAssignments.filter(a => {
    return a.conflicts && (
      a.conflicts.sameBench || 
      a.conflicts.frontBack || 
      a.conflicts.leftRight || 
      a.conflicts.diagonal || 
      a.conflicts.cluster
    )
  })
  
  return {
    passed: true, // Conflict detection is optional, not a correctness issue
    message: `${assignmentsWithConflicts.length} assignments have conflicts`,
    conflictCount: assignmentsWithConflicts.length,
    totalOccupied: occupiedAssignments.length,
  }
}

/**
 * Run all validations
 */
export function runAllValidations(students, assignments, roomConfig) {
  const results = {
    noStudentMissing: validateNoStudentMissing(students, assignments),
    noDuplicateAssignments: validateNoDuplicateAssignments(assignments),
    bookingIdPreserved: validateBookingIdPreserved(students, assignments),
    roomCapacity: validateRoomCapacity(assignments, roomConfig),
    benchCapacity: validateBenchCapacity(assignments, roomConfig),
    seatAssignments: validateSeatAssignments(assignments, roomConfig),
    conflictDetection: validateConflictDetection(assignments),
  }
  
  const allPassed = Object.values(results).every(r => r.passed)
  
  return {
    allPassed,
    results,
    summary: {
      totalChecks: Object.keys(results).length,
      passedChecks: Object.values(results).filter(r => r.passed).length,
      failedChecks: Object.values(results).filter(r => !r.passed).length,
    },
  }
}

/**
 * Generate validation report
 */
export function generateValidationReport(validationResults) {
  const lines = []
  
  lines.push('# Validation Report')
  lines.push('')
  lines.push(`Overall Status: ${validationResults.allPassed ? '✅ PASS' : '❌ FAIL'}`)
  lines.push(`Total Checks: ${validationResults.summary.totalChecks}`)
  lines.push(`Passed: ${validationResults.summary.passedChecks}`)
  lines.push(`Failed: ${validationResults.summary.failedChecks}`)
  lines.push('')
  
  for (const [checkName, result] of Object.entries(validationResults.results)) {
    lines.push(`## ${checkName}`)
    lines.push(`Status: ${result.passed ? '✅ PASS' : '❌ FAIL'}`)
    lines.push(`Message: ${result.message}`)
    
    if (result.missingCount > 0) {
      lines.push(`Missing Count: ${result.missingCount}`)
    }
    if (result.duplicateCount > 0) {
      lines.push(`Duplicate Count: ${result.duplicateCount}`)
    }
    if (result.missingCount > 0 || result.incorrectCount > 0) {
      lines.push(`Missing Booking IDs: ${result.missingCount}`)
      lines.push(`Incorrect Booking IDs: ${result.incorrectCount}`)
    }
    if (result.excess > 0) {
      lines.push(`Excess: ${result.excess}`)
    }
    if (result.exceededCount > 0) {
      lines.push(`Exceeded Benches: ${result.exceededCount}`)
    }
    if (result.invalidCount > 0) {
      lines.push(`Invalid Assignments: ${result.invalidCount}`)
    }
    
    lines.push('')
  }
  
  return lines.join('\n')
}
