import { getSkillShortCode } from './skillLabels'

/** Stable color per skill short code for 3D and legend. */
const CODE_COLORS = {
  'GEN AI': '#c44d5a',
  CS: '#6b7fd7',
  CTC: '#c9a227',
  CT: '#5c8a6f',
  DSML: '#a83240',
  UI: '#d4845c',
  SQL: '#8b2635',
  QR: '#7a4f3f',
  SSE: '#5c3a2e',
}

const FALLBACK_PALETTE = [
  '#c44d5a',
  '#c9a227',
  '#6b7fd7',
  '#5c8a6f',
  '#a83240',
  '#d4845c',
  '#8b2635',
]

export function skillToColor(skill) {
  const code = getSkillShortCode(skill)
  if (CODE_COLORS[code]) return CODE_COLORS[code]

  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length]
}
