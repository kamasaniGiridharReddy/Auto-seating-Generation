import { useState } from 'react'
import Card from '../ui/Card'
import { formatGroupTitle } from '../../services/seatingService'
import { sortManualAssignments } from '../../services/manualSeatingService'

const MANUAL_COLUMNS = [
  { key: 'benchLabel', label: 'Bench No' },
  { key: 'seatingNo', label: 'Seating no' },
  { key: 'studentName', label: 'Student name' },
  { key: 'niatId', label: 'NIAT ID' },
  { key: 'roomNo', label: 'Room NO' },
  { key: 'skillCode', label: 'Skill code' },
  { key: 'skill', label: 'Skill' },
]

export default function ManualSeatingGroupResult({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const sorted = sortManualAssignments(group.assignments ?? [])

  return (
    <Card className="overflow-hidden !p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--grit-brown-700)]/30"
      >
        <div>
          <h3 className="font-semibold text-[var(--grit-cream)]">{formatGroupTitle(group)}</h3>
          <p className="mt-1 text-xs text-[var(--grit-cream)]/50">
            {sorted.filter((a) => a.studentName).length} students · Manual Seating Studio
          </p>
        </div>
        <span className="rounded-full bg-[var(--grit-gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--grit-gold)]">
          Manual
        </span>
      </button>

      {open && sorted.length > 0 && (
        <div className="overflow-x-auto border-t border-[var(--grit-brown-600)]/50">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-900)]/40">
                {MANUAL_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--grit-cream)]/45"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={`${row.seatingNo}-${row.studentUid || row.benchNumber}`}
                  className="border-b border-[var(--grit-brown-600)]/25 last:border-0"
                >
                  {MANUAL_COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 text-[var(--grit-cream)]/80">
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
