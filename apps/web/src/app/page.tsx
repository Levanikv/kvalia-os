import { modules } from "@kvalia/ui";
import { tools } from "@kvalia/core";

/**
 * Home v0 — placeholder de phase 0.
 * La vraie Home (8 widgets, vue Jour, bouton « + ») arrive en phase 1.
 */
export default function Home() {
  return (
    <main data-module="home" className="mx-auto flex max-w-md flex-col gap-6 px-4 pb-24 pt-[max(env(safe-area-inset-top),16px)]">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">KVALIA OS</h1>
        <span className="rounded-full bg-[var(--module-accent)]/15 px-3 py-1 text-xs font-medium text-[var(--module-accent)]">phase 0</span>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <p className="text-sm text-[var(--text-2)]">Shell en place. Prochaine étape : brancher le serveur MCP dans claude.ai et voir une ligne de courses apparaître ici.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--text-2)]">Outils MCP v0</h2>
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
          {Object.entries(tools).map(([nom, def]) => (
            <li key={nom} className="px-3 py-2">
              <code className="text-sm">{nom}</code>
              <p className="text-xs text-[var(--text-2)]">{def.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--surface)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-md justify-around py-2">
          {modules.map((m) => (
            <li key={m.key} data-module={m.key} className="flex flex-col items-center gap-0.5 text-[10px] text-[var(--text-2)]">
              <span className="material-symbols-rounded text-[var(--module-accent)]" aria-hidden>{m.icon}</span>
              {m.label}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
