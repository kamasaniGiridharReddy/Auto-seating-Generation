import { skillToColor } from '../../utils/skillColors'

function SkillPalette({ codes, onSelect }) {
  if (!codes.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="mr-1 self-center text-[10px] uppercase tracking-wide text-[var(--grit-cream)]/35">
        Palette
      </span>
      {codes.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onSelect(code)}
          className="rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition hover:ring-1 hover:ring-[var(--grit-gold)]/40"
          style={{
            borderColor: `${skillToColor(code)}55`,
            backgroundColor: `${skillToColor(code)}22`,
            color: skillToColor(code),
          }}
        >
          {code}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect('')}
        className="rounded-lg border border-[var(--grit-brown-600)] px-2 py-0.5 text-[11px] text-[var(--grit-cream)]/40 hover:bg-[var(--grit-brown-700)]"
      >
        Clear
      </button>
    </div>
  )
}

function SeatCell({ seat, skillCodes, onSeatChange, onSelectSeat, selected }) {
  const color = seat.skillCode ? skillToColor(seat.skillCode) : null

  return (
    <div
      className={`rounded border px-1 py-0.5 transition ${
        selected
          ? 'border-[var(--grit-gold)] ring-1 ring-[var(--grit-gold)]/40'
          : 'border-[var(--grit-brown-600)]/40'
      }`}
      style={color ? { backgroundColor: `${color}18` } : undefined}
    >
      <div className="flex items-center gap-1">
        <span className="w-4 shrink-0 text-[10px] tabular-nums text-[var(--grit-gold)]">
          {seat.seatingNo}
        </span>
        <input
          type="text"
          list={`skills-${seat.id}`}
          value={seat.skillCode ?? ''}
          onChange={(e) => onSeatChange(seat.id, e.target.value.toUpperCase())}
          onFocus={() => onSelectSeat(seat.id)}
          placeholder="—"
          className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold uppercase text-[var(--grit-cream)] placeholder:text-[var(--grit-cream)]/20 focus:outline-none"
        />
        <datalist id={`skills-${seat.id}`}>
          {skillCodes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      {seat.studentName && (
        <p className="truncate pl-5 text-[9px] text-[var(--grit-cream)]/45">{seat.studentName}</p>
      )}
    </div>
  )
}

function BenchBlock({ benchNumber, seats, skillCodes, onSeatChange, onSelectSeat, selectedSeatId }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--grit-brown-500)]/80 bg-[var(--grit-brown-900)]/50 p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]">
      <p className="mb-1 text-[10px] font-semibold text-[var(--grit-cream)]/45">B{benchNumber}</p>
      <div className="space-y-0.5">
        {seats.map((seat) => (
          <SeatCell
            key={seat.id}
            seat={seat}
            skillCodes={skillCodes}
            onSeatChange={onSeatChange}
            onSelectSeat={onSelectSeat}
            selected={selectedSeatId === seat.id}
          />
        ))}
      </div>
    </div>
  )
}

export default function ManualSeating2DEditor({
  room,
  seats,
  skillCodes,
  onSeatChange,
  onSelectSeat,
  selectedSeatId,
  onPaletteSelect,
}) {
  const rows = Number(room?.rows) || 1
  const columns = Number(room?.columns) || 1

  const byBench = new Map()
  seats.forEach((s) => {
    if (!byBench.has(s.benchNumber)) byBench.set(s.benchNumber, [])
    byBench.get(s.benchNumber).push(s)
  })
  for (const list of byBench.values()) {
    list.sort((a, b) => a.seatIndex - b.seatIndex)
  }

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--grit-gold)]">
            {room?.roomNumber || 'Room'}
          </h3>
          <p className="text-[10px] text-[var(--grit-cream)]/40">
            {rows}×{columns} · Front ↑
          </p>
        </div>
        <SkillPalette codes={skillCodes} onSelect={onPaletteSelect} />
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {gridRows.flatMap((row, ri) =>
          row.map((bench) => (
            <BenchBlock
              key={`${room?.id}-${bench.benchNumber}`}
              benchNumber={bench.benchNumber}
              seats={bench.seats}
              skillCodes={skillCodes}
              onSeatChange={onSeatChange}
              onSelectSeat={onSelectSeat}
              selectedSeatId={selectedSeatId}
            />
          )),
        )}
      </div>
    </div>
  )
}
