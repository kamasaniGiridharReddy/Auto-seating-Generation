/** Local persistence for multi-classroom row/column layout. */

export const CLASSROOM_CONFIG_KEY = 'grit-classroom-config'

export function createClassroom(overrides = {}) {
  return {
    id: crypto.randomUUID?.() ?? `room-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    roomName: '',
    rows: 6,
    columns: 8,
    studentsPerBench: 2,
    orientation: 'horizontal',
    ...overrides,
  }
}

export const DEFAULT_CLASSROOMS = [
  createClassroom({ roomName: 'S01', rows: 6, columns: 8, studentsPerBench: 2 }),
]

function inferRowsColsFromBenchCount(totalBenches) {
  const total = Math.max(1, Number(totalBenches) || 12)
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)))
  const rows = Math.max(1, Math.ceil(total / columns))
  return { rows, columns }
}

function normalizeClassroom(room) {
  if (room.rows != null && room.columns != null) {
    return {
      id: room.id,
      roomName: room.roomName ?? room.roomNumber ?? '',
      rows: Number(room.rows),
      columns: Number(room.columns),
      studentsPerBench: Number(room.studentsPerBench) || 2,
      orientation: room.orientation ?? 'horizontal',
    }
  }
  const { rows, columns } = inferRowsColsFromBenchCount(room.totalBenches)
  return {
    id: room.id,
    roomName: room.roomName ?? room.roomNumber ?? '',
    rows,
    columns,
    studentsPerBench: Number(room.studentsPerBench) || 2,
    orientation: room.orientation ?? 'horizontal',
  }
}

function migrateLegacyConfig(parsed) {
  if (parsed.classrooms?.length) {
    return parsed.classrooms.map(normalizeClassroom)
  }

  const count = Math.max(1, Number(parsed.numberOfClassrooms) || 1)
  const { rows, columns } = inferRowsColsFromBenchCount(parsed.totalBenches)
  const perBench = Number(parsed.studentsPerBench) || 2
  const rooms = []

  for (let i = 0; i < count; i++) {
    rooms.push(
      createClassroom({
        roomName: `S${String(i + 1).padStart(2, '0')}`,
        rows,
        columns,
        studentsPerBench: perBench,
      }),
    )
  }
  return rooms
}

export function loadClassroomConfig() {
  try {
    const raw = localStorage.getItem(CLASSROOM_CONFIG_KEY)
    if (!raw) {
      return { classrooms: [...DEFAULT_CLASSROOMS], savedAt: null }
    }
    const parsed = JSON.parse(raw)
    return {
      classrooms: migrateLegacyConfig(parsed),
      savedAt: parsed.savedAt ?? null,
    }
  } catch {
    return { classrooms: [...DEFAULT_CLASSROOMS], savedAt: null }
  }
}

export function saveClassroomConfig(classrooms) {
  const payload = {
    classrooms: classrooms.map((r) => ({
      id: r.id,
      roomName: String(r.roomName ?? r.roomNumber ?? '').trim(),
      rows: Number(r.rows),
      columns: Number(r.columns),
      studentsPerBench: Number(r.studentsPerBench),
      orientation: r.orientation ?? 'horizontal',
    })),
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(CLASSROOM_CONFIG_KEY, JSON.stringify(payload))
  return payload
}

export function getRoomBenchCount(room) {
  return Number(room.rows) * Number(room.columns)
}

export function getRoomCapacity(room) {
  return getRoomBenchCount(room) * Number(room.studentsPerBench)
}

export function getTotalCapacity(classrooms) {
  return classrooms.reduce((sum, r) => sum + getRoomCapacity(r), 0)
}

export function getTotalBenches(classrooms) {
  return classrooms.reduce((sum, r) => sum + getRoomBenchCount(r), 0)
}
