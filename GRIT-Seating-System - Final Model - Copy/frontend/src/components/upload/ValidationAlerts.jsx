export default function ValidationAlerts({ errors = [], warnings = [] }) {
  if (!errors.length && !warnings.length) return null

  return (
    <div className="space-y-3">
      {errors.map((msg) => (
        <div
          key={`err-${msg}`}
          role="alert"
          className="flex gap-3 rounded-xl border border-[var(--grit-red-400)]/50 bg-[var(--grit-red-600)]/15 px-4 py-3 text-sm text-[var(--grit-red-400)]"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{msg}</span>
        </div>
      ))}
      {warnings.map((msg) => (
        <div
          key={`warn-${msg}`}
          role="status"
          className="flex gap-3 rounded-xl border border-[var(--grit-gold)]/40 bg-[var(--grit-gold)]/10 px-4 py-3 text-sm text-[var(--grit-gold)]"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{msg}</span>
        </div>
      ))}
    </div>
  )
}
