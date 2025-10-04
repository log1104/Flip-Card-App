# flipcard

Pastel, accessible starter built with Vite, React, TypeScript, and Tailwind CSS.

## Prerequisites
- Node.js 18+
- npm 10+

## Getting started
```bash
npm install
npm run dev
```

## Available scripts
- `npm run dev` - start the Vite dev server with hot reloading.
- `npm run build` - type-check the project and produce a production build.
- `npm run preview` - preview the production build locally.
- `npm run test` - run Vitest in the configured JSDOM environment.

## Project highlights
- Sticky app shell with a pastel gradient background, top navigation, and footer for consistent layout.
- Tailwind configured with custom CSS variables (`src/styles/theme.css`) for calm, high-contrast palettes.
- React Router wiring with placeholder routes for Home, Decks, Deck Editor, Study Mode, and Import/Export.
- LocalStorage-backed data layer with Zod validation and a Zustand hook in `src/lib/store.ts`.
- Automatic seeding of a sample deck with starter cards when storage is empty.
- Deck management UI with modal creation, edit/study shortcuts, and pastel hover cards.
- Deck editor supports inline card editing with draft rows, Enter/Cmd+Enter shortcuts, debounce-saved deck headers, and delete confirmations.
- Study mode delivers looping sessions with flip/next/prev controls, shuffle vs ordered toggles, progress indicators, and keyboard shortcuts.
- Import/Export hub offers JSON/CSV downloads plus validated uploads with preview, new-deck creation, and merge options.
- Loader skeleton component (`src/components/Skeleton.tsx`) used across pages to show pending content states.
- Vitest + Testing Library suites cover navigation and Deck editor CRUD interactions (`src/App.test.tsx`, `src/pages/DeckEditor.test.tsx`).

## Tailwind CSS
- Utility classes available via `@tailwind` directives in `src/index.css`.
- Pastel palette, surfaces, and typography defined with CSS variables in `src/styles/theme.css`.
- Shared component layers (`surface-card`, `surface-panel`, `chip-button`) keep visuals cohesive.

## Next steps
- Replace placeholder pages with live deck, study, and import/export workflows.
- Extend the skeleton loader to cover real async data flows or API integrations.

## Known Issues / TODOs
- None at the moment.

