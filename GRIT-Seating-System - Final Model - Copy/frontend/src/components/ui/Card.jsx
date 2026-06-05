/** Premium card container. TODO: extend with header/actions slots. */

export default function Card({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-xl border border-[var(--grit-brown-600)] bg-[var(--grit-brown-800)]/80 p-6 shadow-lg ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-[var(--grit-gold)]">{title}</h2>
      )}
      {children}
    </section>
  )
}
