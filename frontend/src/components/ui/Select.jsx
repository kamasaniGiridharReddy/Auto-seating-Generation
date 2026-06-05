/** Branded select dropdown. */
export default function Select({
  label,
  id,
  options,
  error,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--grit-cream)]/85">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full appearance-none rounded-xl border bg-[var(--grit-brown-900)]/60 px-4 py-3 pr-10 text-[var(--grit-cream)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--grit-brown-800)] ${
          error
            ? 'border-[var(--grit-red-400)] focus:ring-[var(--grit-red-500)]/40'
            : 'border-[var(--grit-brown-600)] focus:border-[var(--grit-red-500)] focus:ring-[var(--grit-red-500)]/30'
        } ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[var(--grit-brown-900)]">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs text-[var(--grit-red-400)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
