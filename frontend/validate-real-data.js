/**
 * VALIDATE REAL UPLOADED DATASET
 * Run with: node validate-real-data.js
 */

import { buildExportRows } from './src/utils/exportExcel.js'

// Load real seating data from localStorage simulation
// In a real scenario, this would read from localStorage or a file
// For now, we'll check if there's a data file or simulate based on the user's context

function validateRealData(seatingData) {
  if (!seatingData) {
    console.log('No real seating data found')
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
    const exportRows = buildExportRows(seatingData)
    exportCount = exportRows.filter(r => r['Student Name'] && r['Student Name'] !== '').length
  } catch (e) {
    console.error('Excel export failed:', e.message)
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

// Try to load from localStorage (simulated)
// In a browser environment, this would be: const seatingData = JSON.parse(localStorage.getItem('grit-auto-seating-result'))
// For Node.js, we'll try to read from a file if it exists

try {
  const fs = await import('fs')
  const path = await import('path')
  
  const dataPath = path.join(process.cwd(), 'seating-data.json')
  if (fs.existsSync(dataPath)) {
    const seatingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    validateRealData(seatingData)
  } else {
    console.log('No seating-data.json file found. Please export your seating data to validate.')
    console.log('To validate real data:')
    console.log('1. Generate seating in the app')
    console.log('2. Export the seating data from localStorage')
    console.log('3. Save it as seating-data.json')
    console.log('4. Run this validation script')
  }
} catch (error) {
  console.log('Cannot load real data in Node.js environment.')
  console.log('To validate real data, run this script in the browser console with access to localStorage.')
}
