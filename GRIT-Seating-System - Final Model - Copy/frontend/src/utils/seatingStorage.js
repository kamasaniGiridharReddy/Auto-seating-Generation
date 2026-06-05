/** Local persistence for generated seating arrangements. */

export const SEATING_RESULT_KEY = 'grit-seating-results'

export function saveSeatingResults(results) {
  localStorage.setItem(SEATING_RESULT_KEY, JSON.stringify(results))
}

export function loadSeatingResults() {
  try {
    const raw = localStorage.getItem(SEATING_RESULT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearSeatingResults() {
  localStorage.removeItem(SEATING_RESULT_KEY)
}
