/** Local persistence for parsed student CSV data. */

export const STUDENT_DATA_KEY = 'grit-student-data'

export function saveStudentData(payload) {
  localStorage.setItem(
    STUDENT_DATA_KEY,
    JSON.stringify({
      ...payload,
      savedAt: new Date().toISOString(),
    }),
  )
}

export function loadStudentData() {
  try {
    const raw = localStorage.getItem(STUDENT_DATA_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearStudentData() {
  localStorage.removeItem(STUDENT_DATA_KEY)
}
