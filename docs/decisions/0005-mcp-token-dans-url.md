# 0005 — Auth MCP v0 : token dans l'URL

**Date** : 7 nov. 2026 · **Statut** : acceptée (provisoire)

## Contexte

claude.ai doit joindre le serveur MCP ; il n'y a qu'un utilisateur ; OAuth MCP demande un serveur d'autorisation.

## Décision

- Le serveur n'accepte que `/mcp/<MCP_TOKEN>` (`openssl rand -hex 24`) ; `/mcp` sans token → 404.
- Le token ne vit que dans Railway et dans l'URL du connecteur claude.ai. Rotation = changer la variable + l'URL.
- Le serveur est stateless (un transport par requête).

## Conséquences

- Suffisant pour un utilisateur ; à remplacer par OAuth (Supabase Auth comme fournisseur) quand il y aura un deuxième utilisateur ou des canaux publics (Telegram, Alexa) → nouvel ADR.
