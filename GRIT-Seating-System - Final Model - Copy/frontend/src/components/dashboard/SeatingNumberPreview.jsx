import Card from '../ui/Card'

export default function SeatingNumberPreview({ seatingPreview }) {
  if (!seatingPreview?.length) {
    return (
      <Card title="Sequential seating numbers">
        <p className="text-sm text-[var(--grit-cream)]/45">Add classrooms to preview numbering.</p>
      </Card>
    )
  }

  return (
    <Card title="Sequential seating numbers" className="flex h-full flex-col">
      <p className="mb-4 text-sm text-[var(--grit-cream)]/55">
        Bench × seats per bench — numbers continue across rooms.
      </p>
      <div className="max-h-[400px] flex-1 overflow-y-auto rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-900)]/50 p-4">
        <div className="space-y-4">
          {[...new Set(seatingPreview.map((s) => s.roomNumber))].map((roomNumber) => {
            const roomSeats = seatingPreview.filter((s) => s.roomNumber === roomNumber)
            return (
              <div key={roomNumber}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--grit-gold)]">
                  {roomNumber}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {roomSeats.map((seat) => (
                    <div
                      key={`${seat.seatingNo}-${seat.benchNumber}-${seat.seatIndex}`}
                      className="rounded-lg border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-800)] px-2 py-2 text-center"
                    >
                      <span className="block text-lg font-bold text-[var(--grit-gold)]">
                        {seat.seatingNo}
                      </span>
                      <span className="text-[10px] text-[var(--grit-cream)]/45">
                        B{seat.benchNumber} S{seat.seatIndex + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
