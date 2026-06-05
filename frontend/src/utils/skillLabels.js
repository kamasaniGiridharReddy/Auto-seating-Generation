/** Full skill name → short code for 3D labels and UI. */

const SKILL_SHORT_MAP = [
  ['Applied Gen AI Development', 'GEN AI'],
  ['CS Fundamentals', 'CS'],
  ['Critical Thinking & Communication', 'CTC'],
  ['Computational Thinking', 'CT'],
  ['DS & ML', 'DSML'],
  ['UI Engineering', 'UI'],
  ['SQL', 'SQL'],
  ['Quantitative Reasoning', 'QR'],
  ['Server-Side Engineering', 'SSE'],
]

function normalizeForMatch(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function getSkillShortCode(skill) {
  const raw = String(skill ?? '').trim()
  if (!raw) return '—'
  const norm = normalizeForMatch(raw)

  for (const [full, code] of SKILL_SHORT_MAP) {
    if (normalizeForMatch(full) === norm) return code
  }
  for (const [full, code] of SKILL_SHORT_MAP) {
    if (norm.includes(normalizeForMatch(full)) || normalizeForMatch(full).includes(norm)) {
      return code
    }
  }

  if (raw.length <= 8) return raw.toUpperCase()
  return raw
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 6)
}

export function getFirstName(fullName) {
  const name = String(fullName ?? '').trim()
  if (!name) return '?'
  return name.split(/\s+/)[0]
}

export function formatSeatLabel(seatingNo) {
  return `Seat ${seatingNo}`
}
