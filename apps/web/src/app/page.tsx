import { modules } from "@kvalia/ui";
import { tools } from "@kvalia/core";

/**
 * Home v0 — placeholder de phase 0.
 * La vraie Home (8 widgets, vue Jour, bouton « + ») arrive en phase 1.
 */
export default function Home() {
  return (
    <main data-brand="home" className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-24 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="flex items-center justify-between">
        <h1 className="kv-type-headline-md">KVALIA OS</h1>
        <span className="kv-type-label-md rounded-pill bg-accent-subtle px-3 py-1 text-fg-accent">phase 0</span>
      </header>

      <section className="rounded-container border border-line-subtle bg-surface p-4">
        <p className="kv-type-body-sm text-fg-secondary">Shell en place. Prochaine étape : brancher le serveur MCP dans claude.ai et voir une ligne de courses apparaître ici.</p>
      </section>

      <section>
        <h2 className="kv-type-title-sm mb-2 text-fg-secondary">Outils MCP v0</h2>
        <ul className="divide-y divide-line-subtle overflow-hidden rounded-container border border-line-subtle bg-surface">
          {Object.entries(tools).map(([nom, def]) => (
            <li key={nom} className="px-3 py-2">
              <code className="text-sm">{nom}</code>
              <p className="kv-type-caption text-fg-secondary">{def.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line-subtle bg-glass pb-[env(safe-area-inset-bottom)] backdrop-blur-[var(--kv-blur-glass)]">
        <ul className="mx-auto flex max-w-md justify-around py-2">
          {modules.map((m) => (
            <li key={m.key} data-brand={m.key} className="kv-type-label-sm flex flex-col items-center gap-0.5 text-fg-secondary">
              <span className="material-symbols-rounded text-icon-accent" aria-hidden>{m.icon}</span>
              {m.label}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
