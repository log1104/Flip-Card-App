import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { type Card, useStore } from "../lib/store"

interface DeckFormState {
  title: string
  description: string
  error: string | null
}

type RowState = {
  id: string
  front: string
  back: string
  isNew?: boolean
  isDirty?: boolean
  error?: string | null
}

const initialForm: DeckFormState = {
  title: "",
  description: "",
  error: null,
}

const DEBOUNCE_MS = 600
const EMPTY_CARDS: Card[] = []

export function DeckEditor() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const updateDeck = useStore((state) => state.updateDeck)
  const addCard = useStore((state) => state.addCard)
  const updateCard = useStore((state) => state.updateCard)
  const deleteCard = useStore((state) => state.deleteCard)

  const deck = useStore((state) => {
    if (!deckId) {
      return null
    }
    return state.decks.find((item) => item.id === deckId) ?? null
  })

  const cards = useStore((state) => {
    if (!deckId) {
      return EMPTY_CARDS
    }
    return state.cardsByDeck[deckId] ?? EMPTY_CARDS
  })

  const [form, setForm] = useState<DeckFormState>(initialForm)
  const headerDirtyRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSavingHeader, setIsSavingHeader] = useState(false)
  const [headerMessage, setHeaderMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!deck) {
      headerDirtyRef.current = false
      setForm(initialForm)
      return
    }
    if (!headerDirtyRef.current) {
      headerDirtyRef.current = false
      setForm({ title: deck.title, description: deck.description ?? "", error: null })
    }
  }, [deck?.id, deck?.updatedAt])

  const trimmedTitle = form.title.trim()
  const trimmedDescription = form.description.trim()
  const deckTitle = deck?.title ?? ""
  const deckDescription = deck?.description ?? ""

  useEffect(() => {
    if (!deck) {
      return
    }
    if (
      trimmedTitle === deckTitle &&
      (trimmedDescription || "") === (deckDescription || "")
    ) {
      return
    }
    headerDirtyRef.current = true
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      void persistHeader()
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedTitle, trimmedDescription, deckTitle, deckDescription, deck?.id])

  async function persistHeader() {
    if (!deck || trimmedTitle === "") {
      return
    }
    if (trimmedTitle === deckTitle && (trimmedDescription || "") === (deckDescription || "")) {
      headerDirtyRef.current = false
      return
    }
    setIsSavingHeader(true)
    setHeaderMessage("Saving.")
    try {
      updateDeck(deck.id, {
        title: trimmedTitle,
        description: trimmedDescription || undefined,
      })
      headerDirtyRef.current = false
      setHeaderMessage("Saved")
      setTimeout(() => setHeaderMessage(null), 1200)
    } catch (error) {
      setForm((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to save deck",
      }))
    } finally {
      setIsSavingHeader(false)
    }
  }


  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})
  const focusRowRef = useRef<string | null>(null)
  const frontRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setRowStates({})
    focusRowRef.current = null
    frontRefs.current = {}
    headerDirtyRef.current = false
  }, [deckId])

  useEffect(() => {
    setRowStates((previous) => {
      let changed = false
      const next: Record<string, RowState> = {}

      cards.forEach((card) => {
        const existing = previous[card.id]
        if (existing && !existing.isDirty && existing.front === card.front && existing.back === card.back) {
          next[card.id] = existing
        } else {
          next[card.id] = {
            id: card.id,
            front: card.front,
            back: card.back,
            isDirty: false,
          }
          if (!existing || existing.front !== card.front || existing.back !== card.back || existing.isDirty) {
            changed = true
          }
        }
      })

      for (const [key, value] of Object.entries(previous)) {
        if (key.startsWith("draft-")) {
          next[key] = value
        }
      }

      if (!changed) {
        const previousKeys = Object.keys(previous)
        const nextKeys = Object.keys(next)
        if (previousKeys.length !== nextKeys.length) {
          changed = true
        } else {
          for (const key of nextKeys) {
            if (previous[key] !== next[key]) {
              changed = true
              break
            }
          }
        }
      }

      return changed ? next : previous
    })
  }, [cards])

  useEffect(() => {
    if (!focusRowRef.current) return
    const rowId = focusRowRef.current
    const ref = frontRefs.current[rowId]
    if (ref) {
      ref.focus()
      ref.select()
    }
    focusRowRef.current = null
  }, [rowStates])

  const rows = useMemo(() => {
    const existing = cards.map((card) => {
      return rowStates[card.id] ?? { id: card.id, front: card.front, back: card.back }
    })
    const drafts = Object.values(rowStates).filter((row) => row.isNew)
    return [...existing, ...drafts]
  }, [cards, rowStates])

  if (!deckId) {
    return (
      <section className="surface-card w-full max-w-4xl text-left">
        <p className="text-sm text-ink">Select a deck to edit.</p>
      </section>
    )
  }

  if (!deck) {
    return (
      <section className="surface-card w-full max-w-4xl text-left">
        <h1 className="mb-3 text-lg font-semibold text-ink">Editing deck: ${deckId ?? ""}</h1>
        <p className="text-sm text-ink">Deck not found.</p>
      </section>
    )
  }

  const handleTitleChange = (value: string) => {
    headerDirtyRef.current = true
    setForm((current) => ({ ...current, title: value, error: null }))
  }

  const handleDescriptionChange = (value: string) => {
    headerDirtyRef.current = true
    setForm((current) => ({ ...current, description: value, error: null }))
  }

  const handleRowChange = (id: string, field: "front" | "back", value: string) => {
    setRowStates((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? { id, front: "", back: "", isNew: id.startsWith("draft-") }),
        [field]: value,
        isDirty: true,
        error: null,
      },
    }))
  }

  const handleAddRow = () => {
    const newId = `draft-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
    setRowStates((current) => ({
      ...current,
      [newId]: {
        id: newId,
        front: "",
        back: "",
        isNew: true,
        isDirty: true,
        error: null,
      },
    }))
    focusRowRef.current = newId
  }

  const handleDeleteRow = (id: string, title: string) => {
    const row = rowStates[id]
    if (!row) return
    if (row.isNew) {
      setRowStates((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      return
    }
    const confirmed = window.confirm(`Delete card "${title}"?`)
    if (!confirmed) return
    deleteCard(deck.id, id)
  }

  const handleSaveRow = (id: string) => {
    const row = rowStates[id]
    if (!row) return
    const front = row.front.trim()
    const back = row.back.trim()
    if (!front || !back) {
      setRowStates((current) => ({
        ...current,
        [id]: { ...row, error: "Front and back are required." },
      }))
      return
    }
    if (row.isNew) {
      addCard(deck.id, { front, back })
      setRowStates((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
    } else {
      updateCard(deck.id, id, { front, back })
      setRowStates((current) => ({
        ...current,
        [id]: { ...row, front, back, isDirty: false, error: null },
      }))
    }
  }

  const handleRowKeyDown = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key !== "Enter") return
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      handleAddRow()
      return
    }
    if (!event.shiftKey) {
      event.preventDefault()
      handleSaveRow(id)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
  }

  const headerSavingLabel = isSavingHeader ? "Saving." : headerMessage ?? ""

  return (
    <section className="surface-card w-full max-w-5xl text-left">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate("/decks")}
            className="self-start rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs text-ink-muted transition hover:border-[color:var(--color-border-strong)] hover:bg-white/60"
          >
            ? Back to decks
          </button>
          <h1 className="text-xl font-semibold text-ink">Editing deck: <span className="text-ink-muted">{deck.title || deckId}</span></h1>
          <form className="grid gap-4 rounded-2xl border border-[color:var(--color-border)] bg-black p-5 shadow-sm" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm text-white">
              <span className="font-semibold">Deck title</span>
              <input
                value={form.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                className="rounded-xl border border-[color:var(--color-border)] bg-black px-4 py-2 text-lg font-semibold text-white shadow-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                placeholder="Mindful moments"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-white">
              <span className="font-semibold">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => handleDescriptionChange(event.target.value)}
                className="min-h-[96px] rounded-xl border border-[color:var(--color-border)] bg-black px-4 py-2 text-sm leading-relaxed text-white shadow-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                placeholder="Gentle prompts to keep sessions serene."
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
              <div>{headerSavingLabel}</div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="chip-button chip-button--primary px-4 py-2 text-sm hover:brightness-105"
                  disabled={trimmedTitle === deckTitle && (trimmedDescription || "") === (deckDescription || "")}
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
                >
                  Add card
                </button>
              </div>
            </div>
            {form.error ? <p className="text-sm text-red-500">{form.error}</p> : null}
          </form>
        </header>

        <div className="grid gap-4">
          {rows.map((row, index) => {
            const isDraft = row.isNew === true
            const titleLabel = isDraft ? `Draft card ${index + 1}` : `Card ${index + 1}`
            const cardId = row.id
            return (
              <article key={cardId} className="surface-panel flex flex-col gap-4 p-5 shadow-sm">
                <div className="flex items-center justify-between text-sm text-ink-muted">
                  <span>{titleLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRow(cardId, row.front || "this card")}
                    className="chip-button border border-[color:var(--color-border)] px-3 py-1 text-xs text-ink-muted hover:border-[color:var(--color-border-strong)] hover:bg-white/40 hover:text-ink"
                  >
                    Delete
                  </button>
                </div>
                <label className="flex flex-col gap-2 text-sm text-white">
                  <span className="font-medium">Front</span>
                  <input
                    ref={(element) => {
                      frontRefs.current[cardId] = element
                    }}
                    value={row.front}
                    onChange={(event) => handleRowChange(cardId, "front", event.target.value)}
                    onKeyDown={(event) => handleRowKeyDown(event, cardId)}
                    className="rounded-xl border border-[color:var(--color-border)] bg-black px-4 py-2 text-white shadow-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                    placeholder="Question or prompt"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white">
                  <span className="font-medium">Back</span>
                  <textarea
                    value={row.back}
                    onChange={(event) => handleRowChange(cardId, "back", event.target.value)}
                    onKeyDown={(event) => handleRowKeyDown(event, cardId)}
                    rows={4}
                    className="rounded-xl border border-[color:var(--color-border)] bg-black px-4 py-2 text-sm leading-relaxed text-white shadow-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                    placeholder="Answer, reflection, or calming reminder"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {row.error ? <span className="text-sm text-red-500">{row.error}</span> : <span />}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveRow(cardId)}
                      className="chip-button chip-button--primary px-4 py-2 text-sm hover:brightness-105"
                    >
                      Save card
                    </button>
                    {!isDraft ? (
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
                      >
                        Add next
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}









