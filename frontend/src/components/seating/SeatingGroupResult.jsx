import { useState, useMemo } from 'react'
import Card from '../ui/Card'
import { formatGroupTitle, sortAssignmentsPhysically } from '../../services/seatingService'
import { loadClassroomConfig } from '../../utils/classroomStorage'
import BenchWiseLayout from './BenchWiseLayout'
import RoomAssignmentSummary from './RoomAssignmentSummary'

const RESULT_COLUMNS = [
  { key: 'contestDate', label: 'Date' },
  { key: 'timeSlot', label: 'Time slot' },
  { key: 'seatingNo', label: 'Seating no' },
  { key: 'roomNo', label: 'Room NO' },
  { key: 'benchLabel', label: 'Bench' },
  { key: 'bookingId', label: 'Booking ID' },
  { key: 'studentName', label: 'Student name' },
  { key: 'section', label: 'Section' },
  { key: 'skill', label: 'Skill' },
]

export default function SeatingGroupResult({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const [view, setView] = useState('benches')
  const classrooms = useMemo(() => loadClassroomConfig().classrooms ?? [], [])
  const sorted = useMemo(
    () => sortAssignmentsPhysically(group.assignments ?? [], classrooms),
    [group.assignments, classrooms],
  )

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--grit-brown-700)]/30"
      >
        <div>
          <h3 className="font-semibold text-[var(--grit-cream)]">{formatGroupTitle(group)}</h3>
          <p className="mt-1 text-xs text-[var(--grit-cream)]/50">
            {group.assignments?.length ?? 0} seated
            {group.unassigned?.length > 0 && (
              <span className="text-[var(--grit-gold)]">
                {' '}
                · {group.unassigned.length} unassigned
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              group.success
                ? 'bg-[var(--grit-gold)]/15 text-[var(--grit-gold)]'
                : 'bg-[var(--grit-red-600)]/20 text-[var(--grit-red-400)]'
            }`}
          >
            {group.success ? 'Complete' : 'Partial'}
          </span>
          <svg
            className={`h-5 w-5 text-[var(--grit-cream)]/50 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {group.message && (
        <p className="border-t border-[var(--grit-brown-600)]/40 px-6 py-3 text-sm text-[var(--grit-gold)]">
          {group.message}
        </p>
      )}

      {open && (
        <div className="border-t border-[var(--grit-brown-600)]/50">
          <RoomAssignmentSummary group={group} />

          {sorted.length > 0 && (
            <div className="flex gap-1 border-b border-[var(--grit-brown-600)]/40 px-6 pt-3">
              <button
                type="button"
                onClick={() => setView('benches')}
                className={`rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === 'benches'
                    ? 'bg-[var(--grit-brown-700)] text-[var(--grit-gold)]'
                    : 'text-[var(--grit-cream)]/50 hover:text-[var(--grit-cream)]'
                }`}
              >
                Bench layout
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                className={`rounded-t-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === 'table'
                    ? 'bg-[var(--grit-brown-700)] text-[var(--grit-gold)]'
                    : 'text-[var(--grit-cream)]/50 hover:text-[var(--grit-cream)]'
                }`}
              >
                Table
              </button>
            </div>
          )}

          {sorted.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--grit-cream)]/45">
              No seats assigned for this group.
            </p>
          ) : view === 'benches' ? (
            <BenchWiseLayout group={group} />
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="sticky top-0 bg-[var(--grit-brown-800)]">
                  <tr>
                    {RESULT_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--grit-gold)]"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => (
                    <tr
                      key={`${row.studentUid}-${row.seatingNo}-${idx}`}
                      className="border-t border-[var(--grit-brown-600)]/30 hover:bg-[var(--grit-brown-700)]/25"
                    >
                      {RESULT_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className="whitespace-nowrap px-4 py-3 text-[var(--grit-cream)]"
                        >
                          {row[col.key] ?? group[col.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {group.unassigned?.length > 0 && (
            <div className="border-t border-[var(--grit-brown-600)]/40 bg-[var(--grit-red-600)]/5 px-6 py-4">
              <p className="mb-2 text-xs font-semibold uppercase text-[var(--grit-red-400)]">
                Unassigned students
              </p>
              <ul className="space-y-1 text-sm text-[var(--grit-cream)]/70">
                {group.unassigned.map((s) => (
                  <li key={s['Student UID']}>
                    {s['Student Name']} — {s.Skill}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
