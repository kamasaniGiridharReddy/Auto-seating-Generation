/** Bench-wise seating view grouped by room in rows × columns grid. */

function BenchBlock({ benchNumber, seats }) {
  const sorted = [...seats].sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0))

  return (
    <div className="min-w-0 rounded border border-[var(--grit-brown-500)]/80 bg-[var(--grit-brown-900)]/50 px-1.5 py-1 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]">
      <p className="text-[10px] font-semibold text-[var(--grit-cream)]/45">B{benchNumber}</p>
      {sorted.length === 0 ? (
        <p className="mt-0.5 text-[10px] text-[var(--grit-cream)]/25">—</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {sorted.map((seat) => (
            <li key={seat.studentUid ?? seat.seatingNo} className="text-[11px] leading-snug">
              <span className="font-medium tabular-nums text-[var(--grit-gold)]">
                Seat {seat.seatingNo}
              </span>
              {seat.bookingId && (
                <span className="text-[var(--grit-cream)]/60">
                  {' '}({seat.bookingId})
                </span>
              )}
              <span className="text-[var(--grit-cream)]/80"> → {seat.studentName}</span>
              <span className="text-[var(--grit-cream)]/45"> ({seat.skill})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RoomBenchGrid({ roomResult }) {
  const room = roomResult.room ?? {}
  const rows = Number(roomResult.rows ?? room.rows) || 1
  const columns = Number(roomResult.cols ?? room.columns) || 1
  const assignments = roomResult.assignments ?? []

  const byBench = new Map()
  assignments.forEach((a) => {
    if (!byBench.has(a.benchNumber)) byBench.set(a.benchNumber, [])
    byBench.get(a.benchNumber).push(a)
  })

  const gridRows = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < columns; c++) {
      const benchNumber = r * columns + c + 1
      row.push({
        benchNumber,
        seats: byBench.get(benchNumber) ?? [],
      })
    }
    gridRows.push(row)
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 className="text-xs font-semibold text-[var(--grit-gold)]">
          {(room.roomName ?? room.roomNumber) || roomResult.roomNumber || 'Room'}
        </h4>
        <span className="text-[10px] text-[var(--grit-cream)]/40">
          {rows}×{columns} · front ↑
        </span>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {gridRows.map((row, ri) =>
          row.map((bench) => (
            <BenchBlock key={`${room.id ?? room.roomNumber}-r${ri}-b${bench.benchNumber}`} {...bench} />
          )),
        )}
      </div>
    </section>
  )
}

export default function BenchWiseLayout({ group }) {
  const roomResults = group.roomResults ?? []

  if (!roomResults.length) {
    return (
      <p className="px-6 py-4 text-sm text-[var(--grit-cream)]/45">No bench layout for this group.</p>
    )
  }

  return (
    <div className="space-y-4 px-6 py-4">
      {roomResults.map((roomResult, idx) => (
        <RoomBenchGrid key={roomResult.room?.id ?? roomResult.roomNumber ?? idx} roomResult={roomResult} />
      ))}
    </div>
  )
}
