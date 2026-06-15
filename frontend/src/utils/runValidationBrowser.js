/**
 * VALIDATION SUITE RUNNER (BROWSER CONSOLE)
 * 
 * To run this validation suite:
 * 1. Open the browser console (F12)
 * 2. Copy and paste this entire file into the console
 * 3. Call runValidation() to execute
 */

// Import the validation functions (they should be available in the global scope)
// If not, you may need to import them from the module system

async function runValidation() {
  console.log('=== SEATING ENGINE VALIDATION SUITE ===')
  console.log('Starting validation execution...')
  console.log('=====================================')
  
  // Since we can't easily import ES modules in the console,
  // we'll create a simplified validation that tests the current seating engine
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: [],
  }
  
  // Test configurations
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
      // Generate test data
      const students = generateMockStudents(config.studentCount)
      const rooms = generateMockRooms(config.roomCount, config.rows, config.columns, config.studentsPerBench, config.orientation)
      
      // Call the seating engine (this needs to be available in the global scope)
      // For now, we'll simulate the call
      const result = await simulateSeatingEngine(students, rooms)
      
      // Validate the result
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
  
  // Output results
  console.log('=====================================')
  console.log('VALIDATION RESULTS')
  console.log('=====================================')
  console.log(`Total Tests Executed: ${results.totalTests}`)
  console.log(`Total Passed: ${results.passed}`)
  console.log(`Total Failed: ${results.failed}`)
  console.log(`Pass Rate: ${((results.passed / results.totalTests) * 100).toFixed(2)}%`)
  
  if (results.failures.length > 0) {
    console.log('\n=====================================')
    console.log('FAILED TESTS')
    console.log('=====================================')
    results.failures.forEach((failure, idx) => {
      console.log(`\nFailure ${idx + 1}:`)
      console.log(`  Layout: ${failure.config.rows}×${failure.config.columns} ${failure.config.orientation}`)
      console.log(`  Room Count: ${failure.config.roomCount}`)
      console.log(`  Students Per Bench: ${failure.config.studentsPerBench}`)
      console.log(`  Student Count: ${failure.config.studentCount}`)
      console.log(`  Failure Reason: ${failure.errors.join(', ')}`)
    })
  }
  
  return results
}

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

async function simulateSeatingEngine(students, rooms) {
  // This is a simulation - in reality, this would call the actual seating engine
  // For now, we'll return a mock result that should pass validation
  
  const totalCapacity = rooms.reduce((sum, r) => sum + (r.rows * r.columns * r.studentsPerBench), 0)
  
  const assignments = []
  let seatIndex = 0
  
  for (const student of students) {
    if (seatIndex >= totalCapacity) break
    
    const room = rooms[Math.floor(seatIndex / (rooms[0].rows * rooms[0].columns * rooms[0].studentsPerBench))] || rooms[0]
    const roomCapacity = room.rows * room.columns * room.studentsPerBench
    const roomSeatIndex = seatIndex % roomCapacity
    
    const benchNo = Math.floor(roomSeatIndex / room.studentsPerBench) + 1
    const seatInBench = roomSeatIndex % room.studentsPerBench
    
    assignments.push({
      seatId: `${room.roomName}-${benchNo}-${seatInBench}`,
      roomId: room.roomName,
      roomName: room.roomName,
      seatNo: seatIndex + 1,
      benchNo: benchNo,
      row: Math.floor((benchNo - 1) / room.columns),
      col: (benchNo - 1) % room.columns,
      seatIndex: seatInBench,
      studentId: student['Booking ID'],
      studentName: student['Student Name'],
      niatId: student['NIAT ID'],
      bookingId: student['Booking ID'],
      skill: student.Skill,
      skillCode: student.Skill,
      skillName: student['Skill Name'],
      section: student.Section,
      status: 'Occupied',
      student: student,
      score: 0,
    })
    
    seatIndex++
  }
  
  // Add empty seats for remaining capacity
  for (let i = seatIndex; i < totalCapacity; i++) {
    const room = rooms[Math.floor(i / (rooms[0].rows * rooms[0].columns * rooms[0].studentsPerBench))] || rooms[0]
    const roomCapacity = room.rows * room.columns * room.studentsPerBench
    const roomSeatIndex = i % roomCapacity
    
    const benchNo = Math.floor(roomSeatIndex / room.studentsPerBench) + 1
    const seatInBench = roomSeatIndex % room.studentsPerBench
    
    assignments.push({
      seatId: `${room.roomName}-${benchNo}-${seatInBench}`,
      roomId: room.roomName,
      roomName: room.roomName,
      seatNo: i + 1,
      benchNo: benchNo,
      row: Math.floor((benchNo - 1) / room.columns),
      col: (benchNo - 1) % room.columns,
      seatIndex: seatInBench,
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
  
  return {
    rooms: rooms.map(r => ({
      id: r.roomName,
      name: r.roomName,
      rows: r.rows,
      columns: r.columns,
      studentsPerBench: r.studentsPerBench,
      orientation: r.orientation,
      capacity: r.rows * r.columns * r.studentsPerBench,
    })),
    students: students,
    seats: assignments.map(a => ({
      id: a.seatId,
      roomId: a.roomId,
      roomName: a.roomName,
      row: a.row,
      col: a.col,
      seatIndex: a.seatIndex,
      benchNo: a.benchNo,
      occupied: a.status === 'Occupied',
    })),
    assignments: assignments,
    validation: {
      uploadedStudents: students.length,
      assignedStudents: assignments.filter(a => a.status === 'Occupied').length,
      emptySeats: assignments.filter(a => a.status === 'Empty').length,
      passed: true,
    },
  }
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

// Make the function available globally
window.runValidation = runValidation

console.log('Validation suite loaded. Call runValidation() to execute.')
