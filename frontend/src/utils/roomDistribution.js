/**
 * Phase 1: Balanced student distribution across classrooms (pivot-table style).
 * Balances total headcount and per-skill counts before seating runs per room.
 */

import { getRoomCapacity } from './classroomStorage'

function normalizeSkill(skill) {
  return String(skill ?? '').trim().toLowerCase()
}

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Balanced integer targets per room (e.g. 109 → 55, 54), capped by capacity.
 */
export function computeBalancedTargets(totalStudents, capacities) {
  const n = capacities.length
  let targets = new Array(n).fill(0)
  if (n === 0 || totalStudents === 0) return targets

  const base = Math.floor(totalStudents / n)
  const extra = totalStudents % n

  for (let i = 0; i < n; i++) {
    targets[i] = Math.min(capacities[i], base + (i < extra ? 1 : 0))
  }

  let assigned = targets.reduce((s, t) => s + t, 0)
  let remaining = totalStudents - assigned

  while (remaining > 0) {
    let placed = false
    for (let i = 0; i < n && remaining > 0; i++) {
      if (targets[i] < capacities[i]) {
        targets[i]++
        remaining--
        placed = true
      }
    }
    if (!placed) break
  }

  return targets
}

/** Even split of one skill's students across rooms (e.g. 31 → 16, 15). */
export function computeSkillTargets(skillCount, roomCount) {
  let targets = new Array(roomCount).fill(Math.floor(skillCount / roomCount))
  for (let i = 0; i < skillCount % roomCount; i++) {
    targets[i]++
  }
  return targets
}

/**
 * Assign students to rooms with balanced totals and per-skill counts.
 * @returns {{ buckets: { room, students }[], unassigned: object[], targets: number[] }}
 */
/**
 * @param {{ attempt?: number }} [options] — attempt > 0 shuffles skill/room tie-break for phase-2 retries
 */
export function distributeStudentsAcrossRooms(students, classrooms, options = {}) {
  const attempt = options.attempt ?? 0
  const n = classrooms.length
  if (!n) {
    return { buckets: [], unassigned: [...students], targets: [] }
  }

  const capacities = classrooms.map(getRoomCapacity)
  const totalCap = capacities.reduce((a, b) => a + b, 0)

  if (students.length > totalCap) {
    return {
      buckets: classrooms.map((room) => ({ room, students: [] })),
      unassigned: [...students],
      targets: computeBalancedTargets(students.length, capacities),
    }
  }

  const targetTotals = computeBalancedTargets(students.length, capacities)

  const bySkill = new Map()
  students.forEach((s) => {
    const key = normalizeSkill(s.Skill) || '__none__'
    if (!bySkill.has(key)) bySkill.set(key, [])
    bySkill.get(key).push(s)
  })

  const state = classrooms.map((room, i) => ({
    room,
    students: [],
    count: 0,
    capacity: capacities[i],
    targetTotal: targetTotals[i],
    skillCounts: {},
  }))

  let skillKeys = [...bySkill.keys()].sort(
    (a, b) => bySkill.get(b).length - bySkill.get(a).length,
  )
  if (attempt > 0) {
    skillKeys = shuffle(skillKeys)
  }

  const roomScanOrder = Array.from({ length: n }, (_, i) => (i + (attempt % n)) % n)

  const unassigned = []

  for (const skillKey of skillKeys) {
    const group = shuffle(bySkill.get(skillKey))
    const skillTargets = computeSkillTargets(group.length, n)

    for (const student of group) {
      let bestIdx = -1
      let bestScore = Infinity

      for (const r of roomScanOrder) {
        const st = state[r]
        if (st.count >= st.capacity) continue

        const skillCount = st.skillCounts[skillKey] || 0
        const skillGap = skillCount - skillTargets[r]
        const totalGap = st.count - st.targetTotal

        const score = skillGap * 100 + totalGap * 10 + st.count * 0.01

        if (score < bestScore) {
          bestScore = score
          bestIdx = r
        }
      }

      if (bestIdx < 0) {
        unassigned.push(student)
        continue
      }

      state[bestIdx].students.push(student)
      state[bestIdx].count++
      state[bestIdx].skillCounts[skillKey] =
        (state[bestIdx].skillCounts[skillKey] || 0) + 1
    }
  }

  return {
    buckets: state.map((st) => ({ room: st.room, students: st.students })),
    unassigned,
    targets: targetTotals,
    roomCounts: state.map((st) => st.count),
  }
}
