import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"
import { loadStore, useStore } from "../lib/store"
import { ImportExport } from "./ImportExport"

function resetStore() {
  localStorage.clear()
  act(() => {
    useStore.getState().refresh()
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/import-export"]}>
      <Routes>
        <Route path="/import-export" element={<ImportExport />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("ImportExport", () => {
  beforeEach(() => {
    resetStore()
  })

  it("imports a JSON deck and creates cards", async () => {
    const user = userEvent.setup()
    renderPage()

    const fileInput = screen.getByTestId("import-file-input") as HTMLInputElement

    const payload = {
      deck: {
        id: "evening",
        title: "Evening Routine",
        description: "Wind down focus",
      },
      cards: [
        { id: "1", front: "Breath count", back: "4-7-8" },
        { id: "2", front: "Reflection", back: "Note a calming highlight" },
      ],
    }

    const file = new File([JSON.stringify(payload)], "evening.json", { type: "application/json" })
    await user.upload(fileInput, file)

    await screen.findByText(/cards ready/i)

    await user.click(screen.getByRole("button", { name: /confirm import/i }))

    await waitFor(() => {
      const store = loadStore()
      const created = store.decks.find((deck) => deck.title === "Evening Routine")
      expect(created).toBeTruthy()
      expect(store.cardsByDeck[created!.id]).toHaveLength(2)
    })
  })

  it("imports CSV with quoted commas and preserves all cards", async () => {
    const user = userEvent.setup()
    renderPage()

    const fileInput = screen.getByTestId("import-file-input") as HTMLInputElement

    const csv = "front,back\n\"Greeting, friendly\",\"Hello, \"\"friend\"\"!\"\nAffirmation,You are capable"
    const file = new File([csv], "phrases.csv", { type: "text/csv" })
    await user.upload(fileInput, file)

    await screen.findByText(/cards ready/i)

    const titleInput = screen.getByLabelText(/deck title/i)
    await user.clear(titleInput)
    await user.type(titleInput, "CSV Deck")

    await user.click(screen.getByRole("button", { name: /confirm import/i }))

    await waitFor(() => {
      const store = loadStore()
      const created = store.decks.find((deck) => deck.title === "CSV Deck")
      expect(created).toBeTruthy()
      const cards = store.cardsByDeck[created!.id]
      expect(cards).toHaveLength(2)
      expect(cards[0].front).toContain("Greeting, friendly")
      expect(cards[0].back).toContain('Hello, "friend"!')
    })
  })
})
