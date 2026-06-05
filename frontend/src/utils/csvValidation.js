import { CSV_COLUMNS, STUDENT_UID_COLUMN } from './constants'

function normalizeHeader(h) {
  return String(h ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeRows(rawRows, headers) {
  const normalizedHeaders = headers.map(normalizeHeader)
  const headerMap = {}

  CSV_COLUMNS.forEach((col) => {
    const idx = normalizedHeaders.findIndex((h) => h.toLowerCase() === col.toLowerCase())
    if (idx >= 0) headerMap[col] = headers[idx]
  })

  const missingColumns = CSV_COLUMNS.filter((col) => !headerMap[col])

  if (missingColumns.length > 0) {
    return {
      rows: [],
      missingColumns,
      errors: [`Missing required column(s): ${missingColumns.join(', ')}`],
      warnings: [],
    }
  }

  const rows = rawRows.map((raw, index) => {
    const row = { _rowIndex: index + 2 }
    CSV_COLUMNS.forEach((col) => {
      const key = headerMap[col]
      row[col] = String(raw[key] ?? '').trim()
    })
    return row
  })

  return { rows, missingColumns: [], errors: [], warnings: [] }
}

export function validateStudentRows(rows) {
  const errors = []
  const warnings = []
  const emptyValueRows = []
  const idCounts = new Map()

  rows.forEach((row) => {
    const uid = row[STUDENT_UID_COLUMN]
    const emptyFields = CSV_COLUMNS.filter((col) => !row[col])
    if (emptyFields.length > 0) {
      emptyValueRows.push({
        rowIndex: row._rowIndex,
        fields: emptyFields,
      })
    }
    if (uid) {
      idCounts.set(uid, (idCounts.get(uid) || 0) + 1)
    }
  })

  const duplicateIds = []
  idCounts.forEach((count, id) => {
    if (count > 1) duplicateIds.push(id)
  })

  if (emptyValueRows.length > 0) {
    warnings.push(
      `${emptyValueRows.length} row(s) have empty values in required fields.`,
    )
  }

  if (duplicateIds.length > 0) {
    const ids = duplicateIds.slice(0, 5).join(', ')
    const suffix = duplicateIds.length > 5 ? ` and ${duplicateIds.length - 5} more` : ''
    warnings.push(`Duplicate ${STUDENT_UID_COLUMN}(s) found: ${ids}${suffix}.`)
  }

  if (rows.length === 0) {
    errors.push('CSV file contains no student rows.')
  }

  return {
    errors,
    warnings,
    emptyValueRows,
    duplicateIds,
    summary: computeSummary(rows),
  }
}

export function computeSummary(rows) {
  const skills = new Set()
  const sections = new Set()
  const slotGroups = new Set()

  rows.forEach((r) => {
    if (r.Skill) skills.add(r.Skill)
    if (r.Section) sections.add(r.Section)
    if (r['Contest Date'] && r['Time Slot']) {
      slotGroups.add(`${r['Contest Date']}|${r['Time Slot']}`)
    }
  })

  return {
    totalStudents: rows.length,
    skillsCount: skills.size,
    sectionCount: sections.size,
    slotGroupCount: slotGroups.size,
    // legacy key for components still reading classroomCount
    classroomCount: slotGroups.size,
  }
}
