import { useRef } from 'react'
import Card from '../ui/Card'
import { CSV_COLUMNS } from '../../utils/constants'

export default function CsvUploadZone({
  onFileSelect,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  isParsing,
  fileName,
}) {
  const inputRef = useRef(null)

  function handleFile(file) {
    if (file) onFileSelect(file)
  }

  return (
    <Card title="Upload student CSV">
      <p className="mb-4 text-sm text-[var(--grit-cream)]/55">
        Mandatory columns:{' '}
        <span className="font-medium text-[var(--grit-gold)]">{CSV_COLUMNS.join(' · ')}</span>
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-[var(--grit-gold)] bg-[var(--grit-gold)]/10'
            : 'border-[var(--grit-brown-600)] bg-[var(--grit-brown-900)]/50 hover:border-[var(--grit-red-500)]/50 hover:bg-[var(--grit-brown-900)]/80'
        }`}
      >
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            isDragging ? 'bg-[var(--grit-gold)]/20' : 'bg-[var(--grit-red-600)]/20'
          }`}
        >
          <svg
            className={`h-7 w-7 ${isDragging ? 'text-[var(--grit-gold)]' : 'text-[var(--grit-red-400)]'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {isParsing ? (
          <p className="text-sm font-medium text-[var(--grit-gold)]">Parsing CSV…</p>
        ) : (
          <>
            <p className="text-base font-medium text-[var(--grit-cream)]">
              Drag and drop your CSV here
            </p>
            <p className="mt-1 text-sm text-[var(--grit-cream)]/45">or click to browse files</p>
          </>
        )}

        {fileName && !isParsing && (
          <p className="mt-4 rounded-lg bg-[var(--grit-brown-800)] px-3 py-1.5 text-xs text-[var(--grit-cream)]/70">
            Current file: <span className="font-medium text-[var(--grit-gold)]">{fileName}</span>
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
          disabled={isParsing}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[var(--grit-red-600)] to-[var(--grit-red-500)] px-5 py-2.5 text-sm font-semibold text-[var(--grit-cream)] shadow-lg shadow-[var(--grit-red-600)]/20 transition-all hover:from-[var(--grit-red-500)] hover:to-[var(--grit-red-400)] disabled:opacity-50"
        >
          Upload CSV
        </button>
        <p className="text-xs text-[var(--grit-cream)]/40">Accepted format: .csv with header row</p>
      </div>
    </Card>
  )
}
