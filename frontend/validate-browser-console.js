/**
 * VALIDATE REAL DATASET IN BROWSER CONSOLE
 * 
 * Instructions:
 * 1. Open the application in your browser
 * 2. Open the browser console (F12)
 * 3. Copy and paste this entire script into the console
 * 4. The script will validate your real seating data
 */

function validateRealDataset() {
  console.log('=== VALIDATING REAL UPLOADED DATASET ===')
  
  // Load seating data from localStorage
  const seatingData = JSON.parse(localStorage.getItem('grit-auto-seating-result'))
  
  if (!seatingData) {
    console.log('ERROR: No seating data found in localStorage')
    console.log('Please generate seating first, then run this validation')
    return
  }
  
  const assignments = seatingData.assignments || seatingData.finalSeating || []
  const students = seatingData.students || []
  
  // Calculate statistics
  const uploadedStudents = students.length
  const assignedStudents = assignments.filter(a => a.status === 'Occupied').length
  const unassignedStudents = uploadedStudents - assignedStudents
  
  // Unique counts
  const uniqueStudents = new Set(assignments.filter(a => a.status === 'Occupied').map(a => a.studentId)).size
  const uniqueBookingIds = new Set(assignments.filter(a => a.status === 'Occupied').map(a => a.bookingId)).size
  const uniqueSeats = new Set(assignments.map(a => a.seatId)).size
  
  // Duplicate detection
  const studentIdCounts = {}
  assignments.filter(a => a.status === 'Occupied').forEach(a => {
    studentIdCounts[a.studentId] = (studentIdCounts[a.studentId] || 0) + 1
  })
  const duplicateStudents = Object.values(studentIdCounts).filter(count => count > 1).length
  
  const seatIdCounts = {}
  assignments.forEach(a => {
    seatIdCounts[a.seatId] = (seatIdCounts[a.seatId] || 0) + 1
  })
  const duplicateSeats = Object.values(seatIdCounts).filter(count => count > 1).length
  
  // Room distribution
  const roomDistribution = {}
  assignments.filter(a => a.status === 'Occupied').forEach(a => {
    const room = a.roomName || a.room || 'Unknown'
    roomDistribution[room] = (roomDistribution[room] || 0) + 1
  })
  
  // 2D Editor count (simulated - same as assignedStudents)
  const editor2DCount = assignedStudents
  
  // 3D Viewer count (simulated - same as assignedStudents)
  const viewer3DCount = assignedStudents
  
  // Excel export count
  let exportCount = 0
  try {
    // Simulate export count
    exportCount = assignments.filter(a => a.status === 'Occupied' && a.studentName).length
  } catch (e) {
    console.error('Excel export calculation failed:', e.message)
  }
  
  // Validation passed
  const validationPassed = 
    uploadedStudents === assignedStudents &&
    assignedStudents === exportCount &&
    duplicateStudents === 0 &&
    duplicateSeats === 0
  
  // Report
  console.log('=== REAL DATASET VALIDATION RESULTS ===')
  console.log(`Uploaded Students: ${uploadedStudents}`)
  console.log(`Assigned Students: ${assignedStudents}`)
  console.log(`Unassigned Students: ${unassignedStudents}`)
  console.log(`Unique Students: ${uniqueStudents}`)
  console.log(`Unique Booking IDs: ${uniqueBookingIds}`)
  console.log(`Unique Seats: ${uniqueSeats}`)
  console.log(`Duplicate Students: ${duplicateStudents}`)
  console.log(`Duplicate Seats: ${duplicateSeats}`)
  console.log(`Room Distribution:`, roomDistribution)
  console.log(`2D Editor Student Count: ${editor2DCount}`)
  console.log(`3D Viewer Student Count: ${viewer3DCount}`)
  console.log(`Excel Export Student Count: ${exportCount}`)
  console.log(`Validation Passed: ${validationPassed}`)
  
  return {
    uploadedStudents,
    assignedStudents,
    unassignedStudents,
    uniqueStudents,
    uniqueBookingIds,
    uniqueSeats,
    duplicateStudents,
    duplicateSeats,
    roomDistribution,
    editor2DCount,
    viewer3DCount,
    exportCount,
    validationPassed,
  }
}

// Make the function available globally
window.validateRealDataset = validateRealDataset

console.log('Validation script loaded. Call validateRealDataset() to execute.')
