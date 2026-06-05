/** Branded button with primary variant and full-width support. */
export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--grit-brown-800)] disabled:cursor-not-allowed disabled:opacity-50'

  const variants = {
    primary:
      'bg-gradient-to-r from-[var(--grit-red-600)] to-[var(--grit-red-500)] text-[var(--grit-cream)] shadow-lg shadow-[var(--grit-red-600)]/25 hover:from-[var(--grit-red-500)] hover:to-[var(--grit-red-400)] hover:shadow-[var(--grit-red-500)]/30 focus:ring-[var(--grit-red-500)]/50 active:scale-[0.98]',
    secondary:
      'border border-[var(--grit-brown-600)] bg-transparent text-[var(--grit-cream)] hover:border-[var(--grit-gold)]/50 hover:bg-[var(--grit-brown-700)]/50 focus:ring-[var(--grit-gold)]/30',
  }

  return (
    <button
      type={type}
      className={`${base} ${variants[variant] ?? variants.primary} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
