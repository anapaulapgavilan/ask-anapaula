export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <main id="main" className="mx-auto max-w-4xl px-6 py-16 sm:px-12 sm:py-24">
        <header className="border-b border-stone-300 pb-10">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-stone-600">
            A professional conversation
          </p>
          <h1 className="font-serif text-5xl leading-tight sm:text-7xl">Ask Ana Paula</h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed">
            A bilingual AI career profile, currently being prepared.
          </p>
        </header>
        <section aria-labelledby="setup" className="py-10">
          <h2 id="setup" className="font-serif text-3xl">Not open for conversations yet</h2>
          <p className="mt-5 max-w-prose leading-relaxed">
            Chat is not available yet. Public content, the illustrated avatar,
            and service safeguards must be approved and verified before activation.
            This setup page does not represent a completed or live AI avatar.
          </p>
          <div lang="es" className="mt-6 max-w-prose leading-relaxed">
            <p>El chat todavia no esta disponible.</p>
            <p className="mt-2">
              El contenido publico, la ilustracion y las protecciones del servicio
              requieren aprobacion y verificacion antes de activar el avatar.
            </p>
          </div>
          <button type="button" disabled className="mt-8 rounded border border-stone-400 px-5 py-3 text-stone-600">
            Chat coming soon
          </button>
        </section>
        <footer className="border-t border-stone-300 pt-6 text-sm leading-relaxed text-stone-600">
          No chat questions are collected on this setup page. No photo, CV,
          biography, or illustration is published before owner approval.
        </footer>
      </main>
    </>
  );
}
