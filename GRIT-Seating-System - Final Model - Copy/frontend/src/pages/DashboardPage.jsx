import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import StatsCard from '../components/dashboard/StatsCard'
import MultiClassroomEditor from '../components/dashboard/MultiClassroomEditor'
import ClassroomLayoutPreview from '../components/dashboard/ClassroomLayoutPreview'
import Button from '../components/ui/Button'
import { useClassroomConfig } from '../hooks/useClassroomConfig'

export default function DashboardPage() {
  const navigate = useNavigate()
  const {
    classrooms,
    errors,
    stats,
    savedSnapshot,
    saveMessage,
    setSaveMessage,
    addClassroom,
    removeClassroom,
    updateClassroom,
    saveConfiguration,
  } = useClassroomConfig()

  function handleSave() {
    saveConfiguration()
  }

  function handleContinue() {
    setSaveMessage(null)
    if (!saveConfiguration()) return
    navigate('/upload')
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
            Dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--grit-cream)] sm:text-3xl">
            Classroom setup
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--grit-cream)]/55">
            Configure real classroom layouts with rows and columns. Seating numbers run
            sequentially across all rooms.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Classrooms" value={stats.classrooms} hint="Configured rooms" />
          <StatsCard label="Total benches" value={stats.benches} hint="Rows × columns" accent="red" />
          <StatsCard
            label="Total seat capacity"
            value={stats.capacity}
            hint="Across all rooms"
            accent="cream"
          />
          <StatsCard
            label="Students / bench"
            value={stats.studentsPerBench}
            hint="Per room settings"
          />
        </div>

        {saveMessage && (
          <div
            className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--grit-gold)]/30 bg-[var(--grit-gold)]/10 px-4 py-3 text-sm text-[var(--grit-gold)]"
            role="status"
          >
            {saveMessage}
            {savedSnapshot?.savedAt && (
              <span className="text-[var(--grit-cream)]/40">
                · {new Date(savedSnapshot.savedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <MultiClassroomEditor
            classrooms={classrooms}
            errors={errors}
            onUpdate={updateClassroom}
            onAdd={addClassroom}
            onRemove={removeClassroom}
          />
          <ClassroomLayoutPreview classrooms={classrooms} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleSave} className="sm:min-w-[180px]">
            Save Configuration
          </Button>
          <Button type="button" onClick={handleContinue} className="sm:min-w-[220px]">
            Continue to CSV Upload
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
