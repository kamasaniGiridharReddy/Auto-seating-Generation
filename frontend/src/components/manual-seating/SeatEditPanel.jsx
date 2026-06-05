import { useState } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'
import Select from '../ui/Select'

export default function SeatEditPanel({
  seat,
  allSeats,
  skillCodes,
  onClose,
  onUpdateSkill,
  onUpdateStudent,
  onClearStudent,
  onMoveTo,
  onSwapWith,
}) {
  const [moveTarget, setMoveTarget] = useState('')
  const [swapTarget, setSwapTarget] = useState('')

  if (!seat) return null

  const seatOptions = allSeats
    .filter((s) => s.id !== seat.id)
    .sort((a, b) => a.seatingNo - b.seatingNo)
    .map((s) => ({
      value: s.id,
      label: `Seat ${s.seatingNo} · B${s.benchNumber}${s.studentName ? ` · ${s.studentName}` : ''}`,
    }))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <Card className="w-full max-w-md !p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--grit-gold)]">Edit seat</h3>
            <p className="text-xs text-[var(--grit-cream)]/45">
              B{seat.benchNumber} · Seat {seat.seatingNo} · {seat.roomNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[var(--grit-cream)]/50 hover:bg-[var(--grit-brown-700)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--grit-cream)]/50">Skill code</label>
            <input
              list="seat-edit-skills"
              value={seat.skillCode ?? ''}
              onChange={(e) => onUpdateSkill(seat.id, e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)] px-3 py-2 text-sm font-semibold text-[var(--grit-gold)] focus:border-[var(--grit-gold)]/50 focus:outline-none"
            />
            <datalist id="seat-edit-skills">
              {skillCodes.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <Input
            label="Student name"
            value={seat.studentName ?? ''}
            onChange={(e) => onUpdateStudent(seat.id, { studentName: e.target.value })}
          />
          <Input
            label="NIAT ID"
            value={seat.niatId ?? ''}
            onChange={(e) => onUpdateStudent(seat.id, { niatId: e.target.value })}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => onClearStudent(seat.id)}>
              Remove student
            </Button>
          </div>

          <div className="border-t border-[var(--grit-brown-600)]/40 pt-3">
            <p className="mb-2 text-xs font-medium text-[var(--grit-cream)]/50">Move / swap</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                label="Move to"
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
                options={[{ value: '', label: 'Select seat…' }, ...seatOptions]}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!moveTarget}
                onClick={() => {
                  onMoveTo(seat.id, moveTarget)
                  setMoveTarget('')
                }}
              >
                Move
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Select
                label="Swap with"
                value={swapTarget}
                onChange={(e) => setSwapTarget(e.target.value)}
                options={[{ value: '', label: 'Select seat…' }, ...seatOptions]}
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!swapTarget}
                onClick={() => {
                  onSwapWith(seat.id, swapTarget)
                  setSwapTarget('')
                }}
              >
                Swap
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
