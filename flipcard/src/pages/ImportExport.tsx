import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { z } from "zod"
import { type Card, useStore } from "../lib/store"

const importJsonSchema = z.object({
  deck: z
    .object({
      id: z.string().optional(),
      title: z.string().min(1, "Deck title is required"),
      description: z.string().optional(),
    })
    .transform((value) => ({
      id: value.id,
      title: value.title.trim(),
      description: value.description?.trim() === "" ? undefined : value.description?.trim(),
    })),
  cards: z
    .array(
      z.object({
        id: z.string().optional(),
        front: z.string(),
        back: z.string(),
      }),
    )
    .min(1, "At least one card is required"),
})

type ImportPreview = {
  deckTitle: string
  deckDescription?: string
  cards: Array<{ front: string; back: string }>
  source: "json" | "csv"
  filename: string
}

const DEFAULT_DECK_TITLE = "Imported deck"

async function readFileText(file: File) {
  if (typeof file.text === "function") {
    return file.text()
  }

  if (typeof FileReader !== "undefined") {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"))
      reader.onload = () => {
        const result = reader.result
        if (typeof result === "string") {
          resolve(result)
        } else if (result instanceof ArrayBuffer) {
          resolve(new TextDecoder().decode(result))
        } else {
          reject(new Error("Unsupported file reader result"))
        }
      }
      reader.readAsText(file)
    })
  }

  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer()
    return new TextDecoder().decode(buffer)
  }

  throw new Error("Unsupported environment for file parsing")
}

function sanitizedCards(raw: Array<{ front: string; back: string }>) {
  return raw
    .map((card) => ({
      front: card.front?.toString().trim() ?? "",
      back: card.back?.toString().trim() ?? "",
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0)
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  if (typeof window === "undefined") return

  const blob = new Blob([content], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}

function escapeCsvValue(value: string) {
  const needsQuotes = /[",\n]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuotes ? `"${escaped}"` : escaped
}

function formatCsv(cards: Card[]) {
  const lines = ["front,back"]
  cards.forEach((card) => {
    lines.push(`${escapeCsvValue(card.front)},${escapeCsvValue(card.back)}`)
  })
  return lines.join("\n")
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let current = ""
  let row: string[] = []
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      row.push(current)
      current = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1
      }
      row.push(current)
      rows.push(row)
      row = []
      current = ""
      continue
    }

    current += char
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current)
    rows.push(row)
  }

  const nonEmptyRows = rows.filter((cells) => cells.some((cell) => cell.trim().length > 0))
  if (!nonEmptyRows.length) {
    return []
  }

  const [headerRow, ...dataRows] = nonEmptyRows
  const headers = headerRow.map((value) => value.trim().toLowerCase())
  const frontIndex = headers.indexOf("front")
  const backIndex = headers.indexOf("back")

  if (frontIndex === -1 || backIndex === -1) {
    throw new Error("CSV must include 'front' and 'back' columns")
  }

  return dataRows.map((cells) => ({
    front: cells[frontIndex] ?? "",
    back: cells[backIndex] ?? "",
  }))
}

export function ImportExport() {
  const decks = useStore((state) => state.decks)
  const cardsByDeck = useStore((state) => state.cardsByDeck)
  const createDeck = useStore((state) => state.createDeck)
  const addCard = useStore((state) => state.addCard)

  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => decks[0]?.id ?? "")
  const [importMode, setImportMode] = useState<"new" | "merge">("new")
  const [mergeDeckId, setMergeDeckId] = useState<string>(() => decks[0]?.id ?? "")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [manualTitle, setManualTitle] = useState("")
  const [manualDescription, setManualDescription] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const deckOptions = useMemo(() => decks.map((deck) => ({ value: deck.id, label: deck.title })), [decks])
  const selectedDeck = selectedDeckId ? decks.find((deck) => deck.id === selectedDeckId) ?? null : null
  const selectedDeckCards = selectedDeck ? cardsByDeck[selectedDeck.id] ?? [] : []

  const handleExportJson = () => {
    if (!selectedDeck) return
    const payload = {
      deck: {
        id: selectedDeck.id,
        title: selectedDeck.title,
        description: selectedDeck.description ?? undefined,
      },
      cards: selectedDeckCards.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
      })),
    }
    const filename = `${selectedDeck.title.replace(/\s+/g, "-").toLowerCase()}-deck.json`
    triggerDownload(filename, JSON.stringify(payload, null, 2), "application/json")
  }

  const handleExportCsv = () => {
    if (!selectedDeck) return
    const csv = formatCsv(selectedDeckCards)
    const filename = `${selectedDeck.title.replace(/\s+/g, "-").toLowerCase()}-deck.csv`
    triggerDownload(filename, csv, "text/csv")
  }

  const parseJson = (text: string, filename: string) => {
    const parsed = importJsonSchema.parse(JSON.parse(text))
    const cards = sanitizedCards(parsed.cards)
    if (!cards.length) {
      throw new Error("No cards with valid front/back content were found")
    }
    setPreview({
      deckTitle: parsed.deck.title || DEFAULT_DECK_TITLE,
      deckDescription: parsed.deck.description,
      cards,
      source: "json",
      filename,
    })
    setManualTitle(parsed.deck.title || DEFAULT_DECK_TITLE)
    setManualDescription(parsed.deck.description ?? "")
    setImportMode("new")
    setMergeDeckId(decks[0]?.id ?? "")
  }

  const parseCsvFile = (text: string, filename: string) => {
    const rows = parseCsv(text)
    const cards = sanitizedCards(rows)

    if (!cards.length) {
      throw new Error("No cards found in CSV file")
    }

    const fallbackTitle = filename.replace(/\.[^/.]+$/, "") || DEFAULT_DECK_TITLE
    setPreview({
      deckTitle: fallbackTitle,
      cards,
      source: "csv",
      filename,
    })
    setManualTitle(fallbackTitle)
    setManualDescription("")
    setImportMode("new")
    setMergeDeckId(decks[0]?.id ?? "")
  }

  const resetImportState = () => {
    setPreview(null)
    setManualTitle("")
    setManualDescription("")
    setImportMode("new")
    setMergeDeckId(decks[0]?.id ?? "")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError(null)
    setImportMessage(null)
    setIsParsing(true)

    try {
      const textWithBom = await readFileText(file)
      const text = textWithBom.replace(/^\ufeff/, "")
      const extension = file.name.split(".").pop()?.toLowerCase()

      if (extension === "json") {
        parseJson(text, file.name)
      } else if (extension === "csv") {
        parseCsvFile(text, file.name)
      } else {
        throw new Error(`Unsupported file type: .${extension ?? "unknown"}`)
      }
    } catch (error) {
      resetImportState()
      setImportError(error instanceof Error ? error.message : "Unable to parse file")
    } finally {
      setIsParsing(false)
    }
  }

  const handleConfirmImport = () => {
    if (!preview) return

    setImportError(null)

    if (importMode === "merge") {
      const targetDeckId = mergeDeckId || decks[0]?.id
      if (!targetDeckId) {
        setImportError("Select a deck to merge into")
        return
      }
      preview.cards.forEach((card) => {
        addCard(targetDeckId, { front: card.front, back: card.back })
      })
      const targetDeck = decks.find((deck) => deck.id === targetDeckId)
      setImportMessage(`Merged ${preview.cards.length} cards into "${targetDeck?.title ?? "deck"}"`)
      resetImportState()
      return
    }

    const title = manualTitle.trim() || preview.deckTitle || DEFAULT_DECK_TITLE
    const description = manualDescription.trim()

    const newDeck = createDeck({
      title,
      description: description.length ? description : undefined,
    })
    preview.cards.forEach((card) => {
      addCard(newDeck.id, { front: card.front, back: card.back })
    })
    setImportMessage(`Imported deck "${title}" with ${preview.cards.length} cards`)
    resetImportState()
  }

  return (
    <section className="surface-card w-full max-w-5xl text-left">
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Import &amp; export</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Share decks as JSON or CSV, or bring in collections from other tools.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="surface-panel flex flex-col gap-4 p-5 shadow-sm">
            <header className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-ink-muted">
                Export
              </h2>
              <p className="text-sm text-ink-muted">
                Choose a deck and download a JSON bundle or CSV sheet.
              </p>
            </header>

            <label className="flex flex-col gap-2 text-sm text-ink">
              <span className="font-medium">Deck</span>
              <select
                value={selectedDeckId}
                onChange={(event) => setSelectedDeckId(event.target.value)}
                className="rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm text-ink focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
              >
                {deckOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="chip-button chip-button--primary px-4 py-2 text-sm hover:brightness-105"
                onClick={handleExportJson}
                disabled={!selectedDeck}
              >
                Download JSON
              </button>
              <button
                type="button"
                className="chip-button border border-[color:var(--color-border)] px-4 py-2 text-sm hover:border-[color:var(--color-border-strong)] hover:bg-white/40"
                onClick={handleExportCsv}
                disabled={!selectedDeck}
              >
                Download CSV
              </button>
            </div>

            {selectedDeck ? (
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs text-ink-muted" aria-label="Deck summary">
                <dt>Cards</dt>
                <dd>{selectedDeckCards.length}</dd>
                <dt>Description</dt>
                <dd>{selectedDeck.description ?? "Not provided"}</dd>
              </dl>
            ) : (
              <p className="text-xs text-ink-muted">No decks available yet.</p>
            )}
          </article>

          <article className="surface-panel flex flex-col gap-4 p-5 shadow-sm">
            <header className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-ink-muted">
                Import
              </h2>
              <p className="text-sm text-ink-muted">
                Upload a deck as JSON or CSV, preview the cards, and create or merge.
              </p>
            </header>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileChange}
              className="hidden"
              data-testid="import-file-input"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="chip-button chip-button--primary px-4 py-2 text-sm hover:brightness-105"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose a JSON or CSV file to import"
              >
                Select file
              </button>
              {preview ? (
                <span className="self-center text-xs text-ink-muted">{preview.filename}</span>
              ) : null}
            </div>

            {isParsing ? <p className="text-sm text-ink">Parsing file...</p> : null}
            {importError ? <p className="text-sm text-red-500">{importError}</p> : null}
            {importMessage ? <p className="text-sm text-emerald-600">{importMessage}</p> : null}

            {preview ? (
              <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--color-border)] bg-white/70 p-4">
                <p className="text-sm text-ink">
                  {preview.cards.length} cards ready ({preview.source.toUpperCase()})
                </p>
                <label className="flex flex-col gap-2 text-sm text-ink">
                  <span className="font-medium">Deck title</span>
                  <input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    className="rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                    placeholder={DEFAULT_DECK_TITLE}
                    disabled={importMode === "merge"}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-ink">
                  <span className="font-medium">Description (optional)</span>
                  <textarea
                    value={manualDescription}
                    onChange={(event) => setManualDescription(event.target.value)}
                    className="min-h-[72px] rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                    placeholder="Gentle notes about this deck"
                    disabled={importMode === "merge"}
                  />
                </label>
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Import options">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name="import-mode"
                      value="new"
                      checked={importMode === "new"}
                      onChange={() => setImportMode("new")}
                    />
                    Create new deck
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-ink">
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="import-mode"
                        value="merge"
                        checked={importMode === "merge"}
                        onChange={() => setImportMode("merge")}
                      />
                      Merge into existing deck
                    </span>
                    {importMode === "merge" ? (
                      <select
                        value={mergeDeckId}
                        onChange={(event) => setMergeDeckId(event.target.value)}
                        className="ml-6 rounded-xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm text-ink focus:border-[color:var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-border-strong)]"
                      >
                        {deckOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </label>
                </div>

                <div className="rounded-xl border border-dashed border-[color:var(--color-border)] bg-white/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-ink-muted">Preview</p>
                  <ul className="mt-2 flex flex-col gap-2 text-xs text-ink">
                    {preview.cards.slice(0, 3).map((card, index) => (
                      <li key={`${card.front}-${index}`}>
                        <span className="font-semibold">Front:</span> {card.front}
                        <span className="ml-2 font-semibold">Back:</span> {card.back}
                      </li>
                    ))}
                    {preview.cards.length > 3 ? (
                      <li className="text-ink-muted">+ {preview.cards.length - 3} more cards</li>
                    ) : null}
                  </ul>
                </div>

                <button
                  type="button"
                  className="chip-button chip-button--primary px-4 py-2 text-sm hover:brightness-105"
                  onClick={handleConfirmImport}
                  disabled={isParsing || (importMode === "merge" && !mergeDeckId)}
                >
                  Confirm import
                </button>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Select a file to see a preview and import options.</p>
            )}
          </article>
        </div>
      </div>
    </section>
  )
}

