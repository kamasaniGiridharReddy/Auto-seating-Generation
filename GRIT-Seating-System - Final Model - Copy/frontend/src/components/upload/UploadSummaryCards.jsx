import StatsCard from '../dashboard/StatsCard'

export default function UploadSummaryCards({ summary }) {
  if (!summary) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        label="Total students"
        value={summary.totalStudents}
        hint="Rows in uploaded CSV"
      />
      <StatsCard
        label="Skills count"
        value={summary.skillsCount}
        hint="Unique skills"
        accent="red"
      />
      <StatsCard
        label="Sections"
        value={summary.sectionCount}
        hint="Unique sections"
        accent="cream"
      />
      <StatsCard
        label="Time slot groups"
        value={summary.slotGroupCount}
        hint="Date + slot + section"
      />
    </div>
  )
}
