import { create } from "zustand"
import { z } from "zod"

export interface Deck {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Card {
  id: string
  front: string
  back: string
}

export interface Settings {
  defaultStudyMode: "ordered" | "shuffle"
  rememberLastDeck: boolean
  reducedMotion: boolean
  lastDeckId?: string
}

export interface StoreState {
  decks: Deck[]
  cardsByDeck: Record<string, Card[]>
  settings: Settings
}

const STORAGE_KEY = "flipcard.store"

const defaultSettings: Settings = {
  defaultStudyMode: "ordered",
  rememberLastDeck: false,
  reducedMotion: false,
  lastDeckId: undefined,
}

const isoDateString = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Expected ISO 8601 date string",
  })

const deckSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.trim() === "" ? undefined : value.trim())),
  createdAt: isoDateString,
  updatedAt: isoDateString,
})

const cardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
})

const settingsSchema = z.object({
  defaultStudyMode: z.enum(["ordered", "shuffle"]).catch(defaultSettings.defaultStudyMode),
  rememberLastDeck: z.boolean().catch(defaultSettings.rememberLastDeck),
  reducedMotion: z.boolean().catch(defaultSettings.reducedMotion),
  lastDeckId: z.string().optional().nullable().transform((value) => (value ?? undefined)),
})

const storeSchema = z
  .object({
    decks: z.array(deckSchema),
    cardsByDeck: z.record(z.string(), z.array(cardSchema)),
    settings: settingsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    for (const deck of data.decks) {
      if (!data.cardsByDeck[deck.id]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing cards array for deck ${deck.id}`,
        })
      }
    }
  })

type ValidStore = z.infer<typeof storeSchema>

function cloneStore(store: StoreState): StoreState {
  return {
    decks: store.decks.map((deck) => ({ ...deck })),
    cardsByDeck: Object.fromEntries(
      Object.entries(store.cardsByDeck).map(([deckId, cards]) => [
        deckId,
        cards.map((card) => ({ ...card })),
      ]),
    ),
    settings: { ...store.settings },
  }
}

function hasLocalStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage
  } catch {
    return false
  }
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10)
}

function createSampleStore(): StoreState {
  const now = new Date().toISOString()
  const deckId1 = generateId()
  const deckId2 = generateId()
  return {
    decks: [
      {
        id: deckId1,
        title: "Mindful Moments",
        description: "Quick grounding prompts for serene study sessions.",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: deckId2,
        title: "Bible Verses",
        description: "Scripture references and verses for meditation and study.",
        createdAt: now,
        updatedAt: now,
      },
    ],
    cardsByDeck: {
      [deckId1]: [
        {
          id: generateId(),
          front: "Breathing cadence",
          back: "Inhale 4, hold 4, exhale 6 to reset focus.",
        },
        {
          id: generateId(),
          front: "Posture cue",
          back: "Relax your shoulders and lengthen your spine.",
        },
        {
          id: generateId(),
          front: "Micro-break idea",
          back: "Stand, stretch, and sip water between review blocks.",
        },
      ],
      [deckId2]: [
        {
          id: generateId(),
          front: "Philippians 4:13",
          back: "I can do all things through Christ who strengthens me.",
        },
        {
          id: generateId(),
          front: "Jeremiah 29:11",
          back: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.",
        },
        {
          id: generateId(),
          front: "Romans 8:28",
          back: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.",
        },
        {
          id: generateId(),
          front: "Psalm 23:1",
          back: "The Lord is my shepherd; I shall not want.",
        },
        {
          id: generateId(),
          front: "Isaiah 41:10",
          back: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.",
        },
        {
          id: generateId(),
          front: "Proverbs 3:5-6",
          back: "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.",
        },
        {
          id: generateId(),
          front: "Matthew 11:28",
          back: "Come to me, all who labor and are heavy laden, and I will give you rest.",
        },
        {
          id: generateId(),
          front: "Joshua 1:9",
          back: "Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.",
        },
        {
          id: generateId(),
          front: "Psalm 46:10",
          back: "Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!",
        },
        {
          id: generateId(),
          front: "1 Corinthians 13:4-5",
          back: "Love is patient and kind; love does not envy or boast; it is not arrogant or rude. It does not insist on its own way; it is not irritable or resentful.",
        },
      ],
    },
    settings: { ...defaultSettings },
  }
}

function normalizeSettings(settings: Partial<Settings> | undefined): Settings {
  const merged = { ...defaultSettings, ...(settings ?? {}) }
  const defaultStudyMode = merged.defaultStudyMode === "shuffle" ? "shuffle" : "ordered"
  const rememberLastDeck = Boolean(merged.rememberLastDeck)
  const reducedMotion = Boolean(merged.reducedMotion)
  const lastDeckId = rememberLastDeck ? merged.lastDeckId : undefined
  return {
    defaultStudyMode,
    rememberLastDeck,
    reducedMotion,
    lastDeckId,
  }
}

function normalizeStore(store: StoreState | ValidStore): StoreState {
  const decks = store.decks.map((deck) => ({
    ...deck,
    title: deck.title.trim(),
    description: deck.description?.trim() || undefined,
    createdAt: new Date(deck.createdAt).toISOString(),
    updatedAt: new Date(deck.updatedAt).toISOString(),
  }))

  const cardsByDeck: Record<string, Card[]> = {}
  for (const deck of decks) {
    const cards = store.cardsByDeck[deck.id] ?? []
    cardsByDeck[deck.id] = cards.map((card) => ({
      ...card,
      front: card.front.trim(),
      back: card.back.trim(),
    }))
  }

  const settings = normalizeSettings((store as StoreState).settings)

  return {
    decks,
    cardsByDeck,
    settings,
  }
}

function persist(store: StoreState) {
  if (!hasLocalStorage()) {
    return
  }
  const validated = storeSchema.parse(store)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
}

function hydrateFromStorage(): StoreState {
  if (!hasLocalStorage()) {
    return normalizeStore(createSampleStore())
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const sample = normalizeStore(createSampleStore())
    persist(sample)
    return sample
  }

  try {
    const parsed = storeSchema.parse(JSON.parse(raw)) as ValidStore
    if (parsed.decks.length === 0) {
      throw new Error("Empty store")
    }
    const normalized = normalizeStore({ ...parsed, settings: parsed.settings ?? defaultSettings })
    persist(normalized)
    return normalized
  } catch {
    const sample = normalizeStore(createSampleStore())
    persist(sample)
    return sample
  }
}

let inMemoryStore: StoreState = cloneStore(hydrateFromStorage())

function snapshot(): StoreState {
  return cloneStore(inMemoryStore)
}

function rehydrateInMemory(): StoreState {
  inMemoryStore = cloneStore(hydrateFromStorage())
  return snapshot()
}

export function loadStore(): StoreState {
  return snapshot()
}

export function saveStore(store: StoreState): void {
  const normalized = normalizeStore(store)
  inMemoryStore = cloneStore(normalized)
  persist(normalized)
}

function mutateStore<T>(mutator: (draft: StoreState) => T): { store: StoreState; result: T } {
  const draft = snapshot()
  const mutationResult = mutator(draft)
  const normalized = normalizeStore(draft)
  inMemoryStore = cloneStore(normalized)
  persist(normalized)
  const result =
    typeof mutationResult === "object" && mutationResult !== null
      ? (JSON.parse(JSON.stringify(mutationResult)) as T)
      : mutationResult
  return { store: snapshot(), result }
}

export function listDecks(): Deck[] {
  return [...loadStore().decks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getDeck(deckId: string): Deck | undefined {
  const deck = loadStore().decks.find((item) => item.id === deckId)
  return deck ? { ...deck } : undefined
}

export interface CreateDeckInput {
  title: string
  description?: string
}

export function createDeck(input: CreateDeckInput): { deck: Deck; store: StoreState } {
  const trimmedTitle = input.title.trim()
  if (!trimmedTitle) {
    throw new Error("Deck title is required")
  }

  const now = new Date().toISOString()

  const outcome = mutateStore<Deck>((draft) => {
    const deck: Deck = {
      id: generateId(),
      title: trimmedTitle,
      description: input.description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    draft.decks.push(deck)
    draft.cardsByDeck[deck.id] = []
    return deck
  })

  return { deck: outcome.result, store: outcome.store }
}

export interface UpdateDeckInput {
  title?: string
  description?: string | null
}

export function updateDeck(deckId: string, changes: UpdateDeckInput): { deck: Deck; store: StoreState } {
  const now = new Date().toISOString()

  const outcome = mutateStore<Deck>((draft) => {
    const deck = draft.decks.find((item) => item.id === deckId)
    if (!deck) {
      throw new Error(`Deck ${deckId} not found`)
    }

    if (typeof changes.title === "string") {
      const trimmed = changes.title.trim()
      if (!trimmed) {
        throw new Error("Deck title cannot be empty")
      }
      deck.title = trimmed
    }

    if (typeof changes.description === "string") {
      deck.description = changes.description.trim() || undefined
    } else if (changes.description === null) {
      deck.description = undefined
    }

    deck.updatedAt = now
    return deck
  })

  return { deck: outcome.result, store: outcome.store }
}

export function deleteDeck(deckId: string): { store: StoreState } {
  const outcome = mutateStore<void>((draft) => {
    const deckIndex = draft.decks.findIndex((item) => item.id === deckId)
    if (deckIndex === -1) {
      throw new Error(`Deck ${deckId} not found`)
    }
    draft.decks.splice(deckIndex, 1)
    delete draft.cardsByDeck[deckId]
    if (draft.settings.lastDeckId === deckId) {
      draft.settings.lastDeckId = undefined
    }
  })

  return { store: outcome.store }
}

export interface CardInput {
  front: string
  back: string
}

export function listCards(deckId: string): Card[] {
  return (loadStore().cardsByDeck[deckId] ?? []).map((card) => ({ ...card }))
}

export function addCard(deckId: string, input: CardInput): { card: Card; store: StoreState } {
  const trimmedFront = input.front.trim()
  const trimmedBack = input.back.trim()
  if (!trimmedFront || !trimmedBack) {
    throw new Error("Card front and back are required")
  }

  const now = new Date().toISOString()

  const outcome = mutateStore<Card>((draft) => {
    const deck = draft.decks.find((item) => item.id === deckId)
    if (!deck) {
      throw new Error(`Deck ${deckId} not found`)
    }

    const card: Card = {
      id: generateId(),
      front: trimmedFront,
      back: trimmedBack,
    }

    const cards = draft.cardsByDeck[deck.id] ?? []
    cards.push(card)
    draft.cardsByDeck[deck.id] = cards
    deck.updatedAt = now
    return card
  })

  return { card: outcome.result, store: outcome.store }
}

export interface UpdateCardInput {
  front?: string
  back?: string
}

export function updateCard(
  deckId: string,
  cardId: string,
  changes: UpdateCardInput,
): { card: Card; store: StoreState } {
  const now = new Date().toISOString()

  const outcome = mutateStore<Card>((draft) => {
    const deck = draft.decks.find((item) => item.id === deckId)
    if (!deck) {
      throw new Error(`Deck ${deckId} not found`)
    }

    const cards = draft.cardsByDeck[deck.id] ?? []
    const card = cards.find((item) => item.id === cardId)
    if (!card) {
      throw new Error(`Card ${cardId} not found in deck ${deckId}`)
    }

    if (typeof changes.front === "string") {
      const trimmed = changes.front.trim()
      if (!trimmed) {
        throw new Error("Card front cannot be empty")
      }
      card.front = trimmed
    }

    if (typeof changes.back === "string") {
      const trimmed = changes.back.trim()
      if (!trimmed) {
        throw new Error("Card back cannot be empty")
      }
      card.back = trimmed
    }

    deck.updatedAt = now
    return card
  })

  return { card: outcome.result, store: outcome.store }
}

export function deleteCard(deckId: string, cardId: string): { store: StoreState } {
  const now = new Date().toISOString()

  const outcome = mutateStore<void>((draft) => {
    const deck = draft.decks.find((item) => item.id === deckId)
    if (!deck) {
      throw new Error(`Deck ${deckId} not found`)
    }

    const cards = draft.cardsByDeck[deck.id] ?? []
    const index = cards.findIndex((item) => item.id === cardId)
    if (index === -1) {
      throw new Error(`Card ${cardId} not found in deck ${deckId}`)
    }
    cards.splice(index, 1)
    draft.cardsByDeck[deck.id] = cards
    deck.updatedAt = now
  })

  return { store: outcome.store }
}

export function updateSettings(changes: Partial<Settings>): { settings: Settings; store: StoreState } {
  const outcome = mutateStore<Settings>((draft) => {
    const next = normalizeSettings({ ...draft.settings, ...changes })
    if (!next.rememberLastDeck) {
      next.lastDeckId = undefined
    }
    draft.settings = next
    return next
  })

  return { settings: outcome.result, store: outcome.store }
}

export function setLastDeckId(deckId: string | undefined): { store: StoreState } {
  const outcome = mutateStore<void>((draft) => {
    if (!draft.settings.rememberLastDeck) {
      draft.settings.lastDeckId = undefined
      return
    }
    draft.settings.lastDeckId = deckId
  })

  return { store: outcome.store }
}

const createDeckAction = createDeck
const updateDeckAction = updateDeck
const deleteDeckAction = deleteDeck
const addCardAction = addCard
const updateCardAction = updateCard
const deleteCardAction = deleteCard
const updateSettingsAction = updateSettings
const setLastDeckAction = setLastDeckId

type StoreActions = {
  refresh: () => void
  createDeck: (input: CreateDeckInput) => Deck
  updateDeck: (deckId: string, changes: UpdateDeckInput) => Deck
  deleteDeck: (deckId: string) => void
  addCard: (deckId: string, input: CardInput) => Card
  updateCard: (deckId: string, cardId: string, changes: UpdateCardInput) => Card
  deleteCard: (deckId: string, cardId: string) => void
  updateSettings: (changes: Partial<Settings>) => Settings
  setLastDeckId: (deckId: string | undefined) => void
}

export type FlipcardStore = StoreState & StoreActions

const initialStore = snapshot()

export const useStore = create<FlipcardStore>((set) => ({
  decks: initialStore.decks,
  cardsByDeck: initialStore.cardsByDeck,
  settings: initialStore.settings,
  refresh: () => {
    const next = rehydrateInMemory()
    set({ decks: next.decks, cardsByDeck: next.cardsByDeck, settings: next.settings })
  },
  createDeck: (input) => {
    const { deck, store } = createDeckAction(input)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
    return deck
  },
  updateDeck: (deckId, changes) => {
    const { deck, store } = updateDeckAction(deckId, changes)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
    return deck
  },
  deleteDeck: (deckId) => {
    const { store } = deleteDeckAction(deckId)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
  },
  addCard: (deckId, input) => {
    const { card, store } = addCardAction(deckId, input)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
    return card
  },
  updateCard: (deckId, cardId, changes) => {
    const { card, store } = updateCardAction(deckId, cardId, changes)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
    return card
  },
  deleteCard: (deckId, cardId) => {
    const { store } = deleteCardAction(deckId, cardId)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
  },
  updateSettings: (changes) => {
    const { settings, store } = updateSettingsAction(changes)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
    return settings
  },
  setLastDeckId: (deckId) => {
    const { store } = setLastDeckAction(deckId)
    set({ decks: store.decks, cardsByDeck: store.cardsByDeck, settings: store.settings })
  },
}))
