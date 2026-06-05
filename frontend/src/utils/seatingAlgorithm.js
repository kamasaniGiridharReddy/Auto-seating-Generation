/**
 * Three-phase seating: strict anti-copy → multi-retry shuffle → bench-only fallback.
 * Same-bench rule is never relaxed; front/back may relax only in phase 3.
 */

import { distributeStudentsAcrossRooms } from './roomDistribution'

export const SEATING_LOGIC_VERSION = 18
export const CLASSROOM_LAYOUT_VERSION = 1
export const SEATING_NUMBERING_VERSION = 3

export const MAX_RETRIES = 12
export const PHASE2_GROUP_ATTEMPTS = 80
export const GENERATION_TIMEOUT_MS = 12000
export const PER_ROOM_TIME_MS = 6000
export const BACKTRACK_NODE_LIMIT = 100000

const RULE_STRICT = 'strict'
const RULE_BENCH_ONLY = 'bench-only'
const RULE_BENCH_ONLY_RELAX_ADJACENT = 'bench-only-relax-adjacent'

export function normalizeSkill(skill) {
  return String(skill ?? '').trim().toLowerCase()
}

export function computeGridDimensions(totalBenches) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalBenches)))
  const rows = Math.ceil(totalBenches / cols)
  return { cols, rows }
}

export function buildSeatPositionsForRoom(room) {
  const rows = Number(room.rows)
  const columns = Number(room.columns)
  const studentsPerBench = Number(room.studentsPerBench)
  const positions = []
  let benchNumber = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      for (let seatIndex = 0; seatIndex < studentsPerBench; seatIndex++) {
        positions.push({
          benchNumber,
          benchLabel: `Bench ${benchNumber}`,
          row,
          col,
          seatIndex,
          benchIndex: benchNumber - 1,
        })
      }
      benchNumber++
    }
  }

  return { positions, cols: columns, rows }
}

export function createEmptyGrid(rows, cols, studentsPerBench) {
  const grid = []
  for (let r = 0; r < rows; r++) {
    grid[r] = []
    for (let c = 0; c < cols; c++) {
      grid[r][c] = Array(studentsPerBench).fill(null)
    }
  }
  return grid
}

function benchExists(grid, row, col) {
  return row >= 0 && row < grid.length && col >= 0 && col < (grid[0]?.length ?? 0)
}

function getBenchOccupants(grid, row, col) {
  if (!benchExists(grid, row, col)) return []
  return grid[row][col].filter(Boolean)
}

function getSeatOccupant(grid, row, col, seatIndex) {
  if (!benchExists(grid, row, col)) return null
  const seat = grid[row][col][seatIndex]
  return seat || null
}

function seatHasSkill(grid, row, col, seatIndex, normalizedSkill) {
  if (!normalizedSkill || !benchExists(grid, row, col)) return false
  const occupant = getSeatOccupant(grid, row, col, seatIndex)
  if (!occupant) return false
  return normalizeSkill(occupant.skill ?? occupant.Skill) === normalizedSkill
}

function benchHasSkill(grid, row, col, normalizedSkill) {
  if (!normalizedSkill) return false
  return getBenchOccupants(grid, row, col).some(
    (o) => normalizeSkill(o.skill ?? o.Skill) === normalizedSkill,
  )
}

function seatOrderIndex(pos, studentsPerBench) {
  const benchIndex = Number(pos.benchIndex ?? (pos.benchNumber ?? 1) - 1)
  const seatIndex = Number(pos.seatIndex ?? 0)
  return benchIndex * studentsPerBench + seatIndex
}

/**
 * Rule: avoid same skill in consecutive seat order (Seat N and Seat N+1).
 * We model "consecutive seating numbers" as the room's deterministic seat order:
 * Bench 1 seat 0..spb-1, Bench 2 seat 0..spb-1, ...
 */
function passesConsecutiveSeatRule(grid, pos, skill, seatIndexToPos, studentsPerBench) {
  const normalized = normalizeSkill(skill)
  if (!normalized) return true
  if (!seatIndexToPos || typeof seatIndexToPos.get !== 'function') return true

  const idx = seatOrderIndex(pos, studentsPerBench)
  const prev = seatIndexToPos.get(idx - 1)
  const next = seatIndexToPos.get(idx + 1)

  if (prev) {
    const occ = getSeatOccupant(grid, prev.row, prev.col, prev.seatIndex)
    if (occ && normalizeSkill(occ.skill ?? occ.Skill) === normalized) return false
  }
  if (next) {
    const occ = getSeatOccupant(grid, next.row, next.col, next.seatIndex)
    if (occ && normalizeSkill(occ.skill ?? occ.Skill) === normalized) return false
  }

  return true
}

/**
 * Hard rules (anti-copy):
 * - Same bench: no duplicate skill on any seat
 * - Front/back: immediate row (same col) — entire bench blocked if skill exists anywhere on it
 * - Left/right: allowed
 */
export function passesHardRules(grid, pos, skill) {
  const normalized = normalizeSkill(skill)
  if (!normalized) return true

  const { row, col, seatIndex } = pos

  const benchSeats = grid[row][col]
  for (let i = 0; i < benchSeats.length; i++) {
    if (i === seatIndex) continue
    const other = benchSeats[i]
    if (other && normalizeSkill(other.skill ?? other.Skill) === normalized) return false
  }

  if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, normalized)) {
    return false
  }
  if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, normalized)) {
    return false
  }
  if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, normalized)) {
    return false
  }
  if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, normalized)) {
    return false
  }

  return true
}

/** Phase 3: same bench never; front/back allowed when needed to seat everyone. */
export function passesBenchOnlyRules(grid, pos, skill) {
  const normalized = normalizeSkill(skill)
  if (!normalized) return true

  const { row, col, seatIndex } = pos
  const benchSeats = grid[row][col]
  for (let i = 0; i < benchSeats.length; i++) {
    if (i === seatIndex) continue
    const other = benchSeats[i]
    if (other && normalizeSkill(other.skill ?? other.Skill) === normalized) return false
  }
  if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, normalized)) {
    return false
  }
  if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, normalized)) {
    return false
  }
  return true
}

function passesRulesForMode(grid, pos, skill, mode, seatIndexToPos, studentsPerBench) {
  const baseOk =
    mode === RULE_BENCH_ONLY || mode === RULE_BENCH_ONLY_RELAX_ADJACENT
      ? passesBenchOnlyRules(grid, pos, skill)
      : passesHardRules(grid, pos, skill)

  if (!baseOk) return false

  // Adjacent-seat rule is strict by default; only relaxed in the final guarantee mode.
  if (mode === RULE_BENCH_ONLY_RELAX_ADJACENT) return true
  return passesConsecutiveSeatRule(grid, pos, skill, seatIndexToPos, studentsPerBench)
}

/** @deprecated Use passesHardRules */
export function passesStrictRules(grid, pos, skill) {
  return passesHardRules(grid, pos, skill)
}

/** @deprecated Use passesHardRules */
export function passesIdealRules(grid, pos, skill) {
  return passesHardRules(grid, pos, skill)
}

/** @deprecated Use passesHardRules */
export function canPlaceStudent(grid, pos, skill) {
  return passesHardRules(grid, pos, skill)
}

export function placeStudentInGrid(grid, pos, student) {
  grid[pos.row][pos.col][pos.seatIndex] = student
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Dashboard classroom order → sort index (by id and room number). */
export function buildRoomOrderIndex(classrooms = []) {
  const map = new Map()
  classrooms.forEach((room, idx) => {
    if (room?.id != null) map.set(room.id, idx)
    const rn = String(room?.roomNumber ?? '').trim()
    if (rn) map.set(`room:${rn}`, idx)
  })
  return map
}

function roomSortKey(assignment, roomOrder) {
  if (assignment.classroomId != null && roomOrder.has(assignment.classroomId)) {
    return roomOrder.get(assignment.classroomId)
  }
  const rn = String(assignment.roomNo ?? assignment.roomNumber ?? '').trim()
  if (rn && roomOrder.has(`room:${rn}`)) return roomOrder.get(`room:${rn}`)
  const num = parseInt(rn.replace(/\D/g, ''), 10)
  return Number.isFinite(num) ? num : 9999
}

/** Room → row → column → seat index within bench. */
export function comparePhysicalSeat(a, b, roomOrder = new Map()) {
  const ra = roomSortKey(a, roomOrder)
  const rb = roomSortKey(b, roomOrder)
  if (ra !== rb) return ra - rb

  const rowA = Number(a.row ?? 0)
  const rowB = Number(b.row ?? 0)
  if (rowA !== rowB) return rowA - rowB

  const colA = Number(a.col ?? 0)
  const colB = Number(b.col ?? 0)
  if (colA !== colB) return colA - colB

  return Number(a.seatIndex ?? 0) - Number(b.seatIndex ?? 0)
}

/** Assign seating numbers from physical layout (continuous across rooms). */
export function assignSeatingNumbersByGeometry(assignments, startingSeatingNo = 1, classrooms = []) {
  const roomOrder = buildRoomOrderIndex(classrooms)
  const sorted = [...assignments].sort((a, b) => comparePhysicalSeat(a, b, roomOrder))
  let no = startingSeatingNo
  return sorted.map((a) => ({ ...a, seatingNo: no++ }))
}

function syncRoomResultAssignments(allAssignments, roomResults) {
  if (!roomResults?.length) return
  for (const rr of roomResults) {
    const room = rr.room
    if (!room) continue
    rr.assignments = allAssignments.filter(
      (a) =>
        a.classroomId === room.id ||
        String(a.roomNumber ?? a.roomNo ?? '') === String(room.roomNumber ?? ''),
    )
  }
}

function applyGeometrySeatingNumbers(groupResult, classrooms, startingSeatingNo = 1) {
  if (!groupResult?.assignments?.length) return groupResult
  const assignments = assignSeatingNumbersByGeometry(
    groupResult.assignments,
    startingSeatingNo,
    classrooms,
  )
  if (groupResult.roomResults?.length) {
    syncRoomResultAssignments(assignments, groupResult.roomResults)
  }
  return { ...groupResult, assignments }
}

function toAssignment(pos, student, roomMeta, seatingNo) {
  return {
    benchNumber: pos.benchNumber,
    benchLabel: pos.benchLabel,
    row: pos.row,
    col: pos.col,
    seatIndex: pos.seatIndex,
    seatingNo,
    studentName: student['Student Name'],
    skill: student.Skill,
    studentUid: student['Student UID'],
    bookingId: student['Booking ID'],
    niatId: student['NIAT ID'],
    roomNo: roomMeta.roomNumber,
    roomNumber: roomMeta.roomNumber,
    classroomId: roomMeta.id,
    section: student.Section,
    contestDate: student['Contest Date'],
    timeSlot: student['Time Slot'],
    skillLevel: student['Skill Level'],
    student,
  }
}

function isSeatEmpty(grid, pos) {
  return getSeatOccupant(grid, pos.row, pos.col, pos.seatIndex) === null
}

function getSeatIndexToPosMap(positions, studentsPerBench) {
  const m = new Map()
  for (const p of positions) {
    m.set(seatOrderIndex(p, studentsPerBench), p)
  }
  return m
}

function getValidPositionsForStudent(grid, positions, student, mode = RULE_STRICT, seatIndexToPos = null, studentsPerBench = null) {
  const spb = studentsPerBench ?? grid?.[0]?.[0]?.length ?? 1
  const idxMap = seatIndexToPos ?? getSeatIndexToPosMap(positions, spb)
  return positions.filter(
    (pos) =>
      isSeatEmpty(grid, pos) &&
      passesRulesForMode(grid, pos, student.Skill, mode, idxMap, spb),
  )
}

function orderPositionsForAttempt(positions, attempt) {
  if (attempt % 4 === 0) return positions
  if (attempt % 4 === 1) return shuffle([...positions])
  if (attempt % 4 === 2) {
    return [...positions].sort((a, b) => a.row - b.row || a.col - b.col || a.seatIndex - b.seatIndex)
  }
  return [...positions].sort((a, b) => b.row - a.row || b.col - a.col || a.seatIndex - b.seatIndex)
}

/** Closest same-skill bench in same column (front/back axis); Infinity if none. */
function minSameSkillColumnRowDistance(grid, row, col, skill) {
  const norm = normalizeSkill(skill)
  if (!norm) return 999
  let minD = Infinity
  const rows = grid.length
  for (let r = 0; r < rows; r++) {
    if (r === row) continue
    if (!benchHasSkill(grid, r, col, norm)) continue
    minD = Math.min(minD, Math.abs(r - row))
  }
  return minD
}

function countSameSkillInColumn(grid, col, skill, rows) {
  const norm = normalizeSkill(skill)
  let n = 0
  for (let r = 0; r < rows; r++) {
    if (benchHasSkill(grid, r, col, norm)) n++
  }
  return n
}

function countValidPositionsForSkill(grid, positions, skill, mode = RULE_STRICT) {
  const norm = normalizeSkill(skill)
  if (!norm) return 0
  const spb = grid?.[0]?.[0]?.length ?? 1
  const idxMap = getSeatIndexToPosMap(positions, spb)
  return positions.filter(
    (pos) => isSeatEmpty(grid, pos) && passesRulesForMode(grid, pos, skill, mode, idxMap, spb),
  ).length
}

/**
 * Higher = better. Stripe same skill on alternating rows (front/back axis); partial benches OK.
 */
function scorePlacementPosition(grid, pos, student, positions, rows, cols, studentsPerBench) {
  if (!passesHardRules(grid, pos, student.Skill)) return -Infinity

  const skill = normalizeSkill(student.Skill)
  const { row, col } = pos
  let score = 0

  // Invigilation preference: fill front/early benches first (but never break rules).
  // Row 0 is the front. Earlier benches = smaller (row, col, seatIndex).
  score += (rows - row) * 18
  score += (cols - col) * 4
  score -= seatOrderIndex(pos, studentsPerBench) * 0.35

  const colDist = minSameSkillColumnRowDistance(grid, row, col, skill)
  score += colDist === Infinity ? 220 : colDist * 65

  const onBench = getBenchOccupants(grid, row, col).length
  score += onBench * 28
  score += (studentsPerBench - onBench - 1) * 6

  score -= countSameSkillInColumn(grid, col, skill, rows) * 12

  if (row >= 2 && benchHasSkill(grid, row - 2, col, skill)) score += 25
  if (row + 2 < rows && benchHasSkill(grid, row + 2, col, skill)) score += 25

  const flexibility = countValidPositionsForSkill(grid, positions, student.Skill)
  score += flexibility * 6

  return score
}

function orderStudentsBySkillBlocks(students, largestFirst = true) {
  const bySkill = new Map()
  students.forEach((s) => {
    const k = normalizeSkill(s.Skill)
    if (!bySkill.has(k)) bySkill.set(k, [])
    bySkill.get(k).push(s)
  })
  const keys = [...bySkill.keys()].sort((a, b) => {
    const diff = bySkill.get(b).length - bySkill.get(a).length
    return largestFirst ? diff : -diff
  })
  const ordered = []
  keys.forEach((k) => ordered.push(...shuffle(bySkill.get(k))))
  return ordered
}

function orderStudentsForAttempt(students, attempt) {
  if (attempt % 3 === 1) return orderStudentsBySkillBlocks(students, false)
  if (attempt % 3 === 2) return orderStudentsBySkillBlocks(students, true)
  return shuffle(students)
}

function pickMRVStudent(remaining, grid, positions, mode = RULE_STRICT) {
  const skillRemain = {}
  remaining.forEach((s) => {
    const k = normalizeSkill(s.Skill)
    skillRemain[k] = (skillRemain[k] || 0) + 1
  })

  let chosen = null
  let fewestValid = Infinity

  for (const student of remaining) {
    const validCount = getValidPositionsForStudent(grid, positions, student, mode).length
    if (validCount === 0) continue

    if (validCount < fewestValid) {
      fewestValid = validCount
      chosen = student
    } else if (validCount === fewestValid && chosen) {
      const sk = normalizeSkill(student.Skill)
      const skBest = normalizeSkill(chosen.Skill)
      if ((skillRemain[sk] || 0) > (skillRemain[skBest] || 0)) chosen = student
    }
  }

  return chosen
}

function seatHasSameBenchConflict(grid, row, col, seatIndex) {
  const occupant = getSeatOccupant(grid, row, col, seatIndex)
  if (!occupant) return false
  const skill = normalizeSkill(occupant.skill ?? occupant.Skill)
  if (!skill) return false
  const benchSeats = grid[row][col]
  for (let i = 0; i < benchSeats.length; i++) {
    if (i === seatIndex) continue
    const other = benchSeats[i]
    if (other && normalizeSkill(other.skill ?? other.Skill) === skill) return true
  }
  return false
}

function seatHasSpacingViolation(grid, row, col, seatIndex) {
  const occupant = getSeatOccupant(grid, row, col, seatIndex)
  if (!occupant) return false
  const skill = normalizeSkill(occupant.skill ?? occupant.Skill)
  if (!skill) return false
  if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, skill)) return true
  if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, skill)) return true
  if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, skill)) return true
  if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, skill)) return true
  return false
}

function countGridViolations(grid) {
  let sameBench = 0
  let spacing = 0
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  const spb = grid[0]?.[0]?.length ?? 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let si = 0; si < spb; si++) {
        if (!getSeatOccupant(grid, r, c, si)) continue
        if (seatHasSameBenchConflict(grid, r, c, si)) sameBench++
        else if (seatHasSpacingViolation(grid, r, c, si)) spacing++
      }
    }
  }
  return { sameBench, spacing }
}

function packResult(assignments, unassigned, nextSeatingNo, grid, qualitySum, relaxedSpacing = false) {
  const { sameBench, spacing } = countGridViolations(grid)
  return {
    assignments,
    unassigned,
    nextSeatingNo,
    quality: sameBench > 0 ? -Infinity : qualitySum,
    conflicts: sameBench,
    spacingViolations: spacing,
    relaxedSpacing,
  }
}

function seatPlacementViolatesRules(grid, row, col, seatIndex) {
  const occupant = getSeatOccupant(grid, row, col, seatIndex)
  if (!occupant) return false

  const skill = normalizeSkill(occupant.skill ?? occupant.Skill)
  if (!skill) return false

  const benchSeats = grid[row][col]
  for (let i = 0; i < benchSeats.length; i++) {
    if (i === seatIndex) continue
    const other = benchSeats[i]
    if (other && normalizeSkill(other.skill ?? other.Skill) === skill) return true
  }

  if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, skill)) return true
  if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, skill)) return true
  if (benchExists(grid, row, col - 1) && benchHasSkill(grid, row, col - 1, skill)) return true
  if (benchExists(grid, row, col + 1) && benchHasSkill(grid, row, col + 1, skill)) return true

  return false
}

function countSkillConflicts(grid) {
  return countGridViolations(grid).sameBench
}

function isTimedOut(deadline) {
  return Date.now() >= deadline
}

function roomDeadline(globalDeadline) {
  return Math.min(globalDeadline, Date.now() + PER_ROOM_TIME_MS)
}

/** Row-major bench order: B1, B2, B3 … (front row left-to-right, then next row). */
export function buildSequentialBenchOrder(rows, cols) {
  const order = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      order.push({
        row: r,
        col: c,
        benchNumber: r * cols + c + 1,
        benchIndex: r * cols + c,
      })
    }
  }
  return order
}

/** First completely empty bench in B1…Bn order; no placements past it while students remain. */
function getFrontFirstMaxBenchIndex(grid, rows, cols) {
  const order = buildSequentialBenchOrder(rows, cols)
  for (let i = 0; i < order.length; i++) {
    const b = order[i]
    if (getBenchOccupants(grid, b.row, b.col).length === 0) return i
  }
  return order.length - 1
}

function filterPositionsFrontFirst(grid, positions, rows, cols) {
  const maxIdx = getFrontFirstMaxBenchIndex(grid, rows, cols)
  return positions.filter((pos) => {
    const idx = Number(pos.benchIndex ?? (pos.benchNumber ?? 1) - 1)
    return idx <= maxIdx
  })
}

function skillBucketsHasRemaining(skillBuckets) {
  for (const q of skillBuckets.values()) {
    if (q?.length) return true
  }
  return false
}

function placeStudentAtBestSeat(
  grid,
  positions,
  student,
  room,
  startingSeatingNo,
  assignments,
  rows,
  cols,
  studentsPerBench,
  mode = RULE_STRICT,
  frontFirst = true,
) {
  const seatIndexToPos = getSeatIndexToPosMap(positions, studentsPerBench)
  let valid = getValidPositionsForStudent(
    grid,
    positions,
    student,
    mode,
    seatIndexToPos,
    studentsPerBench,
  )
  if (frontFirst && rows != null && cols != null) {
    valid = filterPositionsFrontFirst(grid, valid, rows, cols)
  }
  if (!valid.length) return false

  const scored = valid
    .map((pos) => ({
      pos,
      score:
        mode === RULE_BENCH_ONLY
          ? scoreBenchOnlyPlacement(grid, pos, student, studentsPerBench)
          : scorePlacementPosition(grid, pos, student, positions, rows, cols, studentsPerBench),
    }))
    .sort((a, b) => b.score - a.score)

  const { pos, score } = scored[0]
  const entry = toAssignment(pos, student, room, startingSeatingNo + assignments.length)
  placeStudentInGrid(grid, pos, entry)
  assignments.push({ entry, score })
  return true
}

/**
 * Phase 3: seat remaining students — same bench forbidden; front/back allowed if needed.
 */
function finishRoomBenchOnlyFallback(existingAssignments, unassigned, room, startingSeatingNo) {
  if (!unassigned.length) {
    const { rows, cols } = buildSeatPositionsForRoom(room)
    const spb = Number(room.studentsPerBench)
    const grid = rebuildGridFromAssignments(existingAssignments, rows, cols, spb)
    return packResult(existingAssignments, [], startingSeatingNo + existingAssignments.length, grid, 0, true)
  }

  const studentsPerBench = Number(room.studentsPerBench)
  const { positions, cols, rows } = buildSeatPositionsForRoom(room)
  const grid = rebuildGridFromAssignments(existingAssignments, rows, cols, studentsPerBench)
  const seatIndexToPos = getSeatIndexToPosMap(positions, studentsPerBench)
  const assignments = [...existingAssignments]
  let qualitySum = 0
  let nextNo = startingSeatingNo + existingAssignments.length

  for (const student of shuffle(unassigned)) {
    const valid = filterPositionsFrontFirst(
      grid,
      getValidPositionsForStudent(
        grid,
        positions,
        student,
        RULE_BENCH_ONLY,
        seatIndexToPos,
        studentsPerBench,
      ),
      rows,
      cols,
    )
    if (!valid.length) continue

    const scored = valid
      .map((pos) => ({
        pos,
        score: scoreBenchOnlyPlacement(grid, pos, student, studentsPerBench),
      }))
      .sort((a, b) => b.score - a.score)

    const { pos, score } = scored[0]
    const entry = toAssignment(pos, student, room, nextNo++)
    placeStudentInGrid(grid, pos, entry)
    assignments.push(entry)
    qualitySum += score
  }

  const placedUids = new Set(assignments.map((a) => a.studentUid))
  const stillUnassigned = unassigned.filter((s) => !placedUids.has(s['Student UID']))

  return packResult(assignments, stillUnassigned, nextNo, grid, qualitySum, true)
}

/** Full-room bench-only plan (phase 3 last resort for a room). */
function planRoomBenchOnlyFull(students, room, startingSeatingNo, attempt = 0) {
  if (attempt % 4 === 0) {
    return planRoomSequential(students, room, startingSeatingNo, RULE_BENCH_ONLY, attempt)
  }

  const studentsPerBench = Number(room.studentsPerBench)
  const { positions: basePos, cols, rows } = buildSeatPositionsForRoom(room)
  const positions = orderPositionsForAttempt(basePos, attempt)
  const grid = createEmptyGrid(rows, cols, studentsPerBench)
  const assignments = []
  let remaining = shuffle(students)
  let qualitySum = 0
  const maxRounds = Math.max(students.length, positions.length) + 5

  for (let round = 0; round < maxRounds && remaining.length > 0; round++) {
    const nextRemaining = []
    let progress = false
    for (const student of round % 2 === 0 ? remaining : [...remaining].reverse()) {
      const placed = placeStudentAtBestSeat(
        grid,
        positions,
        student,
        room,
        startingSeatingNo,
        assignments,
        rows,
        cols,
        studentsPerBench,
        RULE_BENCH_ONLY,
        true,
      )
      if (placed) {
        qualitySum += assignments[assignments.length - 1].score
        progress = true
      } else {
        nextRemaining.push(student)
      }
    }
    remaining = nextRemaining
    if (!progress) break
  }

  const flat = assignments.map((a) => a.entry)
  const placedUids = new Set(flat.map((a) => a.studentUid))
  const unassigned = students.filter((s) => !placedUids.has(s['Student UID']))
  return packResult(flat, unassigned, startingSeatingNo + flat.length, grid, qualitySum, true)
}

/**
 * Multi-round fill: each pass tries every remaining student (opens seats for others later).
 */
function planRoomIterativeFill(students, room, startingSeatingNo, attempt = 0) {
  const studentsPerBench = Number(room.studentsPerBench)
  const { positions: basePos, cols, rows } = buildSeatPositionsForRoom(room)
  const positions = orderPositionsForAttempt(basePos, attempt)
  const seatIndexToPos = getSeatIndexToPosMap(positions, studentsPerBench)
  const grid = createEmptyGrid(rows, cols, studentsPerBench)
  const assignments = []
  let remaining = orderStudentsForAttempt(students, attempt)
  let qualitySum = 0
  const maxRounds = Math.max(students.length, positions.length) + 5

  for (let round = 0; round < maxRounds && remaining.length > 0; round++) {
    const nextRemaining = []
    let progress = false
    const order = round % 2 === 0 ? remaining : [...remaining].reverse()

    for (const student of order) {
      const placed = placeStudentAtBestSeat(
        grid,
        positions,
        student,
        room,
        startingSeatingNo,
        assignments,
        rows,
        cols,
        studentsPerBench,
      )
      if (placed) {
        qualitySum += assignments[assignments.length - 1].score
        progress = true
      } else {
        nextRemaining.push(student)
      }
    }

    remaining = nextRemaining
    if (!progress) break
  }

  const flat = assignments.map((a) => a.entry)
  const placedUids = new Set(flat.map((a) => a.studentUid))
  const unassigned = students.filter((s) => !placedUids.has(s['Student UID']))

  return packResult(flat, unassigned, startingSeatingNo + flat.length, grid, qualitySum)
}

function isBetterAttempt(next, best) {
  if (next.unassigned.length !== best.unassigned.length) {
    return next.unassigned.length - best.unassigned.length
  }
  if (next.conflicts !== best.conflicts) return next.conflicts - best.conflicts
  const nextSp = next.spacingViolations ?? 0
  const bestSp = best.spacingViolations ?? 0
  if (nextSp !== bestSp) return nextSp - bestSp
  if (next.assignments.length !== best.assignments.length) {
    return best.assignments.length - next.assignments.length
  }
  if (next.quality !== best.quality) return best.quality - next.quality
  return 0
}

function scoreBenchOnlyPlacement(grid, pos, student, studentsPerBench, rows = grid.length, cols = grid?.[0]?.length ?? 1) {
  if (!passesBenchOnlyRules(grid, pos, student.Skill)) return -Infinity
  let score = 0
  const skill = normalizeSkill(student.Skill)
  const { row, col } = pos

  // Invigilation preference: fill early benches first.
  score += (rows - row) * 16
  score += (cols - col) * 3
  score -= seatOrderIndex(pos, studentsPerBench) * 0.3

  const colDist = minSameSkillColumnRowDistance(grid, row, col, skill)
  score += colDist === Infinity ? 300 : colDist * 70

  const onBench = getBenchOccupants(grid, row, col).length
  score += onBench * 30
  score += (studentsPerBench - onBench - 1) * 8

  if (benchExists(grid, row - 1, col) && benchHasSkill(grid, row - 1, col, skill)) score -= 35
  if (benchExists(grid, row + 1, col) && benchHasSkill(grid, row + 1, col, skill)) score -= 35

  score -= countSameSkillInColumn(grid, col, skill, rows) * 10
  return score
}

function buildRoomStatesFromGroup(roomResults, classrooms) {
  return classrooms.map((room) => {
    const rr = roomResults.find((r) => r.room.id === room.id)
    const { rows, cols } = buildSeatPositionsForRoom(room)
    const spb = Number(room.studentsPerBench)
    const assignments = [...(rr?.assignments ?? [])]
    const grid = rebuildGridFromAssignments(assignments, rows, cols, spb)
    const { positions } = buildSeatPositionsForRoom(room)
    const cap = Number(room.rows) * Number(room.columns) * spb
    return { room, grid, positions, assignments, rows, cols, spb, cap, count: assignments.length }
  })
}

/** Exhaustive bench-only DFS — seats every student when any valid placement order exists. */
function bruteForceBenchOnlySeat(remaining, states, startSeatingNo) {
  if (!remaining.length) return { placed: [], success: true, nextSeatingNo: startSeatingNo }

  const ordered = [...remaining].sort((a, b) => {
    let ca = 0
    let cb = 0
    for (const st of states) {
      const idxMap = getSeatIndexToPosMap(st.positions, st.spb)
      ca += getValidPositionsForStudent(st.grid, st.positions, a, RULE_BENCH_ONLY, idxMap, st.spb).length
      cb += getValidPositionsForStudent(st.grid, st.positions, b, RULE_BENCH_ONLY, idxMap, st.spb).length
    }
    return ca - cb
  })

  const newEntries = []
  let nextNo = startSeatingNo

  function search(idx) {
    if (idx >= ordered.length) return true
    const student = ordered[idx]
    const options = []

    for (const st of states) {
      if (st.count >= st.cap) continue
      const idxMap = getSeatIndexToPosMap(st.positions, st.spb)
      for (const pos of filterPositionsFrontFirst(
        st.grid,
        getValidPositionsForStudent(
          st.grid,
          st.positions,
          student,
          RULE_BENCH_ONLY,
          idxMap,
          st.spb,
        ),
        st.rows,
        st.cols,
      )) {
        options.push({
          st,
          pos,
          score: scoreBenchOnlyPlacement(st.grid, pos, student, st.spb, st.rows),
        })
      }
    }

    if (!options.length) return false
    options.sort((a, b) => b.score - a.score)

    for (const { st, pos } of options) {
      const entry = toAssignment(pos, student, st.room, nextNo)
      placeStudentInGrid(st.grid, pos, entry)
      st.assignments.push(entry)
      st.count++
      newEntries.push(entry)
      nextNo++

      if (search(idx + 1)) return true

      newEntries.pop()
      nextNo--
      st.count--
      st.assignments.pop()
      st.grid[pos.row][pos.col][pos.seatIndex] = null
    }
    return false
  }

  if (search(0)) return { placed: newEntries, success: true, nextSeatingNo: nextNo }
  return { placed: [], success: false, nextSeatingNo: startSeatingNo }
}

/**
 * Final guarantee: seat all remaining students with bench-only rules (never same bench).
 */
function guaranteeFullSeatingBenchOnly(groupResult, students, classrooms, deadline) {
  let remaining = [...(groupResult.unassigned ?? [])]
  if (!remaining.length) return groupResult

  const totalCapacity = groupResult.capacity
  if (students.length > totalCapacity) return groupResult

  const roomResults = groupResult.roomResults.map((rr) => ({
    ...rr,
    assignments: [...(rr.assignments ?? [])],
  }))
  let allAssignments = [...groupResult.assignments]
  let relaxedSpacing = groupResult.relaxedSpacing ?? false
  let nextSeatingNo =
    allAssignments.length > 0 ? Math.max(...allAssignments.map((a) => a.seatingNo)) + 1 : 1

  for (let pass = 0; pass < 3 && remaining.length > 0 && !isTimedOut(deadline); pass++) {
    const states = buildRoomStatesFromGroup(roomResults, classrooms)

    for (const student of shuffle(remaining)) {
      if (isTimedOut(deadline)) break
      let best = null
      let bestScore = -Infinity

      for (const st of states) {
        if (st.count >= st.cap) continue
        const idxMap = getSeatIndexToPosMap(st.positions, st.spb)
        for (const pos of filterPositionsFrontFirst(
          st.grid,
          getValidPositionsForStudent(
            st.grid,
            st.positions,
            student,
            RULE_BENCH_ONLY,
            idxMap,
            st.spb,
          ),
          st.rows,
          st.cols,
        )) {
          const score = scoreBenchOnlyPlacement(st.grid, pos, student, st.spb, st.rows)
          if (score > bestScore) {
            bestScore = score
            best = { st, pos }
          }
        }
      }

      if (!best) continue

      const entry = toAssignment(best.pos, student, best.st.room, nextSeatingNo++)
      placeStudentInGrid(best.st.grid, best.pos, entry)
      best.st.assignments.push(entry)
      best.st.count++
      allAssignments.push(entry)
      relaxedSpacing = true
      remaining = remaining.filter((s) => s['Student UID'] !== student['Student UID'])

      const ri = roomResults.findIndex((r) => r.room.id === best.st.room.id)
      if (ri >= 0) roomResults[ri].assignments = best.st.assignments
    }

    if (remaining.length > 0 && !isTimedOut(deadline)) {
      const states2 = buildRoomStatesFromGroup(roomResults, classrooms)
      const bf = bruteForceBenchOnlySeat(remaining, states2, nextSeatingNo)
      if (bf.success) {
        for (const entry of bf.placed) {
          const ri = roomResults.findIndex((r) => r.room.id === entry.classroomId)
          if (ri >= 0 && !roomResults[ri].assignments.some((a) => a.studentUid === entry.studentUid)) {
            roomResults[ri].assignments.push(entry)
          }
        }
        const placedUids = new Set(bf.placed.map((e) => e.studentUid))
        allAssignments = allAssignments.filter((a) => !placedUids.has(a.studentUid)).concat(bf.placed)
        remaining = remaining.filter((s) => !placedUids.has(s['Student UID']))
        nextSeatingNo = bf.nextSeatingNo
        relaxedSpacing = true
      }
    }
  }

  // Absolute last resort: relax consecutive-seat rule (still never same-bench).
  if (remaining.length > 0 && !isTimedOut(deadline)) {
    const states = buildRoomStatesFromGroup(roomResults, classrooms)
    for (const student of shuffle(remaining)) {
      if (isTimedOut(deadline)) break
      let best = null
      let bestScore = -Infinity
      for (const st of states) {
        if (st.count >= st.cap) continue
        const idxMap = getSeatIndexToPosMap(st.positions, st.spb)
        for (const pos of filterPositionsFrontFirst(
          st.grid,
          getValidPositionsForStudent(
            st.grid,
            st.positions,
            student,
            RULE_BENCH_ONLY_RELAX_ADJACENT,
            idxMap,
            st.spb,
          ),
          st.rows,
          st.cols,
        )) {
          const score = scoreBenchOnlyPlacement(st.grid, pos, student, st.spb, st.rows)
          if (score > bestScore) {
            bestScore = score
            best = { st, pos }
          }
        }
      }
      if (!best) continue
      const entry = toAssignment(best.pos, student, best.st.room, nextSeatingNo++)
      placeStudentInGrid(best.st.grid, best.pos, entry)
      best.st.assignments.push(entry)
      best.st.count++
      allAssignments.push(entry)
      relaxedSpacing = true
      remaining = remaining.filter((s) => s['Student UID'] !== student['Student UID'])
      const ri = roomResults.findIndex((r) => r.room.id === best.st.room.id)
      if (ri >= 0) roomResults[ri].assignments = best.st.assignments
    }
  }

  if (remaining.length > 0 && !isTimedOut(deadline)) {
    for (let ri = 0; ri < roomResults.length; ri++) {
      const rr = roomResults[ri]
      const bucket = groupResult.buckets?.[ri]?.students ?? []
      const bucketUids = new Set(bucket.map((s) => s['Student UID']))
      const roomRemaining = remaining.filter((s) => bucketUids.has(s['Student UID']))
      if (!roomRemaining.length) continue

      const startNo =
        rr.assignments.length > 0 ? Math.min(...rr.assignments.map((a) => a.seatingNo)) : nextSeatingNo

      for (let a = 0; a < 12 && roomRemaining.some((s) => !rr.assignments.find((x) => x.studentUid === s['Student UID'])); a++) {
        const full = planRoomBenchOnlyFull(bucket, rr.room, startNo, a)
        if (full.conflicts === 0 && full.assignments.length >= bucket.length) {
          rr.assignments = full.assignments
          rr.relaxedSpacing = true
          relaxedSpacing = true
          const placed = new Set(full.assignments.map((x) => x.studentUid))
          allAssignments = allAssignments.filter((x) => x.classroomId !== rr.room.id).concat(full.assignments)
          remaining = remaining.filter((s) => !placed.has(s['Student UID']))
          break
        }
      }
    }
  }

  const placedUids = new Set(allAssignments.map((a) => a.studentUid))
  const finalUnassigned = students.filter((s) => !placedUids.has(s['Student UID']))

  roomResults.forEach((rr) => {
    rr.unassigned = students.filter(
      (s) =>
        (groupResult.buckets?.find((b) => b.room.id === rr.room.id)?.students ?? []).some(
          (b) => b['Student UID'] === s['Student UID'],
        ) && !placedUids.has(s['Student UID']),
    )
  })

  return {
    ...groupResult,
    assignments: allAssignments,
    unassigned: finalUnassigned,
    roomResults,
    relaxedSpacing,
  }
}

function rebuildGridFromAssignments(assignments, rows, cols, studentsPerBench) {
  const grid = createEmptyGrid(rows, cols, studentsPerBench)
  assignments.forEach((a) => placeStudentInGrid(grid, a, a))
  return grid
}

/**
 * Pattern planner: MRV + stripe scoring (not sequential bench fill).
 */
function planRoomPattern(students, room, startingSeatingNo, attempt = 0, pickAmongTop = 1) {
  const studentsPerBench = Number(room.studentsPerBench)
  const { positions: basePos, cols, rows } = buildSeatPositionsForRoom(room)
  const positions = orderPositionsForAttempt(basePos, attempt)
  const seatIndexToPos = getSeatIndexToPosMap(positions, studentsPerBench)
  const grid = createEmptyGrid(rows, cols, studentsPerBench)
  const assignments = []
  let remaining = orderStudentsForAttempt(students, attempt)
  let qualitySum = 0

  while (remaining.length > 0) {
    const chosenStudent = pickMRVStudent(remaining, grid, positions)
    if (!chosenStudent) break

    const validForChosen = getValidPositionsForStudent(
      grid,
      positions,
      chosenStudent,
      RULE_STRICT,
      seatIndexToPos,
      studentsPerBench,
    )
    if (!validForChosen.length) break

    const scored = validForChosen
      .map((pos) => ({
        pos,
        score: scorePlacementPosition(
          grid,
          pos,
          chosenStudent,
          positions,
          rows,
          cols,
          studentsPerBench,
        ),
      }))
      .sort((a, b) => b.score - a.score)

    const topN = scored.slice(0, Math.min(pickAmongTop, scored.length))
    const pick = topN[Math.floor(Math.random() * topN.length)]
    const { pos, score } = pick

    const entry = toAssignment(pos, chosenStudent, room, startingSeatingNo + assignments.length)
    placeStudentInGrid(grid, pos, entry)
    assignments.push(entry)
    qualitySum += score

    const uid = chosenStudent['Student UID']
    remaining = remaining.filter((s) => s['Student UID'] !== uid)
  }

  const placedUids = new Set(assignments.map((a) => a.studentUid))
  const unassigned = students.filter((s) => !placedUids.has(s['Student UID']))

  return packResult(assignments, unassigned, startingSeatingNo + assignments.length, grid, qualitySum)
}

/**
 * Bounded backtracking — finds full seating when pattern pass leaves gaps but capacity exists.
 */
function planRoomBacktrack(
  students,
  room,
  startingSeatingNo,
  deadline,
  nodeLimit = BACKTRACK_NODE_LIMIT,
  positionAttempt = 0,
) {
  const studentsPerBench = Number(room.studentsPerBench)
  const { positions: basePos, cols, rows } = buildSeatPositionsForRoom(room)
  const positions = orderPositionsForAttempt(basePos, positionAttempt)
  const seatIndexToPos = getSeatIndexToPosMap(positions, studentsPerBench)
  const grid = createEmptyGrid(rows, cols, studentsPerBench)
  const assignments = []
  const nodes = { count: 0 }
  let qualitySum = 0
  let bestSnapshot = {
    assignments: [],
    qualitySum: 0,
    grid: createEmptyGrid(rows, cols, studentsPerBench),
  }

  function saveBest() {
    if (assignments.length > bestSnapshot.assignments.length) {
      bestSnapshot = {
        assignments: assignments.map((a) => ({ ...a })),
        qualitySum,
        grid: grid.map((row) => row.map((bench) => [...bench])),
      }
    }
  }

  function search(remaining) {
    if (isTimedOut(deadline) || nodes.count >= nodeLimit) {
      saveBest()
      return false
    }

    saveBest()

    if (remaining.length === 0) return true

    const student = pickMRVStudent(remaining, grid, positions)
    if (!student) {
      saveBest()
      return false
    }

    const valid = filterPositionsFrontFirst(
      grid,
      getValidPositionsForStudent(
        grid,
        positions,
        student,
        RULE_STRICT,
        seatIndexToPos,
        studentsPerBench,
      ),
      rows,
      cols,
    )
      .map((pos) => ({
        pos,
        score: scorePlacementPosition(
          grid,
          pos,
          student,
          positions,
          rows,
          cols,
          studentsPerBench,
        ),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return (
          seatOrderIndex(a.pos, studentsPerBench) - seatOrderIndex(b.pos, studentsPerBench)
        )
      })

    const uid = student['Student UID']
    const rest = remaining.filter((s) => s['Student UID'] !== uid)

    for (const { pos, score } of valid) {
      nodes.count++
      const entry = toAssignment(pos, student, room, startingSeatingNo + assignments.length)
      placeStudentInGrid(grid, pos, entry)
      assignments.push(entry)
      qualitySum += score

      if (search(rest)) return true

      assignments.pop()
      grid[pos.row][pos.col][pos.seatIndex] = null
    }

    saveBest()
    return false
  }

  const orders = [
    () => orderStudentsBySkillBlocks(students, true),
    () => orderStudentsBySkillBlocks(students, false),
    () => shuffle(students),
  ]

  for (const orderFn of orders) {
    if (isTimedOut(deadline)) break
    assignments.length = 0
    qualitySum = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] = Array(studentsPerBench).fill(null)
      }
    }
    nodes.count = 0

    if (search(orderFn())) {
      return packResult(
        [...assignments],
        [],
        startingSeatingNo + assignments.length,
        grid,
        qualitySum,
      )
    }
  }

  const snap = bestSnapshot.assignments
  const placedUids = new Set(snap.map((a) => a.studentUid))
  const unassigned = students.filter((s) => !placedUids.has(s['Student UID']))
  return packResult(
    snap,
    unassigned,
    startingSeatingNo + snap.length,
    bestSnapshot.grid,
    bestSnapshot.qualitySum,
  )
}

function createSkillBuckets(students, shuffleSkillOrder = false) {
  const map = new Map()
  for (const s of students) {
    const k = normalizeSkill(s.Skill)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(s)
  }
  for (const [k, arr] of map) {
    arr.sort((a, b) => String(a['Student UID']).localeCompare(String(b['Student UID'])))
    map.set(k, arr)
  }
  let skillOrder = [...map.keys()].sort((a, b) => {
    const n = map.get(b).length - map.get(a).length
    return n !== 0 ? n : a.localeCompare(b)
  })
  if (shuffleSkillOrder) skillOrder = shuffle(skillOrder)
  return { map, skillOrder }
}

function tryPlaceAnyOnSeat(
  grid,
  pos,
  skillBuckets,
  skillOrder,
  room,
  startingSeatingNo,
  assignments,
  mode,
  seatIndexToPos,
  studentsPerBench,
  positions,
  rows,
  cols,
) {
  if (!isSeatEmpty(grid, pos)) return false

  for (const sk of skillOrder) {
    const q = skillBuckets.get(sk)
    if (!q?.length) continue
    for (let i = 0; i < q.length; i++) {
      const student = q[i]
      if (!passesRulesForMode(grid, pos, student.Skill, mode, seatIndexToPos, studentsPerBench)) {
        continue
      }
      const entry = toAssignment(pos, student, room, startingSeatingNo + assignments.length)
      placeStudentInGrid(grid, pos, entry)
      assignments.push(entry)
      q.splice(i, 1)
      return true
    }
  }
  return false
}

/**
 * Front-first planner: benches B1 → Bn in row-major order.
 * At least one student per bench before advancing; no skipping empty front/middle benches.
 */
function planRoomSequential(students, room, startingSeatingNo, mode = RULE_STRICT, attempt = 0) {
  const studentsPerBench = Number(room.studentsPerBench)
  const { positions, cols, rows } = buildSeatPositionsForRoom(room)
  const grid = createEmptyGrid(rows, cols, studentsPerBench)
  const assignments = []
  const benchOrder = buildSequentialBenchOrder(rows, cols)
  const seatIndexToPos = getSeatIndexToPosMap(positions, studentsPerBench)
  const { map: skillBuckets, skillOrder } = createSkillBuckets(students, attempt % 3 === 1)
  let quality = 0

  for (const b of benchOrder) {
    if (!skillBucketsHasRemaining(skillBuckets)) break

    for (let si = 0; si < studentsPerBench; si++) {
      if (!skillBucketsHasRemaining(skillBuckets)) break
      const pos = { ...b, seatIndex: si, benchLabel: `Bench ${b.benchNumber}` }
      if (!isSeatEmpty(grid, pos)) continue
      if (
        tryPlaceAnyOnSeat(
          grid,
          pos,
          skillBuckets,
          skillOrder,
          room,
          startingSeatingNo,
          assignments,
          mode,
          seatIndexToPos,
          studentsPerBench,
          positions,
          rows,
          cols,
        )
      ) {
        const last = assignments[assignments.length - 1]
        const placedStudent = last.student ?? { Skill: last.skill }
        quality +=
          mode === RULE_BENCH_ONLY || mode === RULE_BENCH_ONLY_RELAX_ADJACENT
            ? scoreBenchOnlyPlacement(grid, pos, placedStudent, studentsPerBench, rows, cols)
            : scorePlacementPosition(
                grid,
                pos,
                placedStudent,
                positions,
                rows,
                cols,
                studentsPerBench,
              )
      }
    }

    if (
      getBenchOccupants(grid, b.row, b.col).length === 0 &&
      skillBucketsHasRemaining(skillBuckets)
    ) {
      break
    }
  }

  const placedUids = new Set(assignments.map((a) => a.studentUid))
  const unassigned = students.filter((s) => !placedUids.has(s['Student UID']))
  return packResult(
    assignments,
    unassigned,
    startingSeatingNo + assignments.length,
    grid,
    quality,
    mode !== RULE_STRICT,
  )
}

/** Phase 1 strict seating only (no bench-only fallback). */
function allocateInRoomStrict(students, room, startingSeatingNo, deadline) {
  const { cols, rows } = buildSeatPositionsForRoom(room)
  const capacity =
    Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
  const dl = roomDeadline(deadline)

  if (students.length === 0) {
    return {
      assignments: [],
      unassigned: [],
      nextSeatingNo: startingSeatingNo,
      quality: 0,
      conflicts: 0,
      spacingViolations: 0,
      relaxedSpacing: false,
    }
  }

  let best = planRoomSequential(students, room, startingSeatingNo, RULE_STRICT)

  // Rare strict rescue if sequential front-first left unassigned despite spare seats.
  const emptySeats = capacity - best.assignments.length
  if (best.unassigned.length > 0 && emptySeats >= best.unassigned.length && !isTimedOut(dl)) {
    const bt = planRoomBacktrack(students, room, startingSeatingNo, dl, BACKTRACK_NODE_LIMIT, 0)
    if (isBetterAttempt(bt, best) < 0) best = bt
  }

  return { ...best, cols, rows, capacity, timedOut: isTimedOut(dl) }
}

function allocateInRoomFast(students, room, startingSeatingNo, deadline, options = {}) {
  const { cols, rows } = buildSeatPositionsForRoom(room)
  const capacity =
    Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
  const dl = roomDeadline(deadline)
  const allowFallback = options.allowFallback !== false

  if (students.length === 0) {
    return {
      success: true,
      assignments: [],
      unassigned: [],
      cols,
      rows,
      capacity,
      message: null,
      timedOut: false,
      relaxedSpacing: false,
    }
  }

  let best = allocateInRoomStrict(students, room, startingSeatingNo, dl)

  if (allowFallback && best.unassigned.length > 0 && !isTimedOut(dl)) {
    let fb = finishRoomBenchOnlyFallback(
      best.assignments,
      best.unassigned,
      room,
      startingSeatingNo,
    )
    if (isBetterAttempt(fb, best) < 0) best = { ...best, ...fb }

    if (fb.unassigned.length > 0 && !isTimedOut(dl)) {
      for (let a = 0; a < 8 && fb.unassigned.length > 0 && !isTimedOut(dl); a++) {
        const full = planRoomBenchOnlyFull(students, room, startingSeatingNo, a)
        if (isBetterAttempt(full, fb) < 0) fb = full
      }
      if (isBetterAttempt(fb, best) < 0) best = { ...best, ...fb }
    }
  }

  const timedOut = isTimedOut(dl)
  const success = best.unassigned.length === 0 && best.conflicts === 0
  let message = null
  if (best.unassigned.length > 0) {
    message = `Room ${room.roomNumber}: ${best.unassigned.length} student(s) unassigned.`
  } else if (best.relaxedSpacing) {
    message = `Room ${room.roomNumber}: all seated (minimal front/back spacing applied).`
  }
  if (timedOut) {
    message = message
      ? `${message} (time limit reached.)`
      : `Room ${room.roomNumber}: time limit reached.`
  }

  return {
    success,
    assignments: best.assignments,
    unassigned: best.unassigned,
    cols,
    rows,
    capacity,
    message,
    nextSeatingNo: best.nextSeatingNo,
    timedOut,
    relaxedSpacing: best.relaxedSpacing ?? false,
    spacingViolations: best.spacingViolations ?? 0,
  }
}

function isBetterGroupResult(next, best) {
  const nu = next.unassigned?.length ?? Infinity
  const bu = best.unassigned?.length ?? Infinity
  if (nu !== bu) return nu - bu

  const nc = next.totalConflicts ?? 0
  const bc = best.totalConflicts ?? 0
  if (nc !== bc) return nc - bc

  const ns = next.totalSpacingViolations ?? 0
  const bs = best.totalSpacingViolations ?? 0
  if (ns !== bs) return ns - bs

  const na = next.assignments?.length ?? 0
  const ba = best.assignments?.length ?? 0
  if (na !== ba) return ba - na

  return 0
}

function runGroupSeatingAttempt(students, classrooms, deadline, distAttempt, strictOnly) {
  const { buckets, unassigned: distUnassigned, targets, roomCounts } =
    distributeStudentsAcrossRooms(students, classrooms, { attempt: distAttempt })

  const allAssignments = []
  const roomResults = []
  let nextSeatingNo = 1
  const seatingUnassigned = [...distUnassigned]
  let totalConflicts = 0
  let totalSpacing = 0
  let relaxedSpacing = false
  let timedOut = false

  for (let roomIdx = 0; roomIdx < buckets.length; roomIdx++) {
    const { room, students: roomStudents } = buckets[roomIdx]
    const distTarget = targets[roomIdx] ?? 0
    const distCount = roomCounts[roomIdx] ?? roomStudents.length

    if (isTimedOut(deadline)) {
      timedOut = true
      seatingUnassigned.push(...roomStudents)
      continue
    }

    if (!roomStudents.length) {
      const { cols, rows } = buildSeatPositionsForRoom(room)
      const capacity =
        Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
      roomResults.push({
        room,
        success: true,
        assignments: [],
        unassigned: [],
        cols,
        rows,
        capacity,
        message: null,
        timedOut: false,
        distributionCount: distCount,
        distributionTarget: distTarget,
      })
      continue
    }

    const result = strictOnly
      ? (() => {
          const strict = allocateInRoomStrict(roomStudents, room, nextSeatingNo, deadline)
          const { cols, rows, capacity, timedOut: rt } = strict
          return {
            success: strict.unassigned.length === 0 && strict.conflicts === 0,
            assignments: strict.assignments,
            unassigned: strict.unassigned,
            cols,
            rows,
            capacity,
            message: null,
            nextSeatingNo: strict.nextSeatingNo,
            timedOut: rt,
            relaxedSpacing: false,
            spacingViolations: strict.spacingViolations ?? 0,
          }
        })()
      : allocateInRoomFast(roomStudents, room, nextSeatingNo, deadline, { allowFallback: false })

    if (result.timedOut) timedOut = true
    totalConflicts += countSkillConflicts(
      rebuildGridFromAssignments(
        result.assignments,
        result.rows,
        result.cols,
        Number(room.studentsPerBench),
      ),
    )
    totalSpacing += result.spacingViolations ?? 0
    if (result.relaxedSpacing) relaxedSpacing = true

    allAssignments.push(...result.assignments)
    nextSeatingNo = result.nextSeatingNo ?? nextSeatingNo
    seatingUnassigned.push(...result.unassigned)

    roomResults.push({
      room,
      ...result,
      assignments: result.assignments,
      distributionCount: distCount,
      distributionTarget: distTarget,
    })
  }

  const uniqueRemaining = seatingUnassigned.filter(
    (s, i, arr) => arr.findIndex((x) => x['Student UID'] === s['Student UID']) === i,
  )

  let totalCapacity = 0
  classrooms.forEach((room) => {
    totalCapacity += Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
  })

  return {
    assignments: allAssignments,
    unassigned: uniqueRemaining,
    roomResults,
    capacity: totalCapacity,
    timedOut,
    totalConflicts,
    totalSpacingViolations: totalSpacing,
    relaxedSpacing,
    buckets,
    distribution: { targets, roomCounts },
    distUnassignedCount: distUnassigned.length,
  }
}

function applyGroupPhase3Fallback(groupResult, students, classrooms, deadline) {
  if (groupResult.unassigned.length === 0) return groupResult

  const totalCapacity = groupResult.capacity
  if (students.length > totalCapacity) return groupResult

  const uidToRoomId = new Map()
  for (const { room, students: bucket } of groupResult.buckets ?? []) {
    for (const s of bucket) uidToRoomId.set(s['Student UID'], room.id)
  }

  let nextSeatingNo =
    groupResult.assignments.length > 0
      ? Math.max(...groupResult.assignments.map((a) => a.seatingNo)) + 1
      : 1

  const roomResults = [...groupResult.roomResults]
  let allAssignments = [...groupResult.assignments]
  let remaining = [...groupResult.unassigned]
  let relaxedSpacing = groupResult.relaxedSpacing

  for (let ri = 0; ri < roomResults.length && remaining.length > 0 && !isTimedOut(deadline); ri++) {
    const rr = roomResults[ri]
    const room = rr.room
    const toSeat = remaining.filter((s) => uidToRoomId.get(s['Student UID']) === room.id)
    if (!toSeat.length) continue

    const startNo =
      rr.assignments.length > 0
        ? Math.min(...rr.assignments.map((a) => a.seatingNo))
        : nextSeatingNo

    const fb = finishRoomBenchOnlyFallback(rr.assignments, toSeat, room, startNo)
    const placedBefore = new Set(rr.assignments.map((a) => a.studentUid))
    const newlyPlaced = fb.assignments.filter((a) => !placedBefore.has(a.studentUid))
    if (newlyPlaced.length > 0) {
      rr.assignments = fb.assignments
      rr.unassigned = fb.unassigned
      rr.relaxedSpacing = true
      rr.spacingViolations = fb.spacingViolations
      relaxedSpacing = true
      allAssignments = allAssignments.filter((a) => a.classroomId !== room.id).concat(fb.assignments)
      remaining = remaining.filter((s) => !fb.assignments.some((a) => a.studentUid === s['Student UID']))
      roomResults[ri] = rr
    }
  }

  if (remaining.length > 0 && !isTimedOut(deadline)) {
    const states = classrooms.map((room) => {
      const rr = roomResults.find((r) => r.room.id === room.id)
      const { rows, cols } = buildSeatPositionsForRoom(room)
      const spb = Number(room.studentsPerBench)
      const assignments = rr?.assignments ?? []
      const grid = rebuildGridFromAssignments(assignments, rows, cols, spb)
      const { positions } = buildSeatPositionsForRoom(room)
      const cap = Number(room.rows) * Number(room.columns) * spb
      return { room, grid, positions, assignments, rows, cols, spb, cap, count: assignments.length }
    })

    for (const student of shuffle(remaining)) {
      if (isTimedOut(deadline)) break
      let bestState = null
      let bestPos = null
      let bestScore = -Infinity

      for (const st of states) {
        if (st.count >= st.cap) continue
        const idxMap = getSeatIndexToPosMap(st.positions, st.spb)
        const valid = filterPositionsFrontFirst(
          st.grid,
          getValidPositionsForStudent(
            st.grid,
            st.positions,
            student,
            RULE_BENCH_ONLY,
            idxMap,
            st.spb,
          ),
          st.rows,
          st.cols,
        )
        for (const pos of valid) {
          const score = scoreBenchOnlyPlacement(st.grid, pos, student, st.spb, st.rows)
          if (score > bestScore) {
            bestScore = score
            bestState = st
            bestPos = pos
          }
        }
      }

      if (!bestState || !bestPos) continue

      const entry = toAssignment(bestPos, student, bestState.room, nextSeatingNo++)
      placeStudentInGrid(bestState.grid, bestPos, entry)
      bestState.assignments.push(entry)
      bestState.count++
      allAssignments.push(entry)
      relaxedSpacing = true
      remaining = remaining.filter((s) => s['Student UID'] !== student['Student UID'])

      const rrIdx = roomResults.findIndex((r) => r.room.id === bestState.room.id)
      if (rrIdx >= 0) {
        roomResults[rrIdx].assignments = bestState.assignments
        roomResults[rrIdx].relaxedSpacing = true
      }
    }
  }

  return {
    ...groupResult,
    assignments: allAssignments,
    unassigned: remaining,
    roomResults,
    relaxedSpacing,
    totalSpacingViolations: (groupResult.totalSpacingViolations ?? 0) + (relaxedSpacing ? 1 : 0),
  }
}

export function allocateInRoom(students, room, startingSeatingNo = 1, deadline = Date.now() + GENERATION_TIMEOUT_MS) {
  return allocateInRoomFast(students, room, startingSeatingNo, deadline)
}

function finalizeGroupAllocation(best, distUnassignedCount = 0, classrooms = []) {
  const finalized =
    classrooms?.length && best?.assignments?.length
      ? applyGeometrySeatingNumbers(best, classrooms)
      : best
  const uniqueRemaining = finalized.unassigned ?? []
  const success = uniqueRemaining.length === 0 && (finalized.totalConflicts ?? 0) === 0
  let message = null

  if (distUnassignedCount > 0) {
    message = `${distUnassignedCount} student(s) could not be assigned to a room (capacity).`
  }
  if (uniqueRemaining.length > 0) {
    const seatMsg = `${uniqueRemaining.length} student(s) could not be seated.`
    message = message ? `${message} ${seatMsg}` : seatMsg
  } else if (finalized.relaxedSpacing) {
    message = 'All students seated. Minimal front/back spacing used where required.'
  }
  if (finalized.timedOut) {
    message = message
      ? `${message} Generation stopped at time limit.`
      : 'Generation stopped at time limit — partial results kept.'
  }

  return {
    success,
    assignments: finalized.assignments,
    unassigned: uniqueRemaining,
    roomResults: finalized.roomResults,
    capacity: finalized.capacity,
    message,
    timedOut: finalized.timedOut ?? false,
    distribution: finalized.distribution,
    relaxedSpacing: finalized.relaxedSpacing ?? false,
  }
}

function allocateGroupMultiRoomPhased(students, classrooms, deadline) {
  let totalCapacity = 0
  classrooms.forEach((room) => {
    totalCapacity += Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
  })

  if (students.length > totalCapacity) {
    return {
      success: false,
      assignments: [],
      unassigned: [...students],
      roomResults: [],
      capacity: totalCapacity,
      message: `Need ${students.length} seats but only ${totalCapacity} across all rooms.`,
      timedOut: false,
    }
  }

  let best = runGroupSeatingAttempt(students, classrooms, deadline, 0, true)
  const distUnassignedCount = best.distUnassignedCount ?? 0

  if (best.unassigned.length > 0) {
    for (let attempt = 1; attempt < PHASE2_GROUP_ATTEMPTS; attempt++) {
      if (isTimedOut(deadline)) {
        best.timedOut = true
        break
      }
      const trial = runGroupSeatingAttempt(students, classrooms, deadline, attempt, true)
      if (isBetterGroupResult(trial, best) < 0) best = trial
      if (trial.unassigned.length === 0) break
    }
  }

  if (best.unassigned.length > 0) {
    best = applyGroupPhase3Fallback(best, students, classrooms, deadline)
  }

  if (best.unassigned.length > 0 && !isTimedOut(deadline)) {
    let changed = false
    for (let ri = 0; ri < best.roomResults.length; ri++) {
      const rr = best.roomResults[ri]
      const bucket = best.buckets?.[ri]?.students ?? []
      if (!bucket.length) continue
      const startNo =
        rr.assignments.length > 0
          ? Math.min(...rr.assignments.map((a) => a.seatingNo))
          : 1
      for (let a = 0; a < 12; a++) {
        const full = planRoomBenchOnlyFull(bucket, rr.room, startNo, ri + a)
        if (full.unassigned.length === 0 && full.conflicts === 0) {
          rr.assignments = full.assignments
          rr.unassigned = []
          rr.relaxedSpacing = true
          best.relaxedSpacing = true
          best.roomResults[ri] = rr
          changed = true
          break
        }
      }
    }
    if (changed) {
      best.assignments = best.roomResults.flatMap((rr) => rr.assignments)
      const placedUids = new Set(best.assignments.map((a) => a.studentUid))
      best.unassigned = students.filter((s) => !placedUids.has(s['Student UID']))
    }
  }

  if (best.unassigned.length > 0 && students.length <= totalCapacity) {
    best = guaranteeFullSeatingBenchOnly(best, students, classrooms, deadline)
  }

  return finalizeGroupAllocation(best, distUnassignedCount, classrooms)
}

export function allocateGroupMultiRoom(students, classrooms, deadline = Date.now() + GENERATION_TIMEOUT_MS) {
  return allocateGroupMultiRoomPhased(students, classrooms, deadline)
}

function yieldToMain() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/** Same as allocateGroupMultiRoom but yields during phase-2 retries for responsive UI. */
export async function allocateGroupMultiRoomAsync(
  students,
  classrooms,
  deadline = Date.now() + GENERATION_TIMEOUT_MS,
) {
  let totalCapacity = 0
  classrooms.forEach((room) => {
    totalCapacity += Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
  })

  if (students.length > totalCapacity) {
    return {
      success: false,
      assignments: [],
      unassigned: [...students],
      roomResults: [],
      capacity: totalCapacity,
      message: `Need ${students.length} seats but only ${totalCapacity} across all rooms.`,
      timedOut: false,
    }
  }

  await yieldToMain()
  let best = runGroupSeatingAttempt(students, classrooms, deadline, 0, true)
  const distUnassignedCount = best.distUnassignedCount ?? 0

  if (best.unassigned.length > 0) {
    for (let attempt = 1; attempt < PHASE2_GROUP_ATTEMPTS; attempt++) {
      await yieldToMain()
      if (isTimedOut(deadline)) {
        best.timedOut = true
        break
      }
      const trial = runGroupSeatingAttempt(students, classrooms, deadline, attempt, true)
      if (isBetterGroupResult(trial, best) < 0) best = trial
      if (trial.unassigned.length === 0) break
    }
  }

  await yieldToMain()
  if (best.unassigned.length > 0) {
    best = applyGroupPhase3Fallback(best, students, classrooms, deadline)
  }

  await yieldToMain()
  if (best.unassigned.length > 0 && !isTimedOut(deadline)) {
    let changed = false
    for (let ri = 0; ri < best.roomResults.length; ri++) {
      const rr = best.roomResults[ri]
      const bucket = best.buckets?.[ri]?.students ?? []
      if (!bucket.length) continue
      const startNo =
        rr.assignments.length > 0
          ? Math.min(...rr.assignments.map((a) => a.seatingNo))
          : 1
      for (let a = 0; a < 12; a++) {
        const full = planRoomBenchOnlyFull(bucket, rr.room, startNo, ri + a)
        if (full.unassigned.length === 0 && full.conflicts === 0) {
          rr.assignments = full.assignments
          rr.unassigned = []
          rr.relaxedSpacing = true
          best.relaxedSpacing = true
          best.roomResults[ri] = rr
          changed = true
          break
        }
      }
    }
    if (changed) {
      best.assignments = best.roomResults.flatMap((rr) => rr.assignments)
      const placedUids = new Set(best.assignments.map((a) => a.studentUid))
      best.unassigned = students.filter((s) => !placedUids.has(s['Student UID']))
    }
  }

  await yieldToMain()
  if (best.unassigned.length > 0 && students.length <= totalCapacity) {
    best = guaranteeFullSeatingBenchOnly(best, students, classrooms, deadline)
  }

  return finalizeGroupAllocation(best, distUnassignedCount, classrooms)
}

export function validateAssignments(assignments, studentsPerBench) {
  if (!assignments.length) return []

  const maxRow = Math.max(...assignments.map((x) => x.row))
  const maxCol = Math.max(...assignments.map((x) => x.col))
  const grid = createEmptyGrid(maxRow + 1, maxCol + 1, studentsPerBench)
  const issues = []

  assignments.forEach((item) => {
    placeStudentInGrid(grid, item, item)
  })

  assignments.forEach((a) => {
    const seatIdx = a.seatIndex ?? 0
    if (seatPlacementViolatesRules(grid, a.row, a.col, seatIdx)) {
      const skill = normalizeSkill(a.skill)
      const sameBench = getBenchOccupants(grid, a.row, a.col).filter(
        (o) => o !== a && normalizeSkill(o.skill) === skill,
      )
      if (sameBench.length) {
        issues.push(`${a.studentName}: same skill on ${a.benchLabel}`)
      } else if (benchHasSkill(grid, a.row - 1, a.col, skill)) {
        issues.push(`${a.studentName}: same skill on front bench`)
      } else if (benchHasSkill(grid, a.row + 1, a.col, skill)) {
        issues.push(`${a.studentName}: same skill on back bench`)
      }
    }
  })

  return [...new Set(issues)]
}
