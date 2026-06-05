import * as XLSX from 'xlsx'
import { buildManualResultsPayload, sortManualAssignments } from '../services/manualSeatingService'

const MANUAL_EXPORT_COLUMNS = [
  'Bench No',
  'Seating no',
  'Student Name',
  'NIAT ID',
  'Room NO',
  'Skill Code',
  'Skill',
]

export function buildManualExportRows(results) {
  if (!results?.groups) return []
  const rows = []
  for (const group of results.groups) {
    const sorted = sortManualAssignments(group.assignments ?? [])
    for (const a of sorted) {
      rows.push({
        'Bench No': a.benchLabel ?? `B${a.benchNumber}`,
        'Seating no': a.seatingNo ?? '',
        'Student Name': a.studentName ?? '',
        'NIAT ID': a.niatId ?? '',
        'Room NO': a.roomNo ?? a.roomNumber ?? '',
        'Skill Code': a.skillCode ?? '',
        Skill: a.skill ?? '',
      })
    }
  }
  return rows
}

export function downloadManualSeatingExcel(results, filename) {
  const rows = buildManualExportRows(results)
  if (!rows.length) return false

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: MANUAL_EXPORT_COLUMNS })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Manual Seating')

  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, filename ?? `GRIT-Manual-Seating-${stamp}.xlsx`)
  return true
}

export function downloadManualSeatingExcelFromState(state, mappingRecord, classrooms, csvRows) {
  const payload = buildManualResultsPayload(state, classrooms, mappingRecord, csvRows)
  return downloadManualSeatingExcel(payload)
}
