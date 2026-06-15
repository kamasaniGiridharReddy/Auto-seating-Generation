import * as XLSX from 'xlsx'

const EXPORT_COLUMNS = [
  'Seat No',
  'Booking ID',
  'Student UID',
  'Student Name',
  'NIAT ID',
  'Campus',
  'Slot Centre',
  'Batch',
  'Section',
  'Contest Date',
  'Time Slot',
  'Skill',
  'Skill Level',
  'Room',
  'Bench Number',
  'Seat Position',
]

export function buildExportRows(results) {
  const assignments = results?.assignments || results?.finalSeating || []
  
  // Assignments are already sorted in physical order (room → bench → seat)
  // by the seating engine, so we just map them directly
  return assignments.map((a) => ({
    'Seat No': a.seatNo ?? a.seatingNo ?? '',
    'Booking ID': a.bookingId ?? '',
    'Student UID': a.student?.['Student UID'] ?? '',
    'Student Name': a.studentName ?? '',
    'NIAT ID': a.niatId ?? '',
    'Campus': a.student?.Campus ?? '',
    'Slot Centre': a.student?.['Slot Centre'] ?? '',
    'Batch': a.student?.Batch ?? '',
    'Section': a.section ?? a.student?.Section ?? '',
    'Contest Date': a.student?.['Contest Date'] ?? '',
    'Time Slot': a.student?.['Time Slot'] ?? '',
    'Skill': a.skillCode ?? a.skill ?? '',
    'Skill Level': a.skillName ?? '',
    'Room': a.roomName ?? a.room ?? a.roomNumber ?? '',
    'Bench Number': a.benchNo ?? '',
    'Seat Position': a.seatIndex ?? '',
  }))
}

export function downloadSeatingExcel(results, filename) {
  const rows = buildExportRows(results)
  if (!rows.length) return false

  // Export validation: uploadedStudents === assignedStudents === exportedStudents
  console.log('[EXPORT VALIDATION] Checking seat assignment completeness')
  
  const occupiedSeats = rows.filter(r => r['Student Name'] && r['Student Name'] !== '').length
  const totalSeats = rows.length
  
  console.log(`[EXPORT VALIDATION] Total seats in export: ${totalSeats}`)
  console.log(`[EXPORT VALIDATION] Occupied seats: ${occupiedSeats}`)
  console.log(`[EXPORT VALIDATION] Empty seats: ${totalSeats - occupiedSeats}`)
  
  // Try to get uploaded student count from results
  const uploadedStudents = results?.validation?.uploadedStudents || results?.integrityAudit?.uploadedStudents || results?.totalAssigned || 0
  const assignedStudents = results?.validation?.assignedStudents || results?.integrityAudit?.seatedStudents || 0
  
  if (uploadedStudents > 0) {
    console.log(`[EXPORT VALIDATION] Uploaded students: ${uploadedStudents}`)
    console.log(`[EXPORT VALIDATION] Assigned students: ${assignedStudents}`)
    
    // Validation 1: uploadedStudents === assignedStudents
    if (assignedStudents !== uploadedStudents) {
      const missingCount = uploadedStudents - assignedStudents
      console.error(`[EXPORT VALIDATION] FAILURE: Assigned (${assignedStudents}) !== Uploaded (${uploadedStudents})`)
      console.error(`[EXPORT VALIDATION] ${missingCount} students were not seated`)
      alert(`Export blocked: ${missingCount} students were not seated. All students must be seated before export.`)
      return false
    }
    
    // Validation 2: assignedStudents === exportedStudents
    if (occupiedSeats !== assignedStudents) {
      const exportMismatch = assignedStudents - occupiedSeats
      console.error(`[EXPORT VALIDATION] FAILURE: Exported (${occupiedSeats}) !== Assigned (${assignedStudents})`)
      console.error(`[EXPORT VALIDATION] ${exportMismatch} students missing from export`)
      alert(`Export blocked: ${exportMismatch} students missing from export. Data mismatch detected.`)
      return false
    }
    
    console.log('[EXPORT VALIDATION] PASSED: uploadedStudents === assignedStudents === exportedStudents')
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seating')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, filename ?? `GRIT-Seating-${stamp}.xlsx`)
  return true
}
