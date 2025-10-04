import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useStore } from "../lib/store"

interface DeckFormState {
  title: string
  description: string
  error: string | null
}

function formatCardCount(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`
}

const initialForm: DeckFormState = {
  title: "",
  description: "",
  error: null,
}

export function Decks() {
  const navigate = useNavigate()
  const initialState = useStore.getState()
  const [storeState, setStoreState] = useState(() => ({
    decks: initialState.decks,
    cardsByDeck: initialState.cardsByDeck,
  }))
  const decks = storeState.decks
  const cardsByDeck = storeState.cardsByDeck

  useEffect(() => {
    const unsubscribe = useStore.subscribe(
      (state) => setStoreState({ decks: state.decks, cardsByDeck: state.cardsByDeck })
    )
    return unsubscribe
  }, [])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<DeckFormState>(initialForm)

  const deckSummaries = useMemo(() => {
    return [...decks]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((deck) => ({
        deck,
        cards: cardsByDeck[deck.id] ?? [],
      }))
  }, [decks, cardsByDeck])

  useEffect(() => {
    if (!isModalOpen) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModalOpen(false)
        setForm(initialForm)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen])

  const handleOpenModal = () => {
    setIsModalOpen(true)
    setForm(initialForm)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setForm(initialForm)
  }

  const handleCreateDeck = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = form.title.trim()
    if (!trimmedTitle) {
      setForm((current) => ({ ...current, error: "Please give your deck a calming title." }))
      return
    }

    try {
      useStore.getState().createDeck({
        title: trimmedTitle,
        description: form.description.trim() || undefined,
      })
      handleCloseModal()
    } catch (error) {
      setForm((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to create deck right now.",
      }))
    }
  }

  const handleDeleteDeck = (deckId: string, title: string) => {
    const confirmed = window.confirm(`Delete deck "${title}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }
    useStore.getState().deleteDeck(deckId)
  }

  return (
    <section className="surface-card w-full max-w-5xl text-left">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Your decks</h1>
            <p className="text-sm text-ink-muted">
              Curate mindful study sessions with soft, steady collections.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="chip-button chip-button--primary min-w-[9rem] justify-center px-5 py-2 text-sm hover:brightness-105"
          >
            New deck
          </button>
        </div>

        {deckSummaries.length === 0 ? (
          <div className="surface-panel flex flex-col items-start gap-3 p-6 text-ink">
            <h2 className="text-lg font-semibold">No decks yet</h2>
            <p className="text-sm text-ink-muted">
              Create your first deck to begin a grounded learning ritual.
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="chip-button chip-button--primary px-5 py-2 text-sm hover:brightness-105"
            >
              Create a deck
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {deckSummaries.map(({ deck, cards }) => (
              <article
                key={deck.id}
                className="surface-panel group flex h-full flex-col justify-between gap-5 p-6"
              >
                <header>
                  <p className="text-xs uppercase tracking-[0.35em] text-ink-soft">Deck</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">{deck.title}</h2>
                  {deck.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{deck.description}</p>
                  ) : null}
                </header>
                <footer className="flex flex-col gap-4">
                  <div className="flex items-center justify-between text-sm text-ink-soft">
                    <span>{formatCardCount(cards.length)}</span>
                    <span>Updated {new Date(deck.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/decks/${deck.id}/edit`)}
                      className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/study/${deck.id}`)}
                      className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
                    >
                      Study
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDeck(deck.id, deck.title)}
                      className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm text-ink-muted transition hover:border-[color:var(--color-border-strong)] hover:bg-white/30 hover:text-ink"
                    >
                      Delete
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--color-ink)]/30 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-deck-title"
            className="surface-card w-full max-w-lg p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="new-deck-title" className="text-xl font-semibold text-ink">
                  Create a new deck
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Pair a calming name with an optional description to stay focused.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="chip-button border border-[color:var(--color-border)] px-3 py-1 text-xs hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
              >
                Close
              </button>
            </div>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreateDeck}>
              <label className="flex flex-col gap-2 text-sm text-white">
                <span className="font-medium">Deck title</span>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="rounded-xl border border-[color:var(--color-border)] bg-black px-4 py-2 text-white shadow-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                  placeholder="Sunrise reflections"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-white">
                <span className="font-medium">Description (optional)</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="min-h-[96px] rounded-xl border border-[color:var(--color-border)] bg-black px-4 py-2 text-white shadow-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                  placeholder="Short reminder of the energy this deck should evoke."
                />
              </label>
              {form.error ? <p className="text-sm text-red-500">{form.error}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="chip-button chip-button--primary px-5 py-2 text-sm hover:brightness-105"
                >
                  Create deck
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}



