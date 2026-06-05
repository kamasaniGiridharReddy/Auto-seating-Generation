/**
 * Per-classroom assigned counts and seat utilization for one time-slot group.
 */
export function buildRoomAssignmentRows(group) {
  const roomResults = group.roomResults ?? []
  if (!roomResults.length) {
    const byRoom = new Map()
    for (const a of group.assignments ?? []) {
      const key = a.roomNo ?? a.roomNumber ?? 'Room'
      if (!byRoom.has(key)) byRoom.set(key, { roomNumber: key, assigned: 0, capacity: null })
      byRoom.get(key).assigned++
    }
    return [...byRoom.values()]
  }

  return roomResults.map((rr) => {
    const room = rr.room ?? {}
    const assigned = rr.assignments?.length ?? 0
    const capacity =
      rr.capacity ??
      Number(room.rows) * Number(room.columns) * Number(room.studentsPerBench)
    return {
      roomNumber: (room.roomName ?? room.roomNumber) || rr.roomNumber || 'Room',
      assigned,
      capacity: capacity || 0,
    }
  })
}

export default function RoomAssignmentSummary({ group }) {
  const rows = buildRoomAssignmentRows(group)
  if (!rows.length) return null

  return (
    <section className="border-b border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)]/40 px-6 py-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--grit-gold)]">
        Room assignment summary
      </h4>
      {Number(group.adjacentSkillConflicts ?? 0) > 0 && (
        <p className="mt-2 text-xs text-[var(--grit-red-400)]">
          Adjacent same-skill conflicts: {group.adjacentSkillConflicts}
        </p>
      )}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const cap = row.capacity || 0
          const pct = cap > 0 ? Math.round((row.assigned / cap) * 100) : 0
          const full = cap > 0 && row.assigned >= cap
          return (
            <li
              key={row.roomNumber}
              className="rounded-lg border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-900)]/50 px-4 py-3"
            >
              <p className="font-semibold text-[var(--grit-cream)]">{row.roomNumber}</p>
              <p className="mt-1 text-sm text-[var(--grit-cream)]/75">
                Assigned: <span className="text-[var(--grit-cream)]">{row.assigned}</span> students
              </p>
              <p className="text-sm text-[var(--grit-cream)]/60">Capacity: {cap || '—'}</p>
              <p
                className={`mt-2 text-xs font-medium ${
                  full ? 'text-[var(--grit-gold)]' : 'text-[var(--grit-cream)]/50'
                }`}
              >
                {cap > 0 ? `${row.assigned} / ${cap} seats used` : '—'}
                {cap > 0 && <span className="ml-1 text-[var(--grit-cream)]/40">({pct}%)</span>}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
