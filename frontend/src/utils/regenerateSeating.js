import {
  generateSeatingArrangementsAsync,
  shouldRegenerateSeating,
} from '../services/seatingService'
import { loadClassroomConfig } from './classroomStorage'
import { loadStudentData } from './studentStorage'
import { loadSeatingResults, saveSeatingResults } from './seatingStorage'

/** Whether stored results need regeneration (does not run generation). */
export function needsSeatingRegeneration(stored = loadSeatingResults()) {
  const students = loadStudentData()
  if (!students?.rows?.length) return false
  return shouldRegenerateSeating(stored)
}

/**
 * Returns cached seating immediately — never blocks on generation.
 * Use ensureFreshSeatingAsync for background regen.
 */
export function ensureFreshSeating() {
  return loadSeatingResults()
}

/** Regenerate seating off the main thread path (async + yields). */
export async function ensureFreshSeatingAsync(onProgress = null) {
  const stored = loadSeatingResults()
  const students = loadStudentData()
  const config = loadClassroomConfig()

  if (!students?.rows?.length) {
    return stored
  }

  if (!shouldRegenerateSeating(stored)) {
    return stored
  }

  const generated = await generateSeatingArrangementsAsync(students.rows, config, onProgress)
  if (!generated.configErrors?.length) {
    saveSeatingResults(generated)
  }
  return generated
}
