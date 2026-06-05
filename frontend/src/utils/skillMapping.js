/** Dynamic skill → short code mapping (no hardcoded exam skills). */

import { getSkillShortCode } from './skillLabels'

const FILLER_WORDS = new Set([
  'and',
  '&',
  'for',
  'of',
  'the',
  'a',
  'an',
  'in',
  'on',
  'to',
  'with',
  'applied',
])

const OPTIONAL_DROP = new Set(['development', 'engineering', 'fundamentals', 'foundations'])

export function normalizeSkillName(skill) {
  return String(skill ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeSkillKey(skill) {
  return normalizeSkillName(skill).toLowerCase()
}

/** Extract unique skill names from CSV rows. */
export function extractUniqueSkillsFromRows(rows = []) {
  const seen = new Map()
  for (const row of rows) {
    const name = normalizeSkillName(row.Skill ?? row.skill)
    if (!name) continue
    const key = normalizeSkillKey(name)
    if (!seen.has(key)) seen.set(key, name)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** Extract unique skills from multi-line manual text. */
export function extractUniqueSkillsFromText(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => normalizeSkillName(l))
    .filter(Boolean)
  return [...new Set(lines.map(normalizeSkillKey))].map((key) => {
    const line = lines.find((l) => normalizeSkillKey(l) === key)
    return line ?? key
  })
}

function tokenizeSkill(fullName) {
  return normalizeSkillName(fullName)
    .split(/[\s/&]+/)
    .map((t) => t.replace(/[^a-zA-Z0-9+]/g, ''))
    .filter(Boolean)
}

function acronymFromTokens(tokens, dropOptional = true) {
  const significant = tokens.filter((t) => {
    const low = t.toLowerCase()
    if (FILLER_WORDS.has(low)) return false
    if (dropOptional && OPTIONAL_DROP.has(low)) return false
    return true
  })
  if (!significant.length) return tokens.map((t) => t[0]).join('').toUpperCase().slice(0, 6)
  if (significant.length === 1) {
    const w = significant[0]
    if (w.length <= 6) return w.toUpperCase()
    return w.slice(0, 4).toUpperCase()
  }
  if (significant.length === 2) {
    const [a, b] = significant
    if (a.length <= 3 && b.length <= 3) return `${a} ${b}`.toUpperCase()
    return (a[0] + b[0] + (b[1] ?? '')).toUpperCase().slice(0, 6)
  }
  return significant
    .map((t) => (t.length <= 3 ? t : t[0]))
    .join('')
    .toUpperCase()
    .slice(0, 8)
}

/** Suggest a short code for any skill name. */
export function suggestShortCode(fullName) {
  const raw = normalizeSkillName(fullName)
  if (!raw) return ''
  const known = getSkillShortCode(raw)
  if (known && known !== '—') return known

  const tokens = tokenizeSkill(raw)
  const lowTokens = tokens.map((t) => t.toLowerCase())

  if (lowTokens.includes('gen') && lowTokens.includes('ai')) return 'GEN AI'
  if (lowTokens.includes('machine') && lowTokens.includes('learning')) return 'ML'
  if (lowTokens.includes('full') && lowTokens.includes('stack')) return 'FS'
  if (lowTokens.includes('java') && lowTokens.includes('full')) return 'JFS'
  if (lowTokens.includes('cloud') && lowTokens.includes('computing')) return 'CC'
  if (lowTokens.includes('cyber') && lowTokens.includes('security')) return 'CYB'

  const code = acronymFromTokens(tokens)
  if (raw.length <= 8) return raw.toUpperCase()
  return code
}

function resolveCollisions(entries) {
  const used = new Set()
  return entries.map(({ fullName, shortCode }) => {
    let code = String(shortCode ?? '').trim().toUpperCase() || suggestShortCode(fullName)
    if (!used.has(code)) {
      used.add(code)
      return { fullName, shortCode: code }
    }
    const tokens = tokenizeSkill(fullName)
    const alt1 = acronymFromTokens(tokens, false)
    if (!used.has(alt1)) {
      used.add(alt1)
      return { fullName, shortCode: alt1 }
    }
    let n = 2
    while (used.has(`${code}${n}`)) n++
    const resolved = `${code}${n}`
    used.add(resolved)
    return { fullName, shortCode: resolved }
  })
}

/** Build mapping array from skill names, preserving admin edits. */
export function buildSkillMapping(skillNames = [], existingMapping = null) {
  const existing = existingMapping ?? {}
  const entries = skillNames.map((fullName) => ({
    fullName,
    shortCode: existing[normalizeSkillKey(fullName)] ?? suggestShortCode(fullName),
  }))
  return resolveCollisions(entries)
}

export function mappingArrayToRecord(entries) {
  const rec = {}
  for (const { fullName, shortCode } of entries) {
    rec[normalizeSkillKey(fullName)] = {
      fullName,
      shortCode: String(shortCode ?? '').trim().toUpperCase(),
    }
  }
  return rec
}

export function mappingRecordToArray(record) {
  if (!record) return []
  const seen = new Set()
  const arr = []
  for (const val of Object.values(record)) {
    const fullName = val.fullName ?? val
    const key = normalizeSkillKey(fullName)
    if (seen.has(key)) continue
    seen.add(key)
    arr.push({
      fullName,
      shortCode: String(val.shortCode ?? val.code ?? suggestShortCode(fullName)).trim().toUpperCase(),
    })
  }
  return arr.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export function getCodeForSkill(skill, mappingRecord) {
  const key = normalizeSkillKey(skill)
  return mappingRecord?.[key]?.shortCode ?? suggestShortCode(skill)
}

export function getFullSkillForCode(code, mappingRecord) {
  const norm = String(code ?? '').trim().toUpperCase()
  for (const val of Object.values(mappingRecord ?? {})) {
    if (String(val.shortCode).trim().toUpperCase() === norm) return val.fullName
  }
  return norm
}

export function getAllShortCodes(mappingRecord) {
  const codes = new Set()
  for (const val of Object.values(mappingRecord ?? {})) {
    if (val.shortCode) codes.add(String(val.shortCode).trim().toUpperCase())
  }
  return [...codes].sort()
}
