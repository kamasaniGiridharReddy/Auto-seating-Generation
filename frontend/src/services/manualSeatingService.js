/**
 * Manual Seating Studio — layout, student assignment, validation, results export.
 */

import { generateAllRoomsBenchPreview } from '../utils/seatingNumbers'
import {
  getCodeForSkill,
  getFullSkillForCode,
  normalizeSkillName,
} from '../utils/skillMapping'

export const MANUAL_SEATING_VERSION = 1

function seatId(classroomId, benchNumber, seatIndex) {
  return `${classroomId}-${benchNumber}-${seatIndex}`
}

function rowColFromBench(benchNumber, columns) {
  const idx = benchNumber - 1
  return { row: Math.floor(idx / columns), col: idx % columns }
}

/** Build empty layout seats from dashboard classroom config. */
export function buildEmptyLayout(classrooms = []) {
  const previews = generateAllRoomsBenchPreview(classrooms)
  const layoutSeats = []

  previews.forEach((room) => {
    const classroom = classrooms.find((c) => c.id === room.roomId)
    room.benches.forEach((bench) => {
      bench.seatNumbers.forEach((seatingNo, seatIndex) => {
        const { row, col } = rowColFromBench(bench.benchNumber, room.columns)
        layoutSeats.push({
          id: seatId(room.roomId, bench.benchNumber, seatIndex),
          classroomId: room.roomId,
          roomNumber: room.roomNumber,
          benchNumber: bench.benchNumber,
          benchLabel: `B${bench.benchNumber}`,
          row,
          col,
          seatIndex,
          seatingNo,
          skillCode: '',
          studentName: '',
          studentUid: '',
          niatId: '',
          bookingId: '',
          skill: '',
          contestDate: '',
          timeSlot: '',
        })
      })
    })
  })

  return {
    version: MANUAL_SEATING_VERSION,
    layoutSeats,
    groupAssignments: {},
    activeGroupKey: null,
  }
}

/** Slot groups from CSV rows. */
export function extractSlotGroups(rows = []) {
  const map = new Map()
  for (const row of rows) {
    const contestDate = String(row['Contest Date'] ?? '').trim()
    const timeSlot = String(row['Time Slot'] ?? '').trim()
    const key = `${contestDate}|${timeSlot}`
    if (!map.has(key)) {
      map.set(key, { groupKey: key, contestDate, timeSlot, students: [] })
    }
    map.get(key).students.push(row)
  }
  return [...map.values()].sort((a, b) => {
    const d = a.contestDate.localeCompare(b.contestDate)
    return d !== 0 ? d : a.timeSlot.localeCompare(b.timeSlot)
  })
}

export function mergeSeatsForGroup(state, groupKey) {
  const assignments = state.groupAssignments?.[groupKey] ?? {}
  return (state.layoutSeats ?? []).map((seat) => ({
    ...seat,
    ...(assignments[seat.id] ?? {}),
  }))
}

export function updateSeatSkillCode(state, seatIdKey, skillCode) {
  const code = String(skillCode ?? '').trim().toUpperCase()
  return {
    ...state,
    layoutSeats: state.layoutSeats.map((s) =>
      s.id === seatIdKey ? { ...s, skillCode: code } : s,
    ),
  }
}

export function updateGroupSeat(state, groupKey, seatIdKey, patch) {
  const prev = state.groupAssignments?.[groupKey] ?? {}
  const prevSeat = prev[seatIdKey] ?? {}
  return {
    ...state,
    groupAssignments: {
      ...state.groupAssignments,
      [groupKey]: {
        ...prev,
        [seatIdKey]: { ...prevSeat, ...patch },
      },
    },
  }
}

export function clearLayoutSkillCodes(state) {
  return {
    ...state,
    layoutSeats: state.layoutSeats.map((s) => ({ ...s, skillCode: '' })),
  }
}

export function resetGroupStudents(state, groupKey) {
  if (!groupKey) {
    return { ...state, groupAssignments: {} }
  }
  const next = { ...state.groupAssignments }
  delete next[groupKey]
  return { ...state, groupAssignments: next }
}

export function resetAllStudents(state) {
  return { ...state, groupAssignments: {} }
}

/** FIFO auto-fill students into seats by skill code match. */
export function autoFillStudents(state, csvRows, mappingRecord, groupKey = null) {
  const groups = groupKey
    ? extractSlotGroups(csvRows).filter((g) => g.groupKey === groupKey)
    : extractSlotGroups(csvRows)

  let next = { ...state, groupAssignments: { ...state.groupAssignments } }

  for (const group of groups) {
    const merged = mergeSeatsForGroup(next, group.groupKey)
    const seatsByCode = new Map()
    for (const seat of merged) {
      const code = String(seat.skillCode ?? '').trim().toUpperCase()
      if (!code) continue
      if (!seatsByCode.has(code)) seatsByCode.set(code, [])
      seatsByCode.get(code).push(seat)
    }
    for (const [, list] of seatsByCode) {
      list.sort((a, b) => a.seatingNo - b.seatingNo)
    }

    const queues = new Map()
    for (const row of group.students) {
      const code = getCodeForSkill(row.Skill, mappingRecord)
      const key = String(code).trim().toUpperCase()
      if (!queues.has(key)) queues.set(key, [])
      queues.get(key).push(row)
    }

    const assignments = {}
    for (const [code, seats] of seatsByCode) {
      const queue = queues.get(code) ?? []
      for (let i = 0; i < seats.length; i++) {
        const student = queue.shift()
        if (!student) {
          assignments[seats[i].id] = {
            studentName: '',
            studentUid: '',
            niatId: '',
            bookingId: '',
            skill: '',
            contestDate: group.contestDate,
            timeSlot: group.timeSlot,
          }
          continue
        }
        assignments[seats[i].id] = {
          studentName: student['Student Name'] ?? '',
          studentUid: student['Student UID'] ?? '',
          niatId: student['NIAT ID'] ?? '',
          bookingId: student['Booking ID'] ?? '',
          skill: normalizeSkillName(student.Skill),
          contestDate: group.contestDate,
          timeSlot: group.timeSlot,
        }
      }
    }

    next = {
      ...next,
      groupAssignments: {
        ...next.groupAssignments,
        [group.groupKey]: assignments,
      },
      activeGroupKey: next.activeGroupKey ?? group.groupKey,
    }
  }

  return next
}

export function swapStudents(state, groupKey, seatIdA, seatIdB) {
  const prev = state.groupAssignments?.[groupKey] ?? {}
  const a = prev[seatIdA] ?? {}
  const b = prev[seatIdB] ?? {}
  return {
    ...state,
    groupAssignments: {
      ...state.groupAssignments,
      [groupKey]: {
        ...prev,
        [seatIdA]: { ...b },
        [seatIdB]: { ...a },
      },
    },
  }
}

export function moveStudent(state, groupKey, fromSeatId, toSeatId) {
  const prev = state.groupAssignments?.[groupKey] ?? {}
  const from = prev[fromSeatId] ?? {}
  const to = prev[toSeatId] ?? {}
  return {
    ...state,
    groupAssignments: {
      ...state.groupAssignments,
      [groupKey]: {
        ...prev,
        [fromSeatId]: { ...to },
        [toSeatId]: { ...from },
      },
    },
  }
}

function benchHasSkillCode(seats, benchNumber, skillCode, excludeId) {
  const code = String(skillCode ?? '').trim().toUpperCase()
  if (!code) return false
  return seats.some(
    (s) =>
      s.id !== excludeId &&
      s.benchNumber === benchNumber &&
      String(s.skillCode ?? '').trim().toUpperCase() === code,
  )
}

function adjacentBenchHasSkill(seats, benchNumber, columns, skillCode, side, excludeId) {
  const { row, col } = rowColFromBench(benchNumber, columns)
  let targetBench = null
  if (side === 'left' && col > 0) targetBench = benchNumber - 1
  if (side === 'right' && col < columns - 1) targetBench = benchNumber + 1
  if (!targetBench) return false
  const code = String(skillCode ?? '').trim().toUpperCase()
  return seats.some(
    (s) =>
      s.id !== excludeId &&
      s.benchNumber === targetBench &&
      String(s.skillCode ?? '').trim().toUpperCase() === code,
  )
}

function frontBackBenchHasSkill(seats, benchNumber, columns, rows, skillCode, deltaRow, excludeId) {
  const { row, col } = rowColFromBench(benchNumber, columns)
  const targetRow = row + deltaRow
  if (targetRow < 0 || targetRow >= rows) return false
  const targetBench = targetRow * columns + col + 1
  const code = String(skillCode ?? '').trim().toUpperCase()
  return seats.some(
    (s) =>
      s.id !== excludeId &&
      s.benchNumber === targetBench &&
      String(s.skillCode ?? '').trim().toUpperCase() === code,
  )
}

/** Validation warnings — never blocks. */
export function validateManualLayout(seats, roomConfig) {
  const warnings = []
  const columns = Number(roomConfig?.columns) || 1
  const rows = Number(roomConfig?.rows) || 1

  for (const seat of seats) {
    const code = String(seat.skillCode ?? '').trim().toUpperCase()
    if (!code) continue

    if (benchHasSkillCode(seats, seat.benchNumber, code, seat.id)) {
      warnings.push({
        type: 'same-bench',
        message: `Seat ${seat.seatingNo} (B${seat.benchNumber}): same skill "${code}" on same bench`,
        seatId: seat.id,
      })
    }
    if (adjacentBenchHasSkill(seats, seat.benchNumber, columns, code, 'left', seat.id)) {
      warnings.push({
        type: 'side',
        message: `Seat ${seat.seatingNo}: same skill "${code}" on left bench`,
        seatId: seat.id,
      })
    }
    if (adjacentBenchHasSkill(seats, seat.benchNumber, columns, code, 'right', seat.id)) {
      warnings.push({
        type: 'side',
        message: `Seat ${seat.seatingNo}: same skill "${code}" on right bench`,
        seatId: seat.id,
      })
    }
    if (frontBackBenchHasSkill(seats, seat.benchNumber, columns, rows, code, -1, seat.id)) {
      warnings.push({
        type: 'front',
        message: `Seat ${seat.seatingNo}: same skill "${code}" on front bench`,
        seatId: seat.id,
      })
    }
    if (frontBackBenchHasSkill(seats, seat.benchNumber, columns, rows, code, 1, seat.id)) {
      warnings.push({
        type: 'back',
        message: `Seat ${seat.seatingNo}: same skill "${code}" on back bench`,
        seatId: seat.id,
      })
    }
  }

  return warnings
}

export function validateAllRooms(state, classrooms) {
  const allWarnings = []
  const groupKeys = Object.keys(state.groupAssignments ?? {})
  const keys = groupKeys.length ? groupKeys : state.activeGroupKey ? [state.activeGroupKey] : ['']

  for (const gk of keys) {
    const merged = gk ? mergeSeatsForGroup(state, gk) : state.layoutSeats
    for (const room of classrooms) {
      const roomSeats = merged.filter((s) => s.classroomId === room.id)
      const w = validateManualLayout(roomSeats, room)
      allWarnings.push(...w.map((x) => ({ ...x, groupKey: gk })))
    }
  }
  if (!groupKeys.length && state.layoutSeats?.length) {
    for (const room of classrooms) {
      const roomSeats = state.layoutSeats.filter((s) => s.classroomId === room.id)
      allWarnings.push(...validateManualLayout(roomSeats, room))
    }
  }
  const seen = new Set()
  return allWarnings.filter((w) => {
    const k = `${w.seatId}-${w.type}-${w.message}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function seatToAssignment(seat, mappingRecord) {
  const skillCode = String(seat.skillCode ?? '').trim().toUpperCase()
  const fullSkill =
    seat.skill || getFullSkillForCode(skillCode, mappingRecord) || skillCode
  return {
    benchNumber: seat.benchNumber,
    benchLabel: seat.benchLabel ?? `B${seat.benchNumber}`,
    row: seat.row,
    col: seat.col,
    seatIndex: seat.seatIndex,
    seatingNo: seat.seatingNo,
    skillCode,
    skill: fullSkill,
    studentName: seat.studentName ?? '',
    studentUid: seat.studentUid ?? '',
    niatId: seat.niatId ?? '',
    bookingId: seat.bookingId ?? '',
    roomNo: seat.roomNumber,
    roomNumber: seat.roomNumber,
    classroomId: seat.classroomId,
    contestDate: seat.contestDate ?? '',
    timeSlot: seat.timeSlot ?? '',
    section: '',
  }
}

/** Build results payload for Results page / export. */
export function buildManualResultsPayload(state, classrooms, mappingRecord, csvRows = []) {
  const slotGroups = extractSlotGroups(csvRows)
  const groupKeys =
    Object.keys(state.groupAssignments ?? {}).length > 0
      ? Object.keys(state.groupAssignments)
      : slotGroups.map((g) => g.groupKey)

  if (!groupKeys.length) {
    groupKeys.push('manual-default')
  }

  const groups = groupKeys.map((groupKey) => {
    const [contestDate = '', timeSlot = ''] = groupKey.split('|')
    const merged = mergeSeatsForGroup(state, groupKey)
    const assignments = merged
      .filter((s) => s.skillCode || s.studentName)
      .map((s) => seatToAssignment(s, mappingRecord))

    const roomResults = classrooms.map((room) => {
      const roomAssignments = assignments.filter((a) => a.classroomId === room.id)
      return {
        room,
        success: true,
        assignments: roomAssignments,
        unassigned: [],
        rows: Number(room.rows),
        cols: Number(room.columns),
        capacity: Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench),
      }
    })

    const assigned = assignments.filter((a) => a.studentName).length
    const totalSeats = merged.filter((s) => s.skillCode).length

    return {
      groupKey,
      contestDate: contestDate || 'Manual',
      timeSlot: timeSlot || 'Session',
      success: true,
      assignments,
      unassigned: [],
      roomResults,
      message: null,
      seatCapacity: merged.length,
      studentCount: assigned,
      source: 'manual-studio',
    }
  })

  const totalAssigned = groups.reduce(
    (n, g) => n + g.assignments.filter((a) => a.studentName).length,
    0,
  )

  return {
    success: true,
    source: 'manual-studio',
    configErrors: [],
    config: { classrooms, totalCapacity: state.layoutSeats?.length ?? 0 },
    groups,
    summary: {
      slotGroupCount: groups.length,
      totalStudents: csvRows.length || totalAssigned,
      totalAssigned,
      totalUnassigned: 0,
      totalAdjacentConflicts: 0,
      fullySeatedGroups: groups.length,
      classroomCount: classrooms.length,
    },
    generatedAt: new Date().toISOString(),
    manualVersion: MANUAL_SEATING_VERSION,
  }
}

export function sortManualAssignments(assignments) {
  return [...assignments].sort((a, b) => {
    const room = String(a.roomNumber ?? '').localeCompare(String(b.roomNumber ?? ''))
    if (room !== 0) return room
    if (a.benchNumber !== b.benchNumber) return a.benchNumber - b.benchNumber
    return (a.seatIndex ?? 0) - (b.seatIndex ?? 0)
  })
}

export { seatId, rowColFromBench }
