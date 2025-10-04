import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadStore, useStore } from "../lib/store"
import { DeckEditor } from "./DeckEditor"

function resetStore() {
  localStorage.clear()
  act(() => {
    useStore.getState().refresh()
  })
}

describe("DeckEditor", () => {
  beforeEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  function renderEditor(deckId: string) {
    return render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/edit`]}>
        <Routes>
          <Route path="/decks/:deckId/edit" element={<DeckEditor />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it("adds a card from the inline editor", async () => {
    const user = userEvent.setup()
    const deckId = loadStore().decks[0].id
    renderEditor(deckId)

    await user.click(screen.getByRole("button", { name: /add card/i }))

    const frontInputs = screen.getAllByPlaceholderText("Question or prompt")
    const backInputs = screen.getAllByPlaceholderText(/Answer, reflection/i)
    const newestFront = frontInputs[frontInputs.length - 1]
    const newestBack = backInputs[backInputs.length - 1]

    await user.type(newestFront, "Evening gratitude prompt")
    await user.type(newestBack, "List three calm moments from today")
    await user.keyboard("{Enter}")

    await waitFor(() => {
      const stored = loadStore().cardsByDeck[deckId]
      expect(stored.some((card) => card.front === "Evening gratitude prompt")).toBe(true)
    })
  })

  it("updates a card front and back", async () => {
    const user = userEvent.setup()
    const deckId = loadStore().decks[0].id
    renderEditor(deckId)

    const frontInput = screen.getByDisplayValue("Breathing cadence")
    const backTextarea = screen.getByDisplayValue("Inhale 4, hold 4, exhale 6 to reset focus.")

    await user.clear(frontInput)
    await user.type(frontInput, "Breathing mantra")
    await user.clear(backTextarea)
    await user.type(backTextarea, "Inhale 3, exhale 5 to slow the mind")
    await user.keyboard("{Enter}")

    await waitFor(() => {
      const updated = loadStore().cardsByDeck[deckId].find((card) => card.front === "Breathing mantra")
      expect(updated?.back).toBe("Inhale 3, exhale 5 to slow the mind")
    })
  })

  it("deletes a card after confirmation", async () => {
    const user = userEvent.setup()
    const deckId = loadStore().decks[0].id
    renderEditor(deckId)

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)

    const deleteButton = screen.getAllByRole("button", { name: /delete/i })[0]
    await user.click(deleteButton)

    expect(confirmSpy).toHaveBeenCalled()

    await waitFor(() => {
      const stored = loadStore().cardsByDeck[deckId]
      expect(stored.some((card) => card.front === "Breathing cadence")).toBe(false)
    })
  })

  it("saves deck title via the save button", async () => {
    const user = userEvent.setup()
    const deck = loadStore().decks[0]
    renderEditor(deck.id)

    const titleInput = screen.getByDisplayValue(deck.title)
    await user.clear(titleInput)
    await user.type(titleInput, "Calm Focus Routine")

    await user.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const stored = loadStore().decks.find((item) => item.id === deck.id)
      expect(stored?.title).toBe("Calm Focus Routine")
    })
  })
})
