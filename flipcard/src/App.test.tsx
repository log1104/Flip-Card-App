import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"
import { useStore } from "./lib/store"
import App from "./App"

function resetStore() {
  localStorage.clear()
  act(() => {
    useStore.getState().refresh()
  })
}

describe("App shell", () => {
  beforeEach(() => {
    resetStore()
  })

  it("renders the home route with navigation", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole("heading", {
        name: /Build mindful flip-card experiences in minutes/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Home/i })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("navigates between routes", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("link", { name: /^Decks$/i }))
    expect(screen.getByRole("heading", { name: /Your decks/i })).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: /Import\/Export/i }))
    expect(
      screen.getByRole("heading", { name: /Import & export/i }),
    ).toBeInTheDocument()
  })

  it("renders the deck editor for a given deck", () => {
    render(
      <MemoryRouter initialEntries={["/decks/demo-deck/edit"]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Editing deck:/i)).toHaveTextContent("demo-deck")
  })
})
