import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { type Card, useStore } from "../lib/store"

const EMPTY_CARDS: Card[] = []

type StudyMode = "ordered" | "shuffle"


function shuffleIds(ids: string[]) {
  const copy = [...ids]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const random = Math.random()
    const swapIndex = Math.floor(random * (index + 1))
    const temp = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = temp
  }
  return copy
}

function getFrontLabel(deckTitle?: string) {
  if (!deckTitle) return "Prompt"
  const normalized = deckTitle.toLowerCase()
  if (normalized.includes("bible") || normalized.includes("verse")) {
    return "Reference"
  }
  if (
    normalized.includes("language") ||
    normalized.includes("vocab") ||
    normalized.includes("phrase") ||
    normalized.includes("translation")
  ) {
    return "Phrase"
  }
  return "Prompt"
}

export function Study() {
  const { deckId } = useParams<{ deckId: string }>()

  const deck = useStore((state) => {
    if (!deckId) return null
    return state.decks.find((item) => item.id === deckId) ?? null
  })

  const cards = useStore((state) => {
    if (!deckId) return EMPTY_CARDS
    return state.cardsByDeck[deckId] ?? EMPTY_CARDS
  })

  const cardOrder = useMemo(() => cards.map((card) => card.id), [cards])
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards])

  const [mode, setMode] = useState<StudyMode>("ordered")
  const [sessionOrder, setSessionOrder] = useState<string[]>(cardOrder)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const cardCount = sessionOrder.length
  const currentCardId = sessionOrder[currentIndex]
  const currentCard = currentCardId ? cardMap.get(currentCardId) ?? null : null
  const frontLabel = getFrontLabel(deck?.title)
  const backLabel = frontLabel === "Reference" ? "Explanation" : frontLabel === "Phrase" ? "Translation" : "Answer"

  const applyOrder = useCallback(
    (kind: StudyMode) => {
      if (!cardOrder.length) {
        setSessionOrder([])
        setCurrentIndex(0)
        setIsFlipped(false)
        return
      }
      if (kind === "shuffle") {
        setSessionOrder(shuffleIds(cardOrder))
      } else {
        setSessionOrder(cardOrder)
      }
      setCurrentIndex(0)
      setIsFlipped(false)
    },
    [cardOrder],
  )

  useEffect(() => {
    applyOrder(mode)
  }, [applyOrder, mode])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return
      }

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault()
        setIsFlipped((previous) => !previous)
        return
      }

      const lowered = event.key.toLowerCase()
      if (lowered === "arrowright") {
        event.preventDefault()
        if (cardCount) {
          setCurrentIndex((index) => (index + 1) % cardCount)
          setIsFlipped(false)
        }
        return
      }
      if (lowered === "arrowleft") {
        event.preventDefault()
        if (cardCount) {
          setCurrentIndex((index) => (index - 1 + cardCount) % cardCount)
          setIsFlipped(false)
        }
        return
      }
      if (lowered === "r") {
        event.preventDefault()
        applyOrder(mode)
        return
      }
      if (lowered === "s") {
        event.preventDefault()
        setMode((current) => (current === "shuffle" ? "ordered" : "shuffle"))
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [applyOrder, cardCount, mode])

  const handleNext = () => {
    if (!cardCount) return
    setCurrentIndex((index) => (index + 1) % cardCount)
    setIsFlipped(false)
  }

  const handlePrev = () => {
    if (!cardCount) return
    setCurrentIndex((index) => (index - 1 + cardCount) % cardCount)
    setIsFlipped(false)
  }

  const handleRestart = () => {
    applyOrder(mode)
  }

  const activateShuffle = () => {
    if (mode === "shuffle") {
      applyOrder("shuffle")
    } else {
      setMode("shuffle")
    }
  }

  const activateOrdered = () => {
    if (mode === "ordered") {
      applyOrder("ordered")
    } else {
      setMode("ordered")
    }
  }

  if (!deckId) {
    return (
      <section className="surface-card w-full max-w-4xl text-left">
        <p className="text-sm text-ink">Choose a collection to study.</p>
      </section>
    )
  }

  if (!deck) {
    return (
      <section className="surface-card w-full max-w-4xl text-left">
        <h1 className="mb-3 text-lg font-semibold text-ink">Study session unavailable</h1>
        <p className="text-sm text-ink">Collection "{deckId}" was not found.</p>
      </section>
    )
  }

  if (!cardCount) {
    return (
      <section className="surface-card w-full max-w-4xl text-left">
        <h1 className="text-2xl font-semibold text-ink">{deck.title}</h1>
        <p className="text-sm text-ink-muted">Add cards to begin this session.</p>
      </section>
    )
  }

  const progressLabel = `Card ${currentIndex + 1} of ${cardCount}`
  const faceLabel = isFlipped ? backLabel : frontLabel
  const faceText = isFlipped ? currentCard?.back ?? "" : currentCard?.front ?? ""

  return (
    <section className="surface-card w-full max-w-4xl text-left">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{deck.title}</h1>
          </div>
          <span data-testid="study-progress" className="text-sm font-medium text-ink">
            {progressLabel}
          </span>
        </header>

        <article 
          className="surface-panel relative flex flex-col gap-4 rounded-2xl p-6 shadow-sm cursor-pointer" 
          aria-live="polite"
          onClick={() => {
            if (!currentCard) return
            setIsFlipped((previous) => !previous)
          }}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-ink-muted" aria-hidden>
            {faceLabel}
          </div>
          <p data-testid="study-card-text" className="min-h-[112px] text-lg leading-relaxed text-white font-bold">
            {faceText}
          </p>
          <div className="mt-4 flex items-center justify-between" role="group" aria-label="Study controls">
            <button
              type="button"
              onClick={handlePrev}
              className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-lg hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
              aria-label="Previous card"
            >
              ←
            </button>
            
            <span className="text-sm font-medium text-ink">
              {currentIndex + 1} / {cardCount}
            </span>
            
            <button
              type="button"
              onClick={handleNext}
              className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-lg hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
              aria-label="Next card"
            >
              →
            </button>
            
            <button
              type="button"
              onClick={handleRestart}
              className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
              aria-label="Restart session"
            >
              Restart
            </button>
          </div>
        </article>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Deck order controls">
          <button
            type="button"
            onClick={activateOrdered}
            className={`chip-button border px-4 py-2 text-sm transition ${
              mode === "ordered"
                ? "chip-button--primary border-transparent hover:brightness-105"
                : "border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
            }`}
            aria-pressed={mode === "ordered"}
            aria-label="Use ordered card sequence"
          >
            Ordered
          </button>
          <button
            type="button"
            onClick={activateShuffle}
            className={`chip-button border px-4 py-2 text-sm transition ${
              mode === "shuffle"
                ? "chip-button--primary border-transparent hover:brightness-105"
                : "border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
            }`}
            aria-pressed={mode === "shuffle"}
            aria-label="Shuffle card order"
          >
            Shuffle
          </button>
        </div>
      </div>
    </section>
  )
}

