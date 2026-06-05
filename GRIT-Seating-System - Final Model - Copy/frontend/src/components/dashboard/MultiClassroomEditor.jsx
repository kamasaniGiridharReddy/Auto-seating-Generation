import Card from '../ui/Card'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import { STUDENTS_PER_BENCH_OPTIONS } from '../../utils/constants'
import { getRoomCapacity } from '../../utils/classroomStorage'

const ORIENTATION_OPTIONS = [
  { value: 'horizontal', label: 'Horizontal (Row-major)' },
  { value: 'vertical', label: 'Vertical (Column-major)' },
]

export default function MultiClassroomEditor({
  classrooms,
  errors,
  onUpdate,
  onAdd,
  onRemove,
}) {
  return (
    <Card title="Classrooms" className="h-full">
      <p className="mb-6 text-sm text-[var(--grit-cream)]/55">
        Define each room with rows and columns. Capacity is calculated automatically.
        Seating uses front/back/left/right based on this grid.
      </p>

      {errors.global && (
        <p className="mb-4 text-sm text-[var(--grit-red-400)]" role="alert">
          {errors.global}
        </p>
      )}

      <div className="space-y-5">
        {classrooms.map((room, index) => {
          const capacity = getRoomCapacity(room)
          return (
            <div
              key={room.id}
              className="rounded-xl border border-[var(--grit-brown-600)]/60 bg-[var(--grit-brown-900)]/40 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--grit-gold)]">
                  Classroom {index + 1}
                </h3>
                {classrooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemove(room.id)}
                    className="text-xs font-medium text-[var(--grit-red-400)] transition-colors hover:text-[var(--grit-red-500)]"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Room name"
                  id={`room-${room.id}`}
                  placeholder="S01"
                  value={(room.roomName ?? room.roomNumber) || ''}
                  onChange={(e) => onUpdate(room.id, 'roomName', e.target.value)}
                  error={errors[`${room.id}-roomName`] ?? errors[`${room.id}-roomNumber`]}
                />
                <Input
                  label="Number of rows"
                  id={`rows-${room.id}`}
                  type="number"
                  min={1}
                  max={30}
                  value={room.rows}
                  onChange={(e) => onUpdate(room.id, 'rows', e.target.value)}
                  error={errors[`${room.id}-rows`]}
                />
                <Input
                  label="Number of columns"
                  id={`cols-${room.id}`}
                  type="number"
                  min={1}
                  max={30}
                  value={room.columns}
                  onChange={(e) => onUpdate(room.id, 'columns', e.target.value)}
                  error={errors[`${room.id}-columns`]}
                />
                <Select
                  label="Students per bench"
                  id={`spb-${room.id}`}
                  value={String(room.studentsPerBench)}
                  onChange={(e) => onUpdate(room.id, 'studentsPerBench', Number(e.target.value))}
                  error={errors[`${room.id}-studentsPerBench`]}
                  options={STUDENTS_PER_BENCH_OPTIONS.map((n) => ({
                    value: String(n),
                    label: `${n} student${n > 1 ? 's' : ''}`,
                  }))}
                />
                <Select
                  label="Seating orientation"
                  id={`orientation-${room.id}`}
                  value={room.orientation ?? 'horizontal'}
                  onChange={(e) => onUpdate(room.id, 'orientation', e.target.value)}
                  error={errors[`${room.id}-orientation`]}
                  options={ORIENTATION_OPTIONS}
                />
              </div>

              <div className="mt-4 rounded-lg border border-[var(--grit-brown-600)]/40 bg-[var(--grit-brown-800)]/50 px-4 py-3 text-sm">
                <p className="text-[var(--grit-cream)]/55">
                  Room:{' '}
                  <span className="font-medium text-[var(--grit-cream)]">
                    {(room.roomName ?? room.roomNumber) || '—'}
                  </span>
                </p>
                <p className="mt-1 text-[var(--grit-cream)]/55">
                  Layout:{' '}
                  <span className="font-medium text-[var(--grit-gold)]">
                    {room.rows} rows × {room.columns} columns × {room.studentsPerBench} per bench
                  </span>
                </p>
                <p className="mt-1 text-[var(--grit-gold)]">
                  Capacity: <strong>{capacity || 0}</strong> seats
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <Button type="button" variant="secondary" onClick={onAdd} className="mt-5 w-full sm:w-auto">
        + Add Classroom
      </Button>
    </Card>
  )
}
