import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import CsvUploadZone from '../components/upload/CsvUploadZone'
import ValidationAlerts from '../components/upload/ValidationAlerts'
import UploadSummaryCards from '../components/upload/UploadSummaryCards'
import StudentPreviewTable from '../components/upload/StudentPreviewTable'
import Button from '../components/ui/Button'
import { useCsvUpload } from '../hooks/useCsvUpload'
import { saveStudentData } from '../utils/studentStorage'
import { computeSummary } from '../utils/csvValidation'
import { generateSeatingArrangementsAsync } from '../services/seatingService'
import { saveSeatingResults } from '../utils/seatingStorage'
import { loadClassroomConfig } from '../utils/classroomStorage'
import GeneratingOverlay from '../components/ui/GeneratingOverlay'

export default function UploadPage() {
  const navigate = useNavigate()
  const [generateError, setGenerateError] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(null)
  const [debugTrace, setDebugTrace] = useState([])
  const {
    rows,
    fileName,
    errors,
    warnings,
    summary,
    isDragging,
    setIsDragging,
    isParsing,
    emptyValueRows,
    duplicateIds,
    parseFile,
    clearUpload,
    hasUpload,
    canProceed,
  } = useCsvUpload()

  function handleDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  function trace(step, data = null) {
    if (!import.meta.env?.DEV) return
    const line = `${new Date().toLocaleTimeString()} · ${step}${data ? ` · ${JSON.stringify(data)}` : ''}`
    setDebugTrace((t) => [line, ...t].slice(0, 12))
  }

  async function handleGenerateSeating(e) {
    e?.preventDefault?.()
    e?.stopPropagation?.()

    // Temporary debug trace (remove once confirmed in browser console).
    console.log('[GRIT] Generate Seating clicked')
    trace('clicked')
    if (isGenerating) return

    if (!canProceed) {
      setGenerateError('Cannot generate seating while there are CSV validation errors or no rows uploaded.')
      trace('blocked: canProceed=false', { rows: rows.length, errors: errors.length })
      return
    }

    setGenerateError(null)

    const config = loadClassroomConfig()
    setIsGenerating(true)
    setGenerateProgress({ phase: 'starting', current: 0, total: 0 })
    console.log('[GRIT] Starting generation', { rows: rows.length, rooms: config?.classrooms?.length })
    trace('starting', { rows: rows.length, rooms: config?.classrooms?.length })

    saveStudentData({
      fileName,
      rows,
      summary: summary ?? computeSummary(rows),
      warnings,
    })

    try {
      console.log('[GRIT] Calling generateSeatingArrangementsAsync')
      trace('call generateSeatingArrangementsAsync')
      const results = await generateSeatingArrangementsAsync(rows, config, setGenerateProgress)
      console.log('[GRIT] Generation finished', {
        success: results?.success,
        groups: results?.groups?.length,
        assigned: results?.summary?.totalAssigned,
        unassigned: results?.summary?.totalUnassigned,
      })

      if (results.configErrors?.length) {
        setGenerateError(results.configErrors.join(' '))
        trace('blocked: configErrors', { count: results.configErrors.length })
        return
      }

      // Saving to localStorage can fail (quota / serialization). Always navigate with in-memory results.
      try {
        localStorage.setItem('grit-auto-seating-result', JSON.stringify(results))
        console.log('[GRIT] Seating saved to localStorage')
        trace('saved to localStorage')
      } catch (storageErr) {
        console.error('[GRIT] Failed to save seating results to localStorage', storageErr)
        trace('localStorage save failed', { message: storageErr?.message })
      }
      trace('navigate /seating')
      navigate('/seating', { state: { results } })
    } catch (err) {
      console.error('[GRIT] Generation failed', err)
      trace('generation failed', { message: err?.message })
      setGenerateError(err?.message ?? 'Failed to generate seating. Please try again.')
    } finally {
      setIsGenerating(false)
      setGenerateProgress(null)
      trace('done (finally)')
    }
  }

  return (
    <AppLayout>
      {isGenerating && <GeneratingOverlay progress={generateProgress} />}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
            Upload
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--grit-cream)] sm:text-3xl">
            Student CSV upload
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--grit-cream)]/55">
            Import NIAT contest roster. Seating is generated per contest date and time slot;
            students from different sections (S01, S02, …) may share the same room.
          </p>
        </div>

        <div className="space-y-6">
          <CsvUploadZone
            onFileSelect={parseFile}
            isDragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isParsing={isParsing}
            fileName={fileName}
          />

          <ValidationAlerts errors={errors} warnings={warnings} />

          {generateError && (
            <div
              className="rounded-xl border border-[var(--grit-red-400)]/50 bg-[var(--grit-red-600)]/15 px-4 py-3 text-sm text-[var(--grit-red-400)]"
              role="alert"
            >
              {generateError}
            </div>
          )}

          {summary && <UploadSummaryCards summary={summary} />}

          <StudentPreviewTable
            rows={rows}
            emptyValueRows={emptyValueRows}
            duplicateIds={duplicateIds}
          />

          <div className="flex flex-col gap-3 border-t border-[var(--grit-brown-600)]/50 pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="sm:min-w-[180px]"
              >
                Back to Dashboard
              </Button>
              {hasUpload && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    clearUpload()
                    setGenerateError(null)
                  }}
                  className="sm:min-w-[200px] border-[var(--grit-red-400)]/40 text-[var(--grit-red-400)] hover:border-[var(--grit-red-400)]/70"
                >
                  Clear Uploaded CSV
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleGenerateSeating}
              disabled={isGenerating}
              className="sm:min-w-[200px]"
            >
              {isGenerating ? 'Generating seating arrangement…' : 'Generate Seating'}
            </Button>
          </div>

          {import.meta.env?.DEV && debugTrace.length > 0 && (
            <div className="rounded-xl border border-[var(--grit-brown-600)]/50 bg-[var(--grit-brown-900)]/30 px-4 py-3 text-xs text-[var(--grit-cream)]/60">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--grit-gold)]">
                Debug trace (dev only)
              </p>
              <ul className="space-y-1">
                {debugTrace.map((l) => (
                  <li key={l} className="break-words">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
