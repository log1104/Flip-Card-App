import { NavLink, Route, Routes } from "react-router-dom"
import { DeckEditor } from "./pages/DeckEditor"
import { Decks } from "./pages/Decks"
import { Home } from "./pages/Home"
import { ImportExport } from "./pages/ImportExport"
import { Study } from "./pages/Study"

const navItems = [
  { label: "Home", to: "/", end: true },
  { label: "Decks", to: "/decks" },
  { label: "Import/Export", to: "/import-export" },
]

function navClasses(isActive: boolean) {
  const base = "chip-button focus-visible:outline-ink"
  const active = "chip-button--primary hover:brightness-105"
  const inactive = "border border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
  return `${base} ${isActive ? active : inactive}`
}

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] backdrop-blur">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-sage)] text-lg font-semibold text-ink shadow-sm">
              FC
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-ink-soft">
                Flipcard
              </span>
              <span className="text-sm text-ink-muted">Design tranquil study flows</span>
            </div>
          </div>

          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            {navItems.map(({ label, to, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => navClasses(isActive)}>
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/decks/:deckId/edit" element={<DeckEditor />} />
          <Route path="/study/:deckId" element={<Study />} />
          <Route path="/import-export" element={<ImportExport />} />
        </Routes>
      </main>

      <footer className="border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] backdrop-blur" role="contentinfo">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-center text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:text-left sm:px-6">
          <span>&copy; {new Date().getFullYear()} Flipcard. Crafted for calmer study sessions.</span>
          <span className="text-xs text-ink-muted">
            Need ideas? Start with mindful breathing before each review cycle.
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
