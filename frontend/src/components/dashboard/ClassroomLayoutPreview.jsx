import Card from '../ui/Card'
import { generateAllRoomsBenchPreview } from '../../utils/seatingNumbers'

function formatSeatList(seatNumbers) {
  return seatNumbers.join(' ')
}

function benchesToGrid(benches, rows, columns, orientation = 'horizontal') {
  const grid = []
  
  if (orientation === 'vertical') {
    // Vertical: column-major layout
    // B1 B7 B13 B19
    // B2 B8 B14 B20
    // B3 B9 B15 B21
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < columns; c++) {
        // In vertical mode, bench at position (r, c) is at index c * rows + r
        row.push(benches[c * rows + r] ?? null)
      }
      grid.push(row)
    }
  } else {
    // Horizontal: row-major layout
    // B1 B2 B3 B4
    // B5 B6 B7 B8
    for (let r = 0; r < rows; r++) {
      const row = []
      for (let c = 0; c < columns; c++) {
        row.push(benches[r * columns + c] ?? null)
      }
      grid.push(row)
    }
  }
  
  return grid
}

function BenchCell({ bench }) {
  if (!bench) {
    return (
      <div className="min-h-[2.75rem] rounded border border-dashed border-[var(--grit-brown-600)]/25" />
    )
  }

  return (
    <div className="min-w-0 rounded border border-[var(--grit-brown-500)]/80 bg-[var(--grit-brown-900)]/50 px-1.5 py-1 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]">
      <p className="text-[10px] font-semibold leading-none text-[var(--grit-cream)]/50">
        B{bench.benchNumber}
      </p>
      <p className="mt-1 text-[11px] font-medium leading-tight tabular-nums tracking-wide text-[var(--grit-gold)]">
        {formatSeatList(bench.seatNumbers)}
      </p>
    </div>
  )
}

export default function ClassroomLayoutPreview({ classrooms }) {
  const roomPreviews = generateAllRoomsBenchPreview(classrooms ?? [])

  if (!roomPreviews.length) {
    return (
      <Card title="Seat numbering">
        <p className="text-xs text-[var(--grit-cream)]/45">Add a classroom to preview seat numbers.</p>
      </Card>
    )
  }

  return (
    <Card title="Seat numbering" className="flex h-full flex-col !p-4 sm:!p-5">
      <p className="mb-3 text-[11px] text-[var(--grit-cream)]/45">
        Numbers run continuously across all rooms. Pattern seating: same bench + front/back block.
      </p>
      <div className="max-h-[460px] flex-1 space-y-4 overflow-y-auto pr-0.5">
        {roomPreviews.map((room) => {
          const roomConfig = classrooms?.find(c => c.id === room.roomId)
          const orientation = roomConfig?.orientation ?? 'horizontal'
          const grid = benchesToGrid(room.benches, room.rows, room.columns, orientation)
          return (
            <section
              key={room.roomId}
              className="border-b border-[var(--grit-brown-600)]/30 pb-3 last:border-0 last:pb-0"
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className="text-xs font-semibold text-[var(--grit-gold)]">
                  {(room.roomName ?? room.roomNumber) || 'Room'}
                </h3>
                <span className="text-[10px] text-[var(--grit-cream)]/40">
                  {room.rows}×{room.columns} · {room.studentsPerBench}/bench · {room.slotStart}–
                  {room.slotEnd}
                </span>
              </div>
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${room.columns}, minmax(0, 1fr))`,
                }}
              >
                {grid.map((row, rowIdx) =>
                  row.map((bench, colIdx) => (
                    <BenchCell key={`${room.roomId}-${rowIdx}-${colIdx}`} bench={bench} />
                  )),
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Card>
  )
}
