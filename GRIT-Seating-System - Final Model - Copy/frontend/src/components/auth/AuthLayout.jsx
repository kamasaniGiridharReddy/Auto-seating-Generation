import { Link } from 'react-router-dom'
import { BRAND } from '../../utils/constants'

/**
 * Shared auth shell — split hero + form (desktop), stacked (mobile).
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}) {
  return (
    <div className="auth-page-root relative min-h-screen overflow-hidden bg-[var(--grit-brown-900)]">
      {/* Background accents */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(139, 38, 53, 0.35) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(201, 162, 39, 0.12) 0%, transparent 45%)',
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[var(--grit-red-600)]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[var(--grit-gold)]/8 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="flex flex-col justify-between border-b border-[var(--grit-brown-600)]/50 bg-gradient-to-br from-[var(--grit-brown-800)] to-[var(--grit-brown-900)] px-8 py-10 lg:w-[44%] lg:border-b-0 lg:border-r lg:px-12 lg:py-14 xl:w-[42%]">
          <div>
            <div className="flex items-center gap-5">
              <img
                src={BRAND.gritLogo}
                alt="GRIT"
                className="h-12 w-auto object-contain sm:h-14"
              />
              <span className="h-10 w-px bg-[var(--grit-brown-600)]" aria-hidden />
              <img
                src={BRAND.niatLogo}
                alt="NIAT"
                className="h-9 w-auto object-contain sm:h-11"
              />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--grit-gold)]">
              Seating Arrangement System
            </p>
            <h1 className="mt-3 max-w-md text-3xl font-bold leading-tight text-[var(--grit-cream)] sm:text-4xl">
              Smart classrooms.
              <span className="block text-[var(--grit-red-400)]">Fair seating.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--grit-cream)]/65">
              Plan bench layouts, balance skills across rows, and visualize your classroom in 3D —
              built for NIAT educators.
            </p>
          </div>

          <ul className="mt-10 hidden space-y-3 sm:block lg:mt-0">
            {[
              'Skill-aware seating rules',
              'CSV import & Excel export',
              'Interactive 3D classroom view',
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-[var(--grit-cream)]/75"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--grit-red-600)]/30 text-[var(--grit-gold)]">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs text-[var(--grit-cream)]/40 lg:mt-10">
            © GRIT · NIAT · Seating Arrangement
          </p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">
            {/* Mobile logos */}
            <div className="mb-8 flex items-center justify-center gap-4 lg:hidden">
              <img src={BRAND.gritLogo} alt="GRIT" className="h-10 w-auto" />
              <img src={BRAND.niatLogo} alt="NIAT" className="h-8 w-auto" />
            </div>

            <div className="rounded-2xl border border-[var(--grit-brown-600)]/60 bg-[var(--grit-brown-800)]/70 p-8 shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--grit-cream)]">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-2 text-sm text-[var(--grit-cream)]/55">{subtitle}</p>
                )}
              </div>

              {children}

              {footerText && footerLinkText && footerLinkTo && (
                <p className="mt-8 text-center text-sm text-[var(--grit-cream)]/55 lg:text-left">
                  {footerText}{' '}
                  <Link
                    to={footerLinkTo}
                    className="font-semibold text-[var(--grit-gold)] transition-colors hover:text-[var(--grit-red-400)]"
                  >
                    {footerLinkText}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
