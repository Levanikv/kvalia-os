# Décisions d'architecture (ADR)

Une décision = un fichier numéroté, court : contexte, décision, conséquences. On n'efface pas une décision, on en écrit une nouvelle qui la remplace (« Remplace 000X »).
Un agent qui veut faire autrement **lit l'ADR d'abord** et, s'il a une vraie raison, propose un nouvel ADR plutôt que de contourner.

| N°                                                 | Décision                                                                                            | Statut   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-mono-repo-pnpm-turbo.md)               | Mono-repo pnpm + turbo, Next.js + Hono + Supabase                                                   | acceptée |
| [0002](0002-agent-first-noyau-unique.md)           | Agent-first : un noyau, un contrat d'outils, l'app et l'agent appellent la même chose               | acceptée |
| [0003](0003-supabase-rls-mono-utilisateur.md)      | Supabase avec RLS dès le départ, un seul utilisateur en v1                                          | acceptée |
| [0004](0004-railway-pwa-seule.md)                  | Hébergement Railway (web + agent), PWA seule (pas de natif)                                         | acceptée |
| [0005](0005-mcp-token-dans-url.md)                 | Auth MCP v0 : token dans l'URL, OAuth plus tard                                                     | acceptée |
| [0006](0006-bibliotheque-exercices.md)             | Référentiel d'exercices : free-exercise-db-with-videos, importé en base                             | acceptée |
| [0007](0007-generateur-deterministe.md)            | Programme sportif généré par règles déterministes dans core (pas par LLM)                           | acceptée |
| [0008](0008-navigation-menu-apps-barre-par-app.md) | Navigation : menu Applications + barre par app + feuilles (remplace la tab bar globale)             | acceptée |
| [0009](0009-outillage-agents.md)                   | Outillage pour coder avec des agents : CLAUDE.md en couches, tests du noyau, doc générée, Biome, CI | acceptée |
