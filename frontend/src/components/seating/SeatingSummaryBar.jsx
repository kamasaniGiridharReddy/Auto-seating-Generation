import StatsCard from '../dashboard/StatsCard'

export default function SeatingSummaryBar({ summary, config }) {
  if (!summary) return null

  const slotGroupCount = summary.slotGroupCount ?? 1
  const totalAssigned = summary.totalAssigned ?? summary.totalOccupied ?? 0
  const totalUnassigned = summary.totalUnassigned ?? 0
  const fullySeatedGroups = summary.fullySeatedGroups ?? (totalUnassigned === 0 ? slotGroupCount : 0)
  const totalAdjacentConflicts = summary.totalAdjacentConflicts ?? 0

  return (
    <div className="space-y-4">
      {config?.classrooms?.length > 0 && (
        <p className="text-sm text-[var(--grit-cream)]/50">
          Rooms:{' '}
          {config.classrooms
            .map(
              (r) =>
                `${(r.roomName ?? r.roomNumber)} (${r.rows}×${r.columns}×${r.studentsPerBench})`,
            )
            .join(' · ')}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Time slot groups"
          value={slotGroupCount}
          hint="Separate arrangements"
        />
        <StatsCard
          label="Students seated"
          value={totalAssigned}
          hint="With seating numbers"
          accent="red"
        />
        <StatsCard
          label="Unassigned"
          value={totalUnassigned}
          hint="Capacity or skill conflicts"
          accent="cream"
        />
        <StatsCard
          label="Adjacent conflicts"
          value={totalAdjacentConflicts}
          hint="Same skill in consecutive seats"
          accent="red"
        />
        <StatsCard
          label="Groups complete"
          value={`${fullySeatedGroups}/${slotGroupCount}`}
          hint="Fully seated"
        />
      </div>
    </div>
  )
}
