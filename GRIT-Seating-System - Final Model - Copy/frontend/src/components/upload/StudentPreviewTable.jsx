import Card from '../ui/Card'
import { CSV_PREVIEW_COLUMNS, STUDENT_UID_COLUMN } from '../../utils/constants'

function rowHasIssue(row, emptyValueRows, duplicateIds) {
  const emptyRow = emptyValueRows.find((e) => e.rowIndex === row._rowIndex)
  const isDuplicate = duplicateIds.includes(row[STUDENT_UID_COLUMN])
  return { emptyRow, isDuplicate }
}

export default function StudentPreviewTable({
  rows,
  emptyValueRows = [],
  duplicateIds = [],
}) {
  if (!rows.length) return null

  return (
    <Card title="Student preview" className="overflow-hidden p-0">
      <div className="border-b border-[var(--grit-brown-600)]/50 px-6 py-4">
        <p className="text-sm text-[var(--grit-cream)]/55">
          Showing {rows.length} student{rows.length !== 1 ? 's' : ''} (key columns). Rows with
          warnings are highlighted.
        </p>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--grit-brown-800)]">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--grit-gold)]">
                #
              </th>
              {CSV_PREVIEW_COLUMNS.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--grit-gold)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const { emptyRow, isDuplicate } = rowHasIssue(
                row,
                emptyValueRows,
                duplicateIds,
              )
              const hasWarning = emptyRow || isDuplicate

              return (
                <tr
                  key={`${row[STUDENT_UID_COLUMN]}-${idx}`}
                  className={`border-t border-[var(--grit-brown-600)]/30 ${
                    hasWarning
                      ? 'bg-[var(--grit-gold)]/5'
                      : 'hover:bg-[var(--grit-brown-700)]/30'
                  }`}
                >
                  <td className="px-4 py-3 text-[var(--grit-cream)]/40">{idx + 1}</td>
                  {CSV_PREVIEW_COLUMNS.map((col) => {
                    const isEmpty = emptyRow?.fields?.includes(col)
                    return (
                      <td
                        key={col}
                        className={`whitespace-nowrap px-4 py-3 ${
                          isEmpty
                            ? 'italic text-[var(--grit-gold)]/80'
                            : 'text-[var(--grit-cream)]'
                        } ${col === STUDENT_UID_COLUMN && isDuplicate ? 'font-medium text-[var(--grit-red-400)]' : ''}`}
                      >
                        {row[col] || (isEmpty ? '(empty)' : '—')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
