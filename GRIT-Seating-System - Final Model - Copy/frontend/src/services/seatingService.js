import { allocateSeating, SEATING_LOGIC_VERSION, CLASSROOM_LAYOUT_VERSION, SEATING_NUMBERING_VERSION } from '../utils/seatingAlgorithmStrictNew'
import { loadClassroomConfig, getTotalCapacity } from '../utils/classroomStorage'

function validateConfig(studentRows, config) {
  const classrooms = config.classrooms ?? []
  const configErrors = []

  if (!classrooms.length) {
    configErrors.push('Add at least one classroom on the Dashboard.')
  }
  classrooms.forEach((room, i) => {
    if (!String(room.roomName ?? room.roomNumber ?? '').trim()) {
      configErrors.push(`Classroom ${i + 1}: enter a room name.`)
    }
    if (!Number(room.rows) || Number(room.rows) < 1) {
      configErrors.push(`Classroom ${i + 1}: set number of rows.`)
    }
    if (!Number(room.columns) || Number(room.columns) < 1) {
      configErrors.push(`Classroom ${i + 1}: set number of columns.`)
    }
    if (![1, 2, 3].includes(Number(room.studentsPerBench))) {
      configErrors.push(`Classroom ${i + 1}: students per bench must be 1, 2, or 3.`)
    }
  })
  if (!studentRows?.length) {
    configErrors.push('Upload a student CSV before generating seating.')
  }

  return { classrooms, configErrors }
}

export function generateSeatingArrangements(studentRows, configOverride = null) {
  console.log('[Seating Service] START generation')
  
  const config = configOverride ?? loadClassroomConfig()
  const { classrooms, configErrors } = validateConfig(studentRows, config)

  if (configErrors.length > 0) {
    console.error('[Seating Service] Config errors:', configErrors)
    return {
      success: false,
      configErrors,
      assignments: [],
      roomResults: [],
      summary: null,
      logicVersion: SEATING_LOGIC_VERSION,
    }
  }

  const totalCapacity = getTotalCapacity(classrooms)
  const MAX_RETRIES = 5
  let bestResult = null
  let bestValidation = null
  let bestTotalConflicts = Infinity

  // Bounded retry loop - NO recursion
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    console.log(`[Seating Service] retry ${retry + 1}/${MAX_RETRIES}`)
    
    const result = allocateSeating(studentRows, classrooms)
    const validation = result.validation
    
    // Calculate total conflicts
    const totalConflicts = 
      (validation.sameBenchSkillConflicts || 0) +
      (validation.frontBackConflicts || 0) +
      (validation.leftRightConflicts || 0) +
      (validation.emptyBenches || 0)
    
    console.log(`[Seating Service] conflicts: ${totalConflicts}`, validation)
    
    // Track best result
    if (!bestResult || totalConflicts < bestTotalConflicts) {
      bestResult = result
      bestValidation = validation
      bestTotalConflicts = totalConflicts
    }
    
    // Success if zero conflicts
    if (totalConflicts === 0) {
      console.log('[Seating Service] SUCCESS: Zero conflicts achieved')
      return buildFinalResult(bestResult, studentRows, classrooms, totalCapacity)
    }
  }
  
  // Retries exhausted - return best result
  console.warn(`[Seating Service] Max retries (${MAX_RETRIES}) exhausted. Returning best result with ${bestTotalConflicts} conflicts`)
  return buildFinalResult(bestResult, studentRows, classrooms, totalCapacity)
}

function buildFinalResult(result, studentRows, classrooms, totalCapacity) {
  // Use finalSeating as single source of truth
  const finalSeating = result.finalSeating || result.roomResults.flatMap((r) => r.assignments)
  const totalOccupied = finalSeating.filter((a) => a.status === 'Occupied').length
  const totalEmpty = finalSeating.filter((a) => a.status === 'Empty').length

  const legacyResult = {
    success: (result.unassigned?.length ?? 0) === 0,
    assignments: finalSeating,
    finalSeating: finalSeating,
    roomResults: result.roomResults,
    summary: {
      totalStudents: studentRows.length,
      totalOccupied,
      totalEmpty,
      totalUnassigned: result.unassigned?.length ?? 0,
    },
    config: {
      classrooms,
      totalCapacity,
    },
    generatedAt: new Date().toISOString(),
    logicVersion: SEATING_LOGIC_VERSION,
    layoutVersion: CLASSROOM_LAYOUT_VERSION,
    numberingVersion: SEATING_NUMBERING_VERSION,
    unassigned: result.unassigned ?? [],
    validation: result.validation,
  }

  return {
    ...legacyResult,
    configErrors: [],
  }
}

function yieldToMain() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

export async function generateSeatingArrangementsAsync(
  studentRows,
  configOverride = null,
  onProgress = null,
) {
  console.group('[SEAT GENERATION]')
  try {
    console.log('students', studentRows.length)
    console.log('config', configOverride)

    onProgress?.({ phase: 'starting', current: 0, total: 1 })

    await yieldToMain()

    const result = generateSeatingArrangements(studentRows, configOverride)

    console.log('success', result)
    onProgress?.({ phase: 'done', current: 1, total: 1 })

    return result
  } catch (err) {
    console.error('[SEAT GENERATION FAILED]')
    console.error(err)
    console.error(err.stack)
    // Re-throw with clean error message
    throw new Error(`Seating generation failed: ${err.message}`)
  } finally {
    console.groupEnd()
  }
}

export function shouldRegenerateSeating(stored) {
  if (!stored) return true
  if (stored.logicVersion !== SEATING_LOGIC_VERSION) return true
  if (stored.layoutVersion !== CLASSROOM_LAYOUT_VERSION) return true
  if (stored.numberingVersion !== SEATING_NUMBERING_VERSION) return true
  return false
}

export function formatGroupTitle(group) {
  if (!group) return 'Unknown Group'
  const date = group.contestDate ?? group.date ?? ''
  const slot = group.timeSlot ?? group.slot ?? ''
  return `${date} · ${slot}`
}

export function sortAssignmentsPhysically(assignments, classrooms = []) {
  const roomOrder = new Map()
  classrooms.forEach((room, idx) => {
    if (room?.id != null) roomOrder.set(room.id, idx)
  })
  
  return [...assignments].sort((a, b) => {
    const ra = roomOrder.get(a.classroomId) ?? 9999
    const rb = roomOrder.get(b.classroomId) ?? 9999
    if (ra !== rb) return ra - rb

    const rowA = Number(a.row ?? 0)
    const rowB = Number(b.row ?? 0)
    if (rowA !== rowB) return rowA - rowB

    const colA = Number(a.col ?? 0)
    const colB = Number(b.col ?? 0)
    if (colA !== colB) return colA - colB

    return Number(a.seatIndex ?? 0) - Number(b.seatIndex ?? 0)
  })
}
