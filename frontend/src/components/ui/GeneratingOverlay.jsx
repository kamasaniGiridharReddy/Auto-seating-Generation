/** Full-screen loading overlay during async seating generation. */

export default function GeneratingOverlay({ message = 'Generating seating arrangement...', progress }) {
  const pct =
    progress?.total > 0 ? Math.round((progress.current / progress.total) * 100) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--grit-brown-900)]/85 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-4 max-w-sm rounded-2xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-800)] px-8 py-8 text-center shadow-2xl">
        <div
          className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[var(--grit-brown-600)] border-t-[var(--grit-gold)]"
          aria-hidden
        />
        <p className="text-base font-semibold text-[var(--grit-cream)]">{message}</p>
        {progress?.phase === 'generating' && progress.label && (
          <p className="mt-2 text-xs text-[var(--grit-cream)]/50">{progress.label}</p>
        )}
        {pct != null && (
          <p className="mt-3 text-xs text-[var(--grit-gold)]">
            Slot {progress.current} of {progress.total}
            {pct > 0 && ` · ${pct}%`}
          </p>
        )}
      </div>
    </div>
  )
}
