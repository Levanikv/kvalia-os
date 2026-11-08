# 0004 — Hébergement Railway, PWA seule

**Date** : 7 nov. 2026 · **Statut** : acceptée

## Contexte

Besoin d'un serveur MCP toujours en ligne (claude.ai) et d'une app web installable sur iPhone, sans App Store.

## Décision

- **Railway** (région EU) pour les deux services : `web` (Next build via `apps/web/railpack.json`) et `agent` (`railpack.json` racine, `tsx`). Déploiement sur push `main` (GitHub App).
- **PWA** (manifest, icônes, `display: standalone`) ; pas d'app native ni de Capacitor en v1. Service worker et hors-ligne plus tard.
- Vercel non utilisé (tout au même endroit).

## Conséquences

- Un push livre tout ; la vérification se fait sur le téléphone.
- Les limites iOS des PWA (notifications, arrière-plan) sont acceptées pour l'instant ; Live Activities / notifications viendront via l'agent (Telegram / Siri) avant un natif.
