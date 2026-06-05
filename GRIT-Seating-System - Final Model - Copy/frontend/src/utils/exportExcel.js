import * as XLSX from 'xlsx'

const EXPORT_COLUMNS = [
  'Seat No',
  'Bench No',
  'Room Name',
  'Student Name',
  'NIAT ID',
  'Skill Code',
  'Skill Name',
  'Status',
]

export function buildExportRows(results) {
  const assignments = results?.finalSeating || results?.assignments || []
  
  return assignments
    .map((a) => ({
      'Seat No': a.seatingNo ?? a.seatNo ?? '',
      'Bench No': a.benchNo ?? '',
      'Room Name': a.room ?? a.roomName ?? a.roomNumber ?? '',
      'Student Name': a.studentName ?? '',
      'NIAT ID': a.niatId ?? '',
      'Skill Code': a.skillCode ?? a.skill ?? '',
      'Skill Name': a.skillName ?? '',
      'Status': a.status ?? '',
    }))
    .sort((a, b) => {
      const seatNoA = Number(a['Seat No']) || 0
      const seatNoB = Number(b['Seat No']) || 0
      return seatNoA - seatNoB
    })
}

export function downloadSeatingExcel(results, filename) {
  const rows = buildExportRows(results)
  if (!rows.length) return false

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seating')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, filename ?? `GRIT-Seating-${stamp}.xlsx`)
  return true
}
