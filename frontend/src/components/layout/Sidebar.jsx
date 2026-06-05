import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Upload CSV', path: '/upload' },
  { label: 'Auto Seating', path: '/seating' },
  { label: 'Manual Seating Studio', path: '/manual-seating' },
  { label: '3D View', path: '/visualization' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-[var(--grit-brown-600)] bg-[var(--grit-brown-800)] p-4 lg:w-60">
      <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--grit-cream)]/35">
        Menu
      </p>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--grit-red-600)]/25 text-[var(--grit-gold)] ring-1 ring-[var(--grit-red-500)]/30'
                  : 'text-[var(--grit-cream)]/75 hover:bg-[var(--grit-brown-700)] hover:text-[var(--grit-cream)]'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
