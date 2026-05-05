---
description: Configurer et activer le MCP Supabase pour SuccessFuel (projet uetkdbpmqxdnnnwkyzzi) afin de permettre lecture DB, inspection RLS, et injection SQL
auto_execution_mode: 2
---

## Pré-requis

- Windsurf version 0.1.37+
- Être connecté à supabase.com dans le navigateur (compte propriétaire du projet)
- `npx` disponible dans le terminal

## Étape 1 — Ajouter la configuration MCP Supabase

Ajouter l'entrée `supabase` dans `~/.codeium/windsurf/mcp_config.json` :

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.supabase.com/mcp?project_ref=uetkdbpmqxdnnnwkyzzi"
      ]
    }
  }
}
```

// turbo
Commande pour ajouter l'entrée Supabase SuccessFuel dans mcp_config.json sans écraser les autres serveurs :

```bash
jq '.mcpServers["supabase-successfuel"] = {"command": "npx", "args": ["-y", "mcp-remote", "https://mcp.supabase.com/mcp?project_ref=uetkdbpmqxdnnnwkyzzi"]}' ~/.codeium/windsurf/mcp_config.json > /tmp/mcp_tmp.json && mv /tmp/mcp_tmp.json ~/.codeium/windsurf/mcp_config.json
```

## Étape 2 — Redémarrer Windsurf

Fermer et rouvrir complètement Windsurf pour charger la nouvelle configuration MCP.

## Étape 3 — Authentifier le MCP Supabase

Après redémarrage, Windsurf va tenter de connecter le serveur MCP Supabase.
Une fenêtre de navigateur s'ouvrira automatiquement pour authentifier.
Se connecter avec le compte Supabase propriétaire du projet `uetkdbpmqxdnnnwkyzzi`.

## Étape 4 — Vérifier la connexion

Dans Windsurf, ouvrir la palette de commandes et vérifier que le MCP `supabase-successfuel` est listé comme "connected".

## Variables de connexion directe (Supabase CLI)

```bash
# Session Pooler (transactions longues, migrations)
PGCONN="postgresql://postgres.uetkdbpmqxdnnnwkyzzi:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

# Transaction Pooler (requêtes courtes, standard)
PGCONN_TX="postgresql://postgres.uetkdbpmqxdnnnwkyzzi:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
```

## Supabase CLI — Lier le projet

```bash
supabase link --project-ref uetkdbpmqxdnnnwkyzzi
```

Puis saisir le mot de passe de la base de données quand demandé.

## Commandes utiles post-configuration

```bash
# Voir les tables
supabase db pull

# Inspecter les RLS
supabase db dump --schema public -f rls_dump.sql

# Exécuter du SQL
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"

# Voir les migrations
supabase migration list
```

## Variables .env.local confirmées

```env
NEXT_PUBLIC_SUPABASE_URL=https://uetkdbpmqxdnnnwkyzzi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HIqX82CFsaTkMCfqPtAmMA_YimEH81n
```

> Note : Le client Supabase utilise `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nouveau nom Supabase v3+), confirmé dans `src/utils/supabase/client.ts`.
