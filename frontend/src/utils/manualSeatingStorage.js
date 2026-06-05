/** Local persistence for Manual Seating Studio. */

export const MANUAL_SEATING_LAYOUT_KEY = 'grit-manual-seating-layout'
export const MANUAL_SEATING_RESULT_KEY = 'grit-manual-seating-result'
export const SKILL_MAPPING_KEY = 'grit-skill-mapping'

export function saveSkillMapping(mapping) {
  localStorage.setItem(
    SKILL_MAPPING_KEY,
    JSON.stringify({
      skills: mapping,
      savedAt: new Date().toISOString(),
    }),
  )
}

export function loadSkillMapping() {
  try {
    const raw = localStorage.getItem(SKILL_MAPPING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.skills ?? parsed
  } catch {
    return null
  }
}

export function saveManualSeatingLayout(layout) {
  localStorage.setItem(
    MANUAL_SEATING_LAYOUT_KEY,
    JSON.stringify({
      ...layout,
      savedAt: new Date().toISOString(),
    }),
  )
}

export function loadManualSeatingLayout() {
  try {
    const raw = localStorage.getItem(MANUAL_SEATING_LAYOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveManualSeatingResult(result) {
  localStorage.setItem(
    MANUAL_SEATING_RESULT_KEY,
    JSON.stringify({
      ...result,
      savedAt: new Date().toISOString(),
    }),
  )
}

export function loadManualSeatingResult() {
  try {
    const raw = localStorage.getItem(MANUAL_SEATING_RESULT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function hasManualSeatingResult() {
  const r = loadManualSeatingResult()
  return Boolean(r?.groups?.length && r.source === 'manual-studio')
}

export function clearManualSeatingLayout() {
  localStorage.removeItem(MANUAL_SEATING_LAYOUT_KEY)
}

export function clearManualSeatingResult() {
  localStorage.removeItem(MANUAL_SEATING_RESULT_KEY)
}
