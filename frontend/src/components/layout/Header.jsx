import { BRAND } from '../../utils/constants'

/** App header with GRIT & NIAT logos. TODO: add nav and user menu. */
export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-[var(--grit-brown-600)] bg-[var(--grit-brown-800)] px-6 py-4">
      <div className="flex items-center gap-4">
        <img src={BRAND.gritLogo} alt="GRIT" className="h-10 w-auto" />
        <img src={BRAND.niatLogo} alt="NIAT" className="h-8 w-auto" />
      </div>
      <h1 className="text-sm font-medium text-[var(--grit-gold)] md:text-base">
        {BRAND.name}
      </h1>
      {/* TODO: user menu, logout */}
    </header>
  )
}
