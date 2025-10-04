import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Study } from './Study'
import { saveStore, useStore, type StoreState } from '../lib/store'

const deckId = 'deck-study'
const now = '2024-03-15T10:00:00.000Z'

function makeStore(): StoreState {
  return {
    decks: [
      {
        id: deckId,
        title: 'Presence Drills',
        description: 'Short prompts for focus resets.',
        createdAt: now,
        updatedAt: now,
      },
    ],
    cardsByDeck: {
      [deckId]: [
        { id: 'card-1', front: 'First prompt', back: 'First answer' },
        { id: 'card-2', front: 'Second prompt', back: 'Second answer' },
      ],
    },
    settings: {
      defaultStudyMode: 'ordered',
      rememberLastDeck: false,
      reducedMotion: false,
      lastDeckId: undefined,
    },
  }
}

function renderStudy() {
  return render(
    <MemoryRouter initialEntries={[`/study/${deckId}`]}>
      <Routes>
        <Route path="/study/:deckId" element={<Study />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Study flow', () => {
  beforeEach(() => {
    window.localStorage.clear()
    const store = makeStore()
    saveStore(store)
    useStore.setState({
      decks: store.decks,
      cardsByDeck: store.cardsByDeck,
      settings: store.settings,
    })
  })

  it('shows prompt first, flips to answer, and resets to prompt when navigating', async () => {
    const user = userEvent.setup()
    renderStudy()

    expect(screen.getByText('Click card to flip it')).toBeInTheDocument()
    const cardText = screen.getByTestId('study-card-text')
    expect(cardText).toHaveTextContent('First prompt')

    await user.click(screen.getByRole('article'))
    expect(cardText).toHaveTextContent('First answer')

    await user.click(screen.getByRole('button', { name: 'Next card' }))
    expect(cardText).toHaveTextContent('Second prompt')
  })
})
