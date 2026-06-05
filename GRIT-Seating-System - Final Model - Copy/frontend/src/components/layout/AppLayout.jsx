import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'

/** Authenticated app shell. TODO: protect route wrapper. */
export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-[var(--grit-brown-900)] p-6 sm:p-8">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  )
}
