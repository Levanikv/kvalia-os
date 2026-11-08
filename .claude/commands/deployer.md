---

description: Vérifie, committe, pousse et contrôle le déploiement Railway (web + agent) ; liste ce qu'il reste à tester sur l'iPhone.
allowed-tools: Bash(pnpm *), Bash(git *)
---

Suis `docs/recettes/livrer.md` : `pnpm check` (+ build web si touché), commit en français `type(portée): quoi — pourquoi`, push `main`. Puis explique à Levani comment vérifier : déploiements Railway `SUCCESS`, `/health` de l'agent, écrans à ouvrir sur le téléphone, et si le connecteur claude.ai doit être reconnecté (nouvel outil).
