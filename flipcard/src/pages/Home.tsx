export function Home() {
  return (
    <section className="surface-card w-full max-w-4xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-ink-soft">
          Welcome back
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Build mindful flip-card experiences in minutes
        </h1>
        <p className="text-base leading-relaxed text-ink-muted">
          Keep your study sessions calm, focused, and consistent. Create decks, edit
          cards, and stay in the flow with gentle animations and accessible defaults.
        </p>
      </div>
    </section>
  )
}
