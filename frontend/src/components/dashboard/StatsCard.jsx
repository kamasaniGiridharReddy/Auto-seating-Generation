/** Dashboard summary stat card. */
export default function StatsCard({ label, value, hint, accent = 'gold' }) {
  const accentClass =
    accent === 'red'
      ? 'text-[var(--grit-red-400)]'
      : accent === 'cream'
        ? 'text-[var(--grit-cream)]'
        : 'text-[var(--grit-gold)]'

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--grit-brown-600)]/80 bg-gradient-to-br from-[var(--grit-brown-800)] to-[var(--grit-brown-900)] p-5 shadow-lg transition-shadow hover:shadow-[var(--grit-red-600)]/10">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--grit-red-600)]/10 blur-2xl transition-opacity group-hover:opacity-80"
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--grit-cream)]/55">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accentClass}`}>
        {value ?? '—'}
      </p>
      {hint && <p className="mt-1.5 text-xs text-[var(--grit-cream)]/40">{hint}</p>}
    </div>
  )
}
