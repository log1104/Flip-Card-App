import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createDeck, addCard, loadStore, saveStore, type StoreState } from './store'

const BASE_TIMESTAMP = '2024-01-01T00:00:00.000Z'
const SETTINGS = {
  defaultStudyMode: 'ordered' as const,
  rememberLastDeck: false,
  reducedMotion: false,
  lastDeckId: undefined,
}

function baseStore(): StoreState {
  return {
    decks: [
      {
        id: 'deck-existing',
        title: 'Existing Deck',
        description: 'Original description',
        createdAt: BASE_TIMESTAMP,
        updatedAt: BASE_TIMESTAMP,
      },
    ],
    cardsByDeck: {
      'deck-existing': [],
    },
    settings: { ...SETTINGS },
  }
}

describe('store utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
    window.localStorage.clear()
    saveStore(baseStore())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('creates a deck with trimmed metadata and persists empty cards', () => {
    const mockId = '00000000-0000-0000-0000-00000000de01'
    const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(mockId)

    const { deck, store } = createDeck({ title: '  Calm Flow  ', description: '  steady focus  ' })

    expect(uuidSpy).toHaveBeenCalledTimes(1)
    expect(deck).toMatchObject({
      id: mockId,
      title: 'Calm Flow',
      description: 'steady focus',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    expect(store.cardsByDeck[mockId]).toEqual([])

    const persisted = loadStore()
    expect(persisted.decks.find((item) => item.id === mockId)).toBeTruthy()
    expect(persisted.cardsByDeck[mockId]).toEqual([])
  })

  it('adds a card with trimmed content and updates deck timestamp', () => {
    const deckId = 'deck-existing'
    const mockCardId = '00000000-0000-0000-0000-00000000ca12'
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(mockCardId)

    const { card, store } = addCard(deckId, {
      front: '  Front prompt  ',
      back: '  Back response  ',
    })

    expect(card).toEqual({ id: mockCardId, front: 'Front prompt', back: 'Back response' })
    expect(store.cardsByDeck[deckId]).toHaveLength(1)
    expect(store.cardsByDeck[deckId]?.[0]).toEqual(card)

    const deck = store.decks.find((item) => item.id === deckId)
    expect(deck?.updatedAt).toBe(new Date().toISOString())
  })
})


